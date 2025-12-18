-- Fix "operator does not exist: text = uuid" hatası
-- format() fonksiyonunda UUID'leri TEXT'e cast et

-- ============================================
-- 1. update_stock_on_production() FUNCTION DÜZELTMESİ
-- ============================================

CREATE OR REPLACE FUNCTION update_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_before_qty NUMERIC;
  v_after_qty NUMERIC;
  v_product_name TEXT;
  v_error_context TEXT;
BEGIN
  -- Hata yakalama için context - UUID'leri TEXT'e cast et
  v_error_context := format('update_stock_on_production: plan_id=%s, operator_id=%s, quantity=%s', 
    NEW.plan_id::TEXT, NEW.operator_id::TEXT, NEW.quantity_produced);

  BEGIN
    -- Plan'dan product_id al
    SELECT product_id INTO v_product_id
    FROM production_plans
    WHERE id = NEW.plan_id;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Plan bulunamadı: %', NEW.plan_id::TEXT;
    END IF;

    -- Ürün adını al (description için)
    SELECT name INTO v_product_name
    FROM finished_products
    WHERE id = v_product_id;

    -- Mevcut stoku al (BEFORE update)
    SELECT COALESCE(quantity, 0) INTO v_before_qty
    FROM finished_products
    WHERE id = v_product_id;

    IF v_before_qty IS NULL THEN
      v_before_qty := 0;
    END IF;

    -- Yeni stok hesapla
    v_after_qty := v_before_qty + COALESCE(NEW.quantity_produced, 0);

    -- Nihai ürün stokunu güncelle
    UPDATE finished_products
    SET 
      quantity = v_after_qty,
      updated_at = NOW()
    WHERE id = v_product_id;

    -- Stok hareketi kaydet (before_quantity ve after_quantity ile)
    INSERT INTO stock_movements (
      material_type, 
      material_id, 
      movement_type, 
      quantity, 
      before_quantity,
      after_quantity,
      user_id, 
      description,
      created_at,
      production_log_id
    )
    VALUES (
      'finished', 
      v_product_id, 
      'uretim', 
      COALESCE(NEW.quantity_produced, 0),
      v_before_qty,
      v_after_qty,
      NEW.operator_id, 
      format('Üretim kaydı: %s adet %s (Plan #%s)', 
        COALESCE(NEW.quantity_produced, 0), 
        COALESCE(v_product_name, 'Bilinmeyen Ürün'),
        NEW.plan_id::TEXT),
      COALESCE(NEW.timestamp, NOW()),
      NEW.id
    );

    -- Production plan produced_quantity güncelle
    UPDATE production_plans
    SET 
      produced_quantity = COALESCE(produced_quantity, 0) + COALESCE(NEW.quantity_produced, 0),
      updated_at = NOW()
    WHERE id = NEW.plan_id;

    RETURN NEW;

  EXCEPTION
    WHEN OTHERS THEN
      -- Hata logla (eğer audit_logs tablosu varsa)
      RAISE WARNING 'update_stock_on_production hatası: % - Context: %', SQLERRM, v_error_context;
      -- Hata durumunda da NEW'i döndür (log kaydı olsun)
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. consume_materials_on_production() FUNCTION DÜZELTMESİ
-- ============================================

CREATE OR REPLACE FUNCTION consume_materials_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_consumption_qty NUMERIC;
  v_before_qty NUMERIC;
  v_after_qty NUMERIC;
  v_product_name TEXT;
  v_planned_quantity NUMERIC;
  v_error_context TEXT;
  v_material_name TEXT;
  v_material_code TEXT;
