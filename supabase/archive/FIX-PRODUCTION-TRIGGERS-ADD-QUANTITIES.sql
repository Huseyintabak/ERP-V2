-- Fix production triggers to include before_quantity and after_quantity

-- ============================================
-- 1. Update Stock on Production (Finished Product)
-- ============================================

CREATE OR REPLACE FUNCTION update_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_before_qty NUMERIC;
  v_after_qty NUMERIC;
BEGIN
  -- Get product_id from plan
  SELECT product_id INTO v_product_id
  FROM production_plans
  WHERE id = NEW.plan_id;
  
  -- Get current quantity BEFORE update
  SELECT quantity INTO v_before_qty
  FROM finished_products
  WHERE id = v_product_id;
  
  -- Calculate new quantity
  v_after_qty := v_before_qty + NEW.quantity_produced;
  
  -- Update finished product stock
  UPDATE finished_products
  SET quantity = v_after_qty
  WHERE id = v_product_id;
  
  -- Record stock movement WITH before/after quantities
  INSERT INTO stock_movements (
    material_type, 
    material_id, 
    movement_type, 
    quantity, 
    before_quantity,  -- ✅ ADDED
    after_quantity,   -- ✅ ADDED
    user_id, 
    description
  )
  VALUES (
    'finished', 
    v_product_id, 
    'uretim', 
    NEW.quantity_produced,
    v_before_qty,     -- ✅ ADDED
    v_after_qty,      -- ✅ ADDED
    NEW.operator_id, 
    'Üretim kaydı: Plan #' || NEW.plan_id
  );
  
  -- Update production plan produced quantity
  UPDATE production_plans
  SET produced_quantity = produced_quantity + NEW.quantity_produced
  WHERE id = NEW.plan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. Consume Materials on Production (Raw/Semi)
-- ============================================

CREATE OR REPLACE FUNCTION consume_materials_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_consumption_qty NUMERIC;
  v_before_qty NUMERIC;
  v_after_qty NUMERIC;
  v_product_name TEXT;
BEGIN
  -- Get product name for description
  SELECT fp.name INTO v_product_name
  FROM production_plans pp 
  JOIN finished_products fp ON pp.product_id = fp.id 
  WHERE pp.id = NEW.plan_id;
  
  -- Loop through all BOM items
  FOR v_bom_record IN
    SELECT material_type, material_id, quantity_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = NEW.plan_id
  LOOP
    -- Calculate consumption quantity
    v_consumption_qty := v_bom_record.quantity_needed * NEW.quantity_produced / 
      (SELECT planned_quantity FROM production_plans WHERE id = NEW.plan_id);
    
    IF v_bom_record.material_type = 'raw' THEN
      -- Get current quantity BEFORE update
      SELECT quantity INTO v_before_qty
      FROM raw_materials
      WHERE id = v_bom_record.material_id;
      
      -- Calculate new quantity
      v_after_qty := v_before_qty - v_consumption_qty;
      
      -- Update raw material stock
      UPDATE raw_materials
      SET quantity = v_after_qty
      WHERE id = v_bom_record.material_id;
      
      -- Record stock movement WITH before/after quantities
      INSERT INTO stock_movements (
        material_type, 
        material_id, 
        movement_type, 
        quantity,
        before_quantity,  -- ✅ ADDED
        after_quantity,   -- ✅ ADDED
        user_id, 
        description
      )
      VALUES (
        'raw',
        v_bom_record.material_id,
        'uretim',
        -v_consumption_qty,  -- Negative for consumption
        v_before_qty,        -- ✅ ADDED
        v_after_qty,         -- ✅ ADDED
        NEW.operator_id,
        format('Üretim tüketimi: %s adet %s için', NEW.quantity_produced, v_product_name)
      );
      
    ELSIF v_bom_record.material_type = 'semi' THEN
      -- Get current quantity BEFORE update
      SELECT quantity INTO v_before_qty
      FROM semi_finished_products
      WHERE id = v_bom_record.material_id;
      
      -- Calculate new quantity
      v_after_qty := v_before_qty - v_consumption_qty;
      
      -- Update semi-finished product stock
      UPDATE semi_finished_products
      SET quantity = v_after_qty
      WHERE id = v_bom_record.material_id;
      
      -- Record stock movement WITH before/after quantities
      INSERT INTO stock_movements (
        material_type, 
        material_id, 
        movement_type, 
        quantity,
        before_quantity,  -- ✅ ADDED
        after_quantity,   -- ✅ ADDED
        user_id, 
        description
      )
      VALUES (
        'semi',
        v_bom_record.material_id,
        'uretim',
        -v_consumption_qty,  -- Negative for consumption
        v_before_qty,        -- ✅ ADDED
        v_after_qty,         -- ✅ ADDED
        NEW.operator_id,
        format('Üretim tüketimi: %s adet %s için', NEW.quantity_produced, v_product_name)
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS
-- ============================================

SELECT '✅ PRODUCTION TRIGGERS UPDATED WITH QUANTITIES!' as result;

-- Test: Check if triggers are updated
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('update_stock_on_production', 'consume_materials_on_production')
ORDER BY routine_name;

