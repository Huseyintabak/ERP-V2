-- Migration: Fix v_order record assignment bug in consume_materials_on_semi_production
-- Date: 2025-01-29
-- Description: Fix "record v_order is not assigned yet" error in semi production log creation

-- Drop and recreate the function with fixed v_order assignment
CREATE OR REPLACE FUNCTION public.consume_materials_on_semi_production()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_bom_record RECORD;
  v_order_product_id UUID;
  v_product_name TEXT;
  v_product_code TEXT;
  v_consumption NUMERIC;
  v_order_type CONSTANT TEXT := 'semi_production_order';
BEGIN
  -- Fetch order and product details
  SELECT
    spo.product_id,
    sfp.name,
    sfp.code
  INTO v_order_product_id, v_product_name, v_product_code
  FROM semi_production_orders spo
  JOIN semi_finished_products sfp ON spo.product_id = sfp.id
  WHERE spo.id = NEW.order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yarı mamul üretim siparişi bulunamadı: %', NEW.order_id;
  END IF;

  -- Process BOM items
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
    WHERE sb.semi_product_id = v_order_product_id
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
  WHERE id = v_order_product_id;

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
    v_order_product_id,
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
$function$;

-- Add comment
COMMENT ON FUNCTION consume_materials_on_semi_production() IS 'Fixed v_order record assignment bug - now uses individual variables instead of RECORD type';