BEGIN
  -- Hata yakalama için context - UUID'leri TEXT'e cast et
  v_error_context := format('consume_materials_on_production: plan_id=%s, operator_id=%s, quantity=%s', 
    NEW.plan_id::TEXT, NEW.operator_id::TEXT, NEW.quantity_produced);

  BEGIN
    -- Plan'dan planned_quantity al
    SELECT planned_quantity INTO v_planned_quantity
    FROM production_plans
    WHERE id = NEW.plan_id;

    IF v_planned_quantity IS NULL OR v_planned_quantity <= 0 THEN
      RAISE EXCEPTION 'Plan bulunamadı veya geçersiz planned_quantity: %', NEW.plan_id::TEXT;
    END IF;

    -- BOM snapshot kayıtlarını al
    FOR v_bom_record IN 
      SELECT 
        material_type,
        material_id,
        quantity_needed,
        material_name,
        material_code
      FROM production_plan_bom_snapshot
      WHERE plan_id = NEW.plan_id
    LOOP
      -- Tüketim miktarını hesapla (proportionally)
      v_consumption_qty := (v_bom_record.quantity_needed / v_planned_quantity) * COALESCE(NEW.quantity_produced, 0);

      IF v_consumption_qty <= 0 THEN
        CONTINUE; -- 0 veya negatif tüketim atla
      END IF;

      -- Material name ve code'u al
      v_material_name := v_bom_record.material_name;
      v_material_code := v_bom_record.material_code;

      -- Malzeme tipine göre stok güncelle
      IF v_bom_record.material_type = 'raw' THEN
        -- Hammadde stoku güncelle
        SELECT COALESCE(quantity, 0) INTO v_before_qty
        FROM raw_materials
        WHERE id = v_bom_record.material_id;

        IF v_before_qty IS NULL THEN
          v_before_qty := 0;
        END IF;

        -- Stok kontrolü
        IF v_before_qty < v_consumption_qty THEN
          RAISE WARNING 'Yetersiz stok: % (Mevcut: %, Gerekli: %)', 
            v_material_name, v_before_qty, v_consumption_qty;
          -- Kritik seviye kontrolü - stok hareketi yine de kaydedilir (negatif olabilir)
        END IF;

        v_after_qty := v_before_qty - v_consumption_qty;

        -- Hammadde stokunu güncelle
        UPDATE raw_materials
        SET 
          quantity = v_after_qty,
          updated_at = NOW()
        WHERE id = v_bom_record.material_id;

        -- Stok hareketi kaydet
        INSERT INTO stock_movements (
          material_type, 
          material_id, 
          movement_type, 
          quantity, 
          before_quantity,
          after_quantity,
          user_id, 
          description,
          created_at,
          production_log_id
        )
        VALUES (
          'raw', 
          v_bom_record.material_id, 
          'uretim', 
          -v_consumption_qty, -- Negatif (çıkış)
          v_before_qty,
          v_after_qty,
          NEW.operator_id, 
          format('Malzeme tüketimi: %s %s %s (Plan #%s)', 
            v_consumption_qty, 
            COALESCE(v_material_name, 'Bilinmeyen Malzeme'),
            v_bom_record.material_code,
            NEW.plan_id::TEXT),
          COALESCE(NEW.timestamp, NOW()),
          NEW.id
        );

      ELSIF v_bom_record.material_type = 'semi' THEN
        -- Yarı mamul stoku güncelle
        SELECT COALESCE(quantity, 0) INTO v_before_qty
        FROM semi_finished_products
        WHERE id = v_bom_record.material_id;

        IF v_before_qty IS NULL THEN
          v_before_qty := 0;
        END IF;

        -- Stok kontrolü
        IF v_before_qty < v_consumption_qty THEN
          RAISE WARNING 'Yetersiz stok: % (Mevcut: %, Gerekli: %)', 
            v_material_name, v_before_qty, v_consumption_qty;
        END IF;

        v_after_qty := v_before_qty - v_consumption_qty;

        -- Yarı mamul stokunu güncelle
        UPDATE semi_finished_products
        SET 
          quantity = v_after_qty,
          updated_at = NOW()
        WHERE id = v_bom_record.material_id;

        -- Stok hareketi kaydet
        INSERT INTO stock_movements (
          material_type, 
          material_id, 
          movement_type, 
          quantity, 
          before_quantity,
          after_quantity,
          user_id, 
          description,
          created_at,
          production_log_id
        )
        VALUES (
          'semi', 
          v_bom_record.material_id, 
          'uretim', 
          -v_consumption_qty, -- Negatif (çıkış)
          v_before_qty,
          v_after_qty,
          NEW.operator_id, 
          format('Malzeme tüketimi: %s %s %s (Plan #%s)', 
            v_consumption_qty, 
            COALESCE(v_material_name, 'Bilinmeyen Malzeme'),
            v_bom_record.material_code,
            NEW.plan_id::TEXT),
          COALESCE(NEW.timestamp, NOW()),
          NEW.id
        );
      END IF;
    END LOOP;

    RETURN NEW;

  EXCEPTION
    WHEN OTHERS THEN
      -- Hata logla
      RAISE WARNING 'consume_materials_on_production hatası: % - Context: %', SQLERRM, v_error_context;
      -- Hata durumunda da NEW'i döndür (log kaydı olsun)
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları yeniden oluştur (zaten varsa değiştirir)
DROP TRIGGER IF EXISTS trigger_update_stock_on_production ON production_logs;
CREATE TRIGGER trigger_update_stock_on_production
  AFTER INSERT ON production_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_production();

DROP TRIGGER IF EXISTS trigger_consume_materials_on_production ON production_logs;
CREATE TRIGGER trigger_consume_materials_on_production
  AFTER INSERT ON production_logs
  FOR EACH ROW
  EXECUTE FUNCTION consume_materials_on_production();

-- Kontrol
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_update_stock_on_production'
  ) THEN
    RAISE EXCEPTION 'trigger_update_stock_on_production trigger oluşturulamadı!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_consume_materials_on_production'
  ) THEN
    RAISE EXCEPTION 'trigger_consume_materials_on_production trigger oluşturulamadı!';
  END IF;

  RAISE NOTICE '✅ Trigger''lar başarıyla oluşturuldu/güncellendi!';
END $$;

