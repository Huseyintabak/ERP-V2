-- 2025-11-07: Yarı mamul üretim log tetikleyicisi
-- Yarı mamul üretiminde BOM tüketimi ve stok güncellemelerini otomatikleştirir

-- Mevcut tetikleyiciyi ve fonksiyonu kaldır
DROP TRIGGER IF EXISTS trigger_consume_materials_on_semi_production ON semi_production_logs;
DROP FUNCTION IF EXISTS consume_materials_on_semi_production();

-- Yeni tetikleyici fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION consume_materials_on_semi_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_product_id UUID;
  v_planned_quantity INTEGER;
  v_product_name TEXT;
  v_product_code TEXT;
  v_consumption NUMERIC;
BEGIN
  -- İlgili yarı mamul üretim siparişini getir
  SELECT 
    spo.product_id,
    spo.planned_quantity,
    sfp.name,
    sfp.code
  INTO v_product_id, v_planned_quantity, v_product_name, v_product_code
  FROM semi_production_orders spo
  JOIN semi_finished_products sfp ON spo.product_id = sfp.id
  WHERE spo.id = NEW.order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yarı mamul üretim siparişi bulunamadı: %', NEW.order_id;
  END IF;
  
  -- BOM'dan malzemeleri dolaş
  FOR v_bom_record IN
    SELECT 
      sb.material_type,
      sb.material_id,
      sb.quantity AS quantity_needed,
      rm.code AS raw_material_code,
      rm.name AS raw_material_name,
      sfp2.code AS semi_material_code,
      sfp2.name AS semi_material_name
    FROM semi_bom sb
    LEFT JOIN raw_materials rm ON sb.material_type = 'raw' AND sb.material_id = rm.id
    LEFT JOIN semi_finished_products sfp2 ON sb.material_type = 'semi' AND sb.material_id = sfp2.id
    WHERE sb.semi_product_id = v_product_id
  LOOP
    -- Üretim miktarına göre tüketimi hesapla
    v_consumption := (v_bom_record.quantity_needed / v_planned_quantity) * NEW.quantity_produced;
    
    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET quantity = quantity - v_consumption
      WHERE id = v_bom_record.material_id;
      
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
          COALESCE(v_bom_record.raw_material_name, 'Bilinmeyen'))
      );
      
    ELSIF v_bom_record.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET quantity = quantity - v_consumption
      WHERE id = v_bom_record.material_id;
      
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
          COALESCE(v_bom_record.semi_material_name, 'Bilinmeyen'))
      );
    END IF;
  END LOOP;
  
  -- Üretilen yarı mamul stokunu artır
  UPDATE semi_finished_products
  SET quantity = quantity + NEW.quantity_produced
  WHERE id = v_product_id;
  
  -- Pozitif stok hareketi ekle
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
    v_product_id,
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

-- Tetikleyiciyi oluştur
CREATE TRIGGER trigger_consume_materials_on_semi_production
AFTER INSERT ON semi_production_logs
FOR EACH ROW
EXECUTE FUNCTION consume_materials_on_semi_production();

-- Doğrulama mesajı
SELECT '✅ Yarı mamul üretim tetikleyicisi oluşturuldu' AS result;
