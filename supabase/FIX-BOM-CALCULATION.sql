-- Fix BOM calculation in consume_materials_on_production trigger
-- The issue was: quantity_needed * quantity_produced / planned_quantity
-- Should be: quantity_needed * quantity_produced

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_consume_materials ON production_logs;

-- Recreate the function with correct calculation
CREATE OR REPLACE FUNCTION consume_materials_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
BEGIN
  FOR v_bom_record IN
    SELECT material_type, material_id, material_code, material_name, quantity_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = NEW.plan_id
  LOOP
    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET quantity = quantity - (v_bom_record.quantity_needed * NEW.quantity_produced)
      WHERE id = v_bom_record.material_id;
      
      INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
      VALUES (
        'raw',
        v_bom_record.material_id,
        'uretim',
        -(v_bom_record.quantity_needed * NEW.quantity_produced),
        NEW.operator_id,
        format('Üretim tüketimi: %s adet %s için', NEW.quantity_produced, 
          (SELECT fp.name FROM production_plans pp 
           JOIN finished_products fp ON pp.product_id = fp.id 
           WHERE pp.id = NEW.plan_id))
      );
    ELSIF v_bom_record.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET quantity = quantity - (v_bom_record.quantity_needed * NEW.quantity_produced)
      WHERE id = v_bom_record.material_id;
      
      INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
      VALUES (
        'semi',
        v_bom_record.material_id,
        'uretim',
        -(v_bom_record.quantity_needed * NEW.quantity_produced),
        NEW.operator_id,
        format('Üretim tüketimi: %s adet için', NEW.quantity_produced)
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_consume_materials
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION consume_materials_on_production();
