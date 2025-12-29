-- Migration: Add before_quantity and after_quantity tracking to ALL production functions
-- Date: 2025-01-29
-- Description: Update consume_materials_on_production to track before/after quantities for finished product production

-- Update consume_materials_on_production function
CREATE OR REPLACE FUNCTION public.consume_materials_on_production()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_bom_record RECORD;
  v_consumption NUMERIC;
  v_before_qty NUMERIC;
  v_after_qty NUMERIC;
  v_product_name TEXT;
  v_product_code TEXT;
BEGIN
  -- Get product details for descriptions
  SELECT fp.name, fp.code
  INTO v_product_name, v_product_code
  FROM production_plans pp
  JOIN finished_products fp ON pp.product_id = fp.id
  WHERE pp.id = NEW.plan_id;

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
      -- Get before quantity
      SELECT quantity INTO v_before_qty
      FROM raw_materials
      WHERE id = v_bom_record.material_id;

      -- Update stock
      UPDATE raw_materials
      SET
        quantity = GREATEST(quantity - v_consumption, 0),
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;

      -- Get after quantity
      SELECT quantity INTO v_after_qty
      FROM raw_materials
      WHERE id = v_bom_record.material_id;

    ELSIF v_bom_record.material_type = 'semi' THEN
      -- Get before quantity
      SELECT quantity INTO v_before_qty
      FROM semi_finished_products
      WHERE id = v_bom_record.material_id;

      -- Update stock
      UPDATE semi_finished_products
      SET
        quantity = GREATEST(quantity - v_consumption, 0),
        reserved_quantity = GREATEST(reserved_quantity - v_consumption, 0)
      WHERE id = v_bom_record.material_id;

      -- Get after quantity
      SELECT quantity INTO v_after_qty
      FROM semi_finished_products
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

    -- Stok hareketi kaydet WITH before/after tracking
    INSERT INTO stock_movements (
      material_type,
      material_id,
      movement_type,
      quantity,
      before_quantity,
      after_quantity,
      user_id,
      description
    )
    VALUES (
      v_bom_record.material_type,
      v_bom_record.material_id,
      'uretim',
      v_consumption,
      v_before_qty,
      v_after_qty,
      NEW.operator_id,
      format('Üretim tüketimi: %s adet %s (%s) için %s adet %s',
        NEW.quantity_produced,
        COALESCE(v_product_name, 'Bilinmeyen'),
        COALESCE(v_product_code, 'N/A'),
        v_consumption,
        COALESCE(v_bom_record.material_name, 'Bilinmeyen')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Add comment
COMMENT ON FUNCTION consume_materials_on_production() IS 'Updated to track before_quantity and after_quantity for all stock movements in finished product production';
