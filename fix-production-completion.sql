-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_production_log_stock ON production_logs;

-- Update the function to handle completion
CREATE OR REPLACE FUNCTION update_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_plan RECORD;
  v_new_produced_quantity NUMERIC;
BEGIN
  -- Plan bilgilerini al
  SELECT product_id, planned_quantity, produced_quantity INTO v_plan
  FROM production_plans
  WHERE id = NEW.plan_id;
  
  v_product_id := v_plan.product_id;
  v_new_produced_quantity := v_plan.produced_quantity + NEW.quantity_produced;
  
  -- Nihai ürün stokunu artır
  UPDATE finished_products
  SET quantity = quantity + NEW.quantity_produced
  WHERE id = v_product_id;
  
  -- Stok hareketi kaydet
  INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
  VALUES ('finished', v_product_id, 'uretim', NEW.quantity_produced, NEW.operator_id, 
          'Üretim kaydı: Plan #' || NEW.plan_id);
  
  -- Production plan'daki produced_quantity güncelle
  UPDATE production_plans
  SET produced_quantity = v_new_produced_quantity
  WHERE id = NEW.plan_id;
  
  -- Hedef tamamlandı mı kontrol et
  IF v_new_produced_quantity >= v_plan.planned_quantity THEN
    -- Plan'ı tamamlandı olarak işaretle
    UPDATE production_plans
    SET status = 'tamamlandi', completed_at = NOW()
    WHERE id = NEW.plan_id;
    
    -- Sipariş durumunu kontrol et ve güncelle
    UPDATE orders
    SET status = 'tamamlandi'
    WHERE id = (
      SELECT order_id FROM production_plans WHERE id = NEW.plan_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM production_plans 
      WHERE order_id = (SELECT order_id FROM production_plans WHERE id = NEW.plan_id)
      AND status NOT IN ('tamamlandi', 'iptal_edildi')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_production_log_stock
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION update_stock_on_production();
