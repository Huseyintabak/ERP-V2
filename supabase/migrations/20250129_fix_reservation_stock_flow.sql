-- 2025-01-29: Rezervasyon sistemini doğru stok yönetimi akışına göre düzelt
--
-- DOĞRU AKIŞ:
-- 1. Rezervasyon yapıldığında: quantity aynı kalır, sadece reserved_quantity artar
-- 2. Üretim yapıldığında: HEM quantity HEM reserved_quantity düşer
-- 3. Kullanılabilir stok = quantity - reserved_quantity

-- ============================================================================
-- 1. NİHAİ ÜRÜN REZERVASYON FONKSİYONU
-- ============================================================================
CREATE OR REPLACE FUNCTION create_material_reservations(
  p_order_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_bom_record RECORD;
  v_needed NUMERIC;
  v_user_id UUID;
  v_description TEXT;
BEGIN
  BEGIN
    v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      v_user_id := NULL;
  END;

  FOR v_bom_record IN
    SELECT
      bom.material_type,
      bom.material_id,
      bom.quantity_needed,
      CASE
        WHEN bom.material_type = 'raw' THEN rm.name
        ELSE sfp.name
      END AS material_name,
      CASE
        WHEN bom.material_type = 'raw' THEN rm.code
        ELSE sfp.code
      END AS material_code
    FROM bom
    LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
    LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
    WHERE finished_product_id = p_product_id
  LOOP
    v_needed := v_bom_record.quantity_needed * p_quantity;

    IF v_needed <= 0 THEN
      CONTINUE;
    END IF;

    -- Rezervasyon kaydı oluştur
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
      'production_plan',
      v_bom_record.material_id,
      v_bom_record.material_type,
      v_needed,
      0,
      'active',
      NOW(),
      NOW(),
      v_user_id
    );

    -- SADECE RESERVED_QUANTITY ARTTIR, QUANTITY AYNI KALSIN
    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom_record.material_id;
    ELSIF v_bom_record.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom_record.material_id;
    END IF;

    -- Stok hareketi kaydet
    v_description := format(
      'Rezervasyon: Plan %s için %s adet %s (%s)',
      p_order_id,
      v_needed,
      COALESCE(v_bom_record.material_name, 'Bilinmeyen'),
      COALESCE(v_bom_record.material_code, 'N/A')
    );

    INSERT INTO stock_movements (
      material_type,
      material_id,
      movement_type,
      quantity,
      user_id,
      description
    )
    VALUES (
      v_bom_record.material_type,
      v_bom_record.material_id,
      'rezervasyon',
      v_needed,
      v_user_id,
      v_description
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. YARI MAMUL REZERVASYON FONKSİYONU
-- ============================================================================
CREATE OR REPLACE FUNCTION create_semi_order_reservations(p_order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_existing RECORD;
  v_release NUMERIC;
  v_bom RECORD;
  v_needed NUMERIC;
  v_order_type CONSTANT TEXT := 'semi_production_order';
  v_user_id UUID;
  v_description TEXT;
BEGIN
  SELECT id, product_id, planned_quantity, status, created_by
  INTO v_order
  FROM semi_production_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  BEGIN
    v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      v_user_id := v_order.created_by;
  END;

  -- Mevcut rezervasyonları serbest bırak
  FOR v_existing IN
    SELECT *
    FROM material_reservations
    WHERE order_id = p_order_id::TEXT
      AND order_type = v_order_type
  LOOP
    -- Henüz tüketilmemiş rezervasyonu iade et
    v_release := GREATEST(COALESCE(v_existing.reserved_quantity, 0) - COALESCE(v_existing.consumed_quantity, 0), 0);

    IF v_release > 0 THEN
      -- SADECE RESERVED_QUANTITY AZALT
      IF v_existing.material_type = 'raw' THEN
        UPDATE raw_materials
        SET reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      ELSIF v_existing.material_type = 'semi' THEN
        UPDATE semi_finished_products
        SET reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      END IF;

      -- Stok hareketi kaydet
      INSERT INTO stock_movements (
        material_type,
        material_id,
        movement_type,
        quantity,
        user_id,
        description
      )
      VALUES (
        v_existing.material_type,
        v_existing.material_id,
        'rezervasyon_iptali',
        -v_release,
        v_user_id,
        format('Yarı mamul rezervasyon iptali: Sipariş %s için %s adet', p_order_id, v_release)
      );
    END IF;
  END LOOP;

  -- Eski rezervasyonları sil
  DELETE FROM material_reservations
  WHERE order_id = p_order_id::TEXT
    AND order_type = v_order_type;

  -- Tamamlanan veya iptal edilen siparişler için yeni rezervasyon oluşturma
  IF v_order.status IN ('tamamlandi', 'iptal') THEN
    RETURN;
  END IF;

  -- BOM'dan yeni rezervasyonları oluştur
  FOR v_bom IN
    SELECT
      sb.material_type,
      sb.material_id,
      COALESCE(sb.quantity, 0) AS quantity,
      COALESCE(rm.name, sfp2.name) AS material_name,
      COALESCE(rm.code, sfp2.code) AS material_code
    FROM semi_bom sb
    LEFT JOIN raw_materials rm ON sb.material_type = 'raw' AND sb.material_id = rm.id
    LEFT JOIN semi_finished_products sfp2 ON sb.material_type = 'semi' AND sb.material_id = sfp2.id
    WHERE sb.semi_product_id = v_order.product_id
  LOOP
    v_needed := v_bom.quantity * COALESCE(v_order.planned_quantity, 0);

    IF v_needed <= 0 THEN
      CONTINUE;
    END IF;

    -- Rezervasyon kaydı oluştur
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

    -- SADECE RESERVED_QUANTITY ARTTIR, QUANTITY AYNI KALSIN
    IF v_bom.material_type = 'raw' THEN
      UPDATE raw_materials
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom.material_id;
    ELSIF v_bom.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom.material_id;
    END IF;

    -- Stok hareketi kaydet
    v_description := format(
      'Yarı mamul rezervasyon: Sipariş %s için %s adet %s (%s)',
      p_order_id,
      v_needed,
      COALESCE(v_bom.material_name, 'Bilinmeyen'),
      COALESCE(v_bom.material_code, 'N/A')
    );

    INSERT INTO stock_movements (
      material_type,
      material_id,
      movement_type,
      quantity,
      user_id,
      description
    )
    VALUES (
      v_bom.material_type,
      v_bom.material_id,
      'rezervasyon',
      v_needed,
      v_user_id,
      v_description
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. NİHAİ ÜRÜN ÜRETİM TÜKETİM FONKSİYONU
-- ============================================================================
CREATE OR REPLACE FUNCTION consume_materials_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_consumption NUMERIC;
BEGIN
  FOR v_bom_record IN
    SELECT material_type, material_id, material_code, material_name, quantity_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = NEW.plan_id
  LOOP
    v_consumption := v_bom_record.quantity_needed * NEW.quantity_produced;

    IF v_consumption IS NULL OR v_consumption = 0 THEN
      CONTINUE;
    END IF;

    -- ÜRETİMDE HEM QUANTITY HEM RESERVED_QUANTITY DÜŞÜR
    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET
        quantity = GREATEST(quantity - v_consumption, 0),
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;
    ELSIF v_bom_record.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET
        quantity = GREATEST(quantity - v_consumption, 0),
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;
    END IF;

    -- Rezervasyon kaydını güncelle
    UPDATE material_reservations
    SET
      consumed_quantity = LEAST(reserved_quantity, COALESCE(consumed_quantity, 0) + v_consumption),
      status = CASE
        WHEN LEAST(reserved_quantity, COALESCE(consumed_quantity, 0) + v_consumption) >= reserved_quantity THEN 'completed'
        ELSE 'active'
      END,
      updated_at = NOW()
    WHERE order_id = (
      SELECT order_id::TEXT FROM production_plans WHERE id = NEW.plan_id
    )
      AND material_id = v_bom_record.material_id
      AND material_type = v_bom_record.material_type
      AND order_type = 'production_plan';

    -- Stok hareketi kaydet
    INSERT INTO stock_movements (
      material_type,
      material_id,
      movement_type,
      quantity,
      user_id,
      description
    )
    VALUES (
      v_bom_record.material_type,
      v_bom_record.material_id,
      'uretim',
      -v_consumption,
      NEW.operator_id,
      format('Üretim tüketimi: %s adet %s (%s) için %s %s',
        NEW.quantity_produced,
        (SELECT fp.name FROM production_plans pp
         JOIN finished_products fp ON pp.product_id = fp.id
         WHERE pp.id = NEW.plan_id LIMIT 1),
        (SELECT fp.code FROM production_plans pp
         JOIN finished_products fp ON pp.product_id = fp.id
         WHERE pp.id = NEW.plan_id LIMIT 1),
        v_consumption,
        COALESCE(v_bom_record.material_name, 'Bilinmeyen')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. YARI MAMUL ÜRETİM TÜKETİM FONKSİYONU
-- ============================================================================
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

    -- ÜRETİMDE HEM QUANTITY HEM RESERVED_QUANTITY DÜŞÜR
    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET
        quantity = GREATEST(quantity - v_consumption, 0),
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;

      -- Stok hareketi kaydet
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
        quantity = GREATEST(quantity - v_consumption, 0),
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;

      -- Stok hareketi kaydet
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

    -- Rezervasyon kaydını güncelle
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
      AND material_type = v_bom_record.material_type;
  END LOOP;

  -- Üretilen yarı mamul stoku artır
  UPDATE semi_finished_products
  SET quantity = quantity + NEW.quantity_produced
  WHERE id = v_order.product_id;

  -- Yarı mamul üretim stok hareketi kaydet
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
      v_product_code
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. PLAN İPTALİNDE REZERVASYON İADE FONKSİYONU
-- ============================================================================
CREATE OR REPLACE FUNCTION release_reservations_on_plan_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_reservation RECORD;
  v_return NUMERIC;
  v_description TEXT;
  v_user_id UUID;
BEGIN
  IF NEW.status IN ('iptal_edildi', 'tamamlandi') AND OLD.status NOT IN ('iptal_edildi', 'tamamlandi') THEN
    BEGIN
      v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    FOR v_reservation IN
      SELECT *
      FROM material_reservations
      WHERE order_id = NEW.order_id
        AND order_type = 'production_plan'
    LOOP
      -- Henüz tüketilmemiş rezervasyonu hesapla
      v_return := GREATEST(COALESCE(v_reservation.reserved_quantity, 0) - COALESCE(v_reservation.consumed_quantity, 0), 0);

      IF v_return > 0 THEN
        -- SADECE RESERVED_QUANTITY AZALT
        IF v_reservation.material_type = 'raw' THEN
          UPDATE raw_materials
          SET reserved_quantity = GREATEST(reserved_quantity - v_return, 0)
          WHERE id = v_reservation.material_id;
        ELSIF v_reservation.material_type = 'semi' THEN
          UPDATE semi_finished_products
          SET reserved_quantity = GREATEST(reserved_quantity - v_return, 0)
          WHERE id = v_reservation.material_id;
        END IF;

        -- Stok hareketi kaydet
        v_description := format(
          'Rezervasyon iptali: Plan %s için %s adet iade',
          NEW.order_id,
          v_return
        );

        INSERT INTO stock_movements (
          material_type,
          material_id,
          movement_type,
          quantity,
          user_id,
          description
        )
        VALUES (
          v_reservation.material_type,
          v_reservation.material_id,
          'rezervasyon_iptali',
          -v_return,
          v_user_id,
          v_description
        );
      END IF;
    END LOOP;

    -- Rezervasyon kayıtlarını sil
    DELETE FROM material_reservations
    WHERE order_id = NEW.order_id
      AND order_type = 'production_plan';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. MEVCUT AKTİF REZERVASYONLAR İÇİN STOK DÜZELTMESİ
-- ============================================================================
-- Eski sistemde rezervasyon yapıldığında quantity düşürülmüştü
-- Şimdi bu düşürülmüş miktarları geri ekliyoruz
DO $$
DECLARE
  v_row RECORD;
  v_pending NUMERIC;
BEGIN
  RAISE NOTICE '🔧 Aktif rezervasyonlar için stok düzeltmesi başlıyor...';

  -- Hammaddeler için
  FOR v_row IN
    SELECT
      mr.material_id,
      SUM(mr.reserved_quantity - COALESCE(mr.consumed_quantity, 0)) AS pending_reservation
    FROM material_reservations mr
    WHERE mr.status = 'active'
      AND mr.material_type = 'raw'
    GROUP BY mr.material_id
  LOOP
    v_pending := COALESCE(v_row.pending_reservation, 0);

    IF v_pending > 0 THEN
      -- Eski sistemde quantity düşürülmüştü, şimdi geri ekliyoruz
      UPDATE raw_materials
      SET quantity = quantity + v_pending
      WHERE id = v_row.material_id;

      RAISE NOTICE '✅ Hammadde %: % adet quantity geri eklendi', v_row.material_id, v_pending;
    END IF;
  END LOOP;

  -- Yarı mamuller için
  FOR v_row IN
    SELECT
      mr.material_id,
      SUM(mr.reserved_quantity - COALESCE(mr.consumed_quantity, 0)) AS pending_reservation
    FROM material_reservations mr
    WHERE mr.status = 'active'
      AND mr.material_type = 'semi'
    GROUP BY mr.material_id
  LOOP
    v_pending := COALESCE(v_row.pending_reservation, 0);

    IF v_pending > 0 THEN
      -- Eski sistemde quantity düşürülmüştü, şimdi geri ekliyoruz
      UPDATE semi_finished_products
      SET quantity = quantity + v_pending
      WHERE id = v_row.material_id;

      RAISE NOTICE '✅ Yarı mamul %: % adet quantity geri eklendi', v_row.material_id, v_pending;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Stok düzeltmesi tamamlandı!';
END;
$$;

-- ============================================================================
-- SONUÇ RAPORU
-- ============================================================================
SELECT '✅ Rezervasyon sistemi doğru stok yönetimi akışına güncellendi!' AS result;
SELECT '📊 Yeni Akış:' AS info;
SELECT '   1. Rezervasyon yapıldığında: quantity aynı kalır, reserved_quantity artar' AS step_1;
SELECT '   2. Üretim yapıldığında: HEM quantity HEM reserved_quantity düşer' AS step_2;
SELECT '   3. Kullanılabilir stok = quantity - reserved_quantity' AS formula;
