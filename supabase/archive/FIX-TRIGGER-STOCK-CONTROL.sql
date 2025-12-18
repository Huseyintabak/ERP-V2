-- Trigger Stok Kontrolü Düzeltmesi
-- Problem: consume_materials_on_production trigger'ında stok yeterlilik kontrolü yok
-- Çözüm: Stok yeterlilik kontrolü ekle ve yetersiz stok durumunda hata fırlat

CREATE OR REPLACE FUNCTION consume_materials_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_consumption NUMERIC;
  v_current_stock NUMERIC;
  v_planned_quantity NUMERIC;
BEGIN
  -- Planlanan miktarı al
  SELECT planned_quantity INTO v_planned_quantity
  FROM production_plans
  WHERE id = NEW.plan_id;
  
  FOR v_bom_record IN
    SELECT material_type, material_id, material_code, material_name, quantity_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = NEW.plan_id
  LOOP
    -- Tüketim miktarını hesapla
    v_consumption := v_bom_record.quantity_needed * NEW.quantity_produced / v_planned_quantity;
    
    IF v_bom_record.material_type = 'raw' THEN
      -- Mevcut stoku kontrol et
      SELECT quantity INTO v_current_stock
      FROM raw_materials
      WHERE id = v_bom_record.material_id;
      
      -- Stok yeterlilik kontrolü
      IF v_current_stock < v_consumption THEN
        RAISE EXCEPTION 'Yetersiz stok: % (%). Mevcut: %, İhtiyaç: %', 
          v_bom_record.material_name, 
          v_bom_record.material_code, 
          v_current_stock, 
          v_consumption;
      END IF;
      
      -- Stoku güncelle
      UPDATE raw_materials
      SET quantity = quantity - v_consumption
      WHERE id = v_bom_record.material_id;
      
      -- Stock movement kaydı
      INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
      VALUES (
        'raw',
        v_bom_record.material_id,
        'uretim',
        -v_consumption,
        NEW.operator_id,
        format('Üretim tüketimi: %s adet %s için', NEW.quantity_produced, 
          (SELECT fp.name FROM production_plans pp 
           JOIN finished_products fp ON pp.product_id = fp.id 
           WHERE pp.id = NEW.plan_id))
      );
      
    ELSIF v_bom_record.material_type = 'semi' THEN
      -- Mevcut stoku kontrol et
      SELECT quantity INTO v_current_stock
      FROM semi_finished_products
      WHERE id = v_bom_record.material_id;
      
      -- Stok yeterlilik kontrolü
      IF v_current_stock < v_consumption THEN
        RAISE EXCEPTION 'Yetersiz stok: % (%). Mevcut: %, İhtiyaç: %', 
          v_bom_record.material_name, 
          v_bom_record.material_code, 
          v_current_stock, 
          v_consumption;
      END IF;
      
      -- Stoku güncelle
      UPDATE semi_finished_products
      SET quantity = quantity - v_consumption
      WHERE id = v_bom_record.material_id;
      
      -- Stock movement kaydı
      INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
      VALUES (
        'semi',
        v_bom_record.material_id,
        'uretim',
        -v_consumption,
        NEW.operator_id,
        format('Üretim tüketimi: %s adet için', NEW.quantity_produced)
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
