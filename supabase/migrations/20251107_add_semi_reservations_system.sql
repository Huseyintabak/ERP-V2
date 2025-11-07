-- 2025-11-07: Yarı mamul üretimleri için otomatik rezervasyon sistemi

CREATE OR REPLACE FUNCTION create_semi_order_reservations(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_existing RECORD;
  v_release NUMERIC;
  v_bom RECORD;
  v_needed NUMERIC;
  v_order_type CONSTANT TEXT := 'semi_production_order';
BEGIN
  SELECT id, product_id, planned_quantity, status, created_by
  INTO v_order
  FROM semi_production_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Mevcut rezervasyonları serbest bırak
  FOR v_existing IN
    SELECT *
    FROM material_reservations
    WHERE order_id = p_order_id::TEXT
      AND order_type = v_order_type
  LOOP
    v_release := GREATEST(COALESCE(v_existing.reserved_quantity, 0) - COALESCE(v_existing.consumed_quantity, 0), 0);

    IF v_release > 0 THEN
      IF v_existing.material_type = 'raw' THEN
        UPDATE raw_materials
        SET reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      ELSIF v_existing.material_type = 'semi' THEN
        UPDATE semi_finished_products
        SET reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      ELSIF v_existing.material_type = 'finished' THEN
        UPDATE finished_products
        SET reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      END IF;
    END IF;
  END LOOP;

  DELETE FROM material_reservations
  WHERE order_id = p_order_id::TEXT
    AND order_type = v_order_type;

  -- Tamamlanan veya iptal edilen siparişler için yeni rezervasyon oluşturma
  IF v_order.status IN ('tamamlandi', 'iptal') THEN
    RETURN;
  END IF;

  -- BOM'dan rezervasyonları oluştur
  FOR v_bom IN
    SELECT material_type, material_id, COALESCE(quantity, 0) AS quantity
    FROM semi_bom
    WHERE semi_product_id = v_order.product_id
  LOOP
    v_needed := v_bom.quantity * COALESCE(v_order.planned_quantity, 0);

    IF v_needed <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO material_reservations (
      order_id,
      order_type,
      material_id,
      material_type,
      reserved_quantity,
      consumed_quantity,
      status,
      created_at,
      updated_at,
      created_by
    )
    VALUES (
      p_order_id::TEXT,
      v_order_type,
      v_bom.material_id,
      v_bom.material_type,
      v_needed,
      0,
      'active',
      NOW(),
      NOW(),
      v_order.created_by
    );

    IF v_bom.material_type = 'raw' THEN
      UPDATE raw_materials
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom.material_id;
    ELSIF v_bom.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom.material_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_create_semi_order_reservations()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_semi_order_reservations(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_semi_order_reservations ON semi_production_orders;
CREATE TRIGGER trigger_sync_semi_order_reservations
AFTER INSERT OR UPDATE OF product_id, planned_quantity, status ON semi_production_orders
FOR EACH ROW
EXECUTE FUNCTION trigger_create_semi_order_reservations();

-- Tetikleyiciyi rezervasyon senkronizasyonu ile güncelle
CREATE OR REPLACE FUNCTION consume_materials_on_semi_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_order RECORD;
  v_product_name TEXT;
  v_product_code TEXT;
  v_consumption NUMERIC;
  v_order_type CONSTANT TEXT := 'semi_production_order';
BEGIN
  SELECT 
    spo.product_id,
    sfp.name,
    sfp.code
  INTO v_order.product_id, v_product_name, v_product_code
  FROM semi_production_orders spo
  JOIN semi_finished_products sfp ON spo.product_id = sfp.id
  WHERE spo.id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yarı mamul üretim siparişi bulunamadı: %', NEW.order_id;
  END IF;

  FOR v_bom_record IN
    SELECT 
      sb.material_type,
      sb.material_id,
      COALESCE(sb.quantity, 0) AS quantity_per_unit,
      rm.name AS raw_material_name,
      sfp2.name AS semi_material_name
    FROM semi_bom sb
    LEFT JOIN raw_materials rm ON sb.material_type = 'raw' AND sb.material_id = rm.id
    LEFT JOIN semi_finished_products sfp2 ON sb.material_type = 'semi' AND sb.material_id = sfp2.id
    WHERE sb.semi_product_id = v_order.product_id
  LOOP
    v_consumption := v_bom_record.quantity_per_unit * NEW.quantity_produced;

    IF v_consumption IS NULL OR v_consumption = 0 THEN
      CONTINUE;
    END IF;

    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET 
        quantity = quantity - v_consumption,
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;

      UPDATE material_reservations
      SET 
        consumed_quantity = LEAST(reserved_quantity, COALESCE(consumed_quantity, 0) + v_consumption),
        status = CASE 
          WHEN LEAST(reserved_quantity, COALESCE(consumed_quantity, 0) + v_consumption) >= reserved_quantity THEN 'completed'
          ELSE 'active'
        END,
        updated_at = NOW()
      WHERE order_id = NEW.order_id::TEXT
        AND order_type = v_order_type
        AND material_id = v_bom_record.material_id
        AND material_type = 'raw';

      INSERT INTO stock_movements (
        material_type,
        material_id,
        movement_type,
        quantity,
        user_id,
        description
      )
      VALUES (
        'raw',
        v_bom_record.material_id,
        'uretim',
        -v_consumption,
        NEW.operator_id,
        format('Yarı mamul üretim tüketimi: %s adet %s (%s) için %s adet %s', 
          NEW.quantity_produced,
          v_product_name,
          v_product_code,
          v_consumption,
          COALESCE(v_bom_record.raw_material_name, 'Bilinmeyen')
        )
      );

    ELSIF v_bom_record.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET 
        quantity = quantity - v_consumption,
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;

      UPDATE material_reservations
      SET 
        consumed_quantity = LEAST(reserved_quantity, COALESCE(consumed_quantity, 0) + v_consumption),
        status = CASE 
          WHEN LEAST(reserved_quantity, COALESCE(consumed_quantity, 0) + v_consumption) >= reserved_quantity THEN 'completed'
          ELSE 'active'
        END,
        updated_at = NOW()
      WHERE order_id = NEW.order_id::TEXT
        AND order_type = v_order_type
        AND material_id = v_bom_record.material_id
        AND material_type = 'semi';

      INSERT INTO stock_movements (
        material_type,
        material_id,
        movement_type,
        quantity,
        user_id,
        description
      )
      VALUES (
        'semi',
        v_bom_record.material_id,
        'uretim',
        -v_consumption,
        NEW.operator_id,
        format('Yarı mamul üretim tüketimi: %s adet %s (%s) için %s adet %s', 
          NEW.quantity_produced,
          v_product_name,
          v_product_code,
          v_consumption,
          COALESCE(v_bom_record.semi_material_name, 'Bilinmeyen')
        )
      );
    END IF;
  END LOOP;

  -- Üretilen yarı mamul stokunu artır
  UPDATE semi_finished_products
  SET quantity = quantity + NEW.quantity_produced
  WHERE id = v_order.product_id;

  INSERT INTO stock_movements (
    material_type,
    material_id,
    movement_type,
    quantity,
    user_id,
    description
  )
  VALUES (
    'semi',
    v_order.product_id,
    'uretim',
    NEW.quantity_produced,
    NEW.operator_id,
    format('Yarı mamul üretim: %s adet %s (%s)', 
      NEW.quantity_produced,
      v_product_name,
      v_product_code)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_consume_materials_on_semi_production ON semi_production_logs;
CREATE TRIGGER trigger_consume_materials_on_semi_production
AFTER INSERT ON semi_production_logs
FOR EACH ROW
EXECUTE FUNCTION consume_materials_on_semi_production();

-- Mevcut aktif yarı mamul siparişleri için rezervasyonları senkronize et
DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT id
    FROM semi_production_orders
    WHERE status IN ('planlandi', 'devam_ediyor')
  LOOP
    PERFORM create_semi_order_reservations(v_order.id);
  END LOOP;
END;
$$;

SELECT '✅ Semi production reservations synced' AS result;
