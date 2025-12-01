-- 2025-11-07: Fix semi reservation stock movements to carry user context

CREATE OR REPLACE FUNCTION create_semi_order_reservations(
  p_order_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_existing RECORD;
  v_release NUMERIC;
  v_bom RECORD;
  v_needed NUMERIC;
  v_order_type CONSTANT TEXT := 'semi_production_order';
  v_actor UUID;
BEGIN
  SELECT id, product_id, planned_quantity, status, created_by
  INTO v_order
  FROM semi_production_orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_actor := COALESCE(p_user_id, v_order.created_by);

  IF v_actor IS NULL THEN
    BEGIN
      v_actor := current_setting('app.current_user_id', TRUE)::UUID;
    EXCEPTION
      WHEN OTHERS THEN
        v_actor := NULL;
    END;
  END IF;

  -- Release existing reservations and return stock
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
        SET 
          quantity = quantity + v_release,
          reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      ELSIF v_existing.material_type = 'semi' THEN
        UPDATE semi_finished_products
        SET 
          quantity = quantity + v_release,
          reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      ELSIF v_existing.material_type = 'finished' THEN
        UPDATE finished_products
        SET reserved_quantity = GREATEST(reserved_quantity - v_release, 0)
        WHERE id = v_existing.material_id;
      END IF;

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
        'giris',
        v_release,
        v_actor,
        format('Yarı mamul rezervasyon iadesi: Sipariş %s için %s adet', p_order_id, v_release)
      );
    END IF;
  END LOOP;

  DELETE FROM material_reservations
  WHERE order_id = p_order_id::TEXT
    AND order_type = v_order_type;

  IF v_order.status IN ('tamamlandi', 'iptal') THEN
    RETURN;
  END IF;

  -- Create fresh reservations from BOM
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
      COALESCE(v_actor, v_order.created_by)
    );

    IF v_bom.material_type = 'raw' THEN
      UPDATE raw_materials
      SET 
        quantity = quantity - v_needed,
        reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom.material_id;
    ELSIF v_bom.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET 
        quantity = quantity - v_needed,
        reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom.material_id;
    END IF;

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
      'cikis',
      -v_needed,
      v_actor,
      format(
        'Yarı mamul rezervasyon: Sipariş %s için %s adet %s (%s)',
        p_order_id,
        v_needed,
        COALESCE(v_bom.material_name, 'Bilinmeyen'),
        COALESCE(v_bom.material_code, 'N/A')
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_create_semi_order_reservations()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_semi_order_reservations(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-sync active semi production orders to ensure new actor propagation
DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN
    SELECT id, created_by
    FROM semi_production_orders
    WHERE status IN ('planlandi', 'devam_ediyor')
  LOOP
    PERFORM create_semi_order_reservations(v_order.id, v_order.created_by);
  END LOOP;
END;
$$;

SELECT '✅ Semi reservation user context updated' AS result;

