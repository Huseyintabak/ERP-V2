-- ============================================
-- ROBUST PRODUCTION STOCK TRIGGERS
-- Bu trigger'lar production_logs'a INSERT yapıldığında:
-- 1. Nihai ürün stokunu artırır
-- 2. Malzeme stoklarını düşürür
-- 3. Tüm stok hareketlerini kaydeder
-- 4. Hataları yakalar ve loglar
-- ============================================

-- Önce mevcut trigger'ları temizle
DROP TRIGGER IF EXISTS trigger_production_log_stock ON production_logs;
DROP TRIGGER IF EXISTS trigger_consume_materials ON production_logs;
DROP TRIGGER IF EXISTS trigger_update_stock_on_production ON production_logs;
DROP TRIGGER IF EXISTS trigger_consume_materials_on_production ON production_logs;

DROP FUNCTION IF EXISTS update_stock_on_production() CASCADE;
DROP FUNCTION IF EXISTS consume_materials_on_production() CASCADE;

-- ============================================
-- 1. NİHAİ ÜRÜN STOK GÜNCELLEMESİ
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
  -- Hata yakalama için context
  v_error_context := format('update_stock_on_production: plan_id=%s, operator_id=%s, quantity=%s', 
    NEW.plan_id, NEW.operator_id, NEW.quantity_produced);

  BEGIN
    -- Plan'dan product_id al
    SELECT product_id INTO v_product_id
    FROM production_plans
    WHERE id = NEW.plan_id;

    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'Plan bulunamadı: %', NEW.plan_id;
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
        NEW.plan_id),
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
-- 2. MALZEME TÜKETİMİ (BOM Snapshot'tan)
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
  -- Hata yakalama için context
  v_error_context := format('consume_materials_on_production: plan_id=%s, operator_id=%s, quantity=%s', 
    NEW.plan_id, NEW.operator_id, NEW.quantity_produced);

  BEGIN
    -- Plan'dan planned_quantity al
    SELECT planned_quantity INTO v_planned_quantity
    FROM production_plans
    WHERE id = NEW.plan_id;

    IF v_planned_quantity IS NULL OR v_planned_quantity <= 0 THEN
      RAISE EXCEPTION 'Geçersiz planned_quantity: %', v_planned_quantity;
    END IF;

    -- Ürün adını al (description için)
    SELECT fp.name INTO v_product_name
    FROM production_plans pp 
    JOIN finished_products fp ON pp.product_id = fp.id 
    WHERE pp.id = NEW.plan_id;

    -- BOM snapshot'taki tüm malzemeler için döngü
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
      BEGIN
        -- Tüketim miktarını hesapla
        v_consumption_qty := (v_bom_record.quantity_needed / v_planned_quantity) * COALESCE(NEW.quantity_produced, 0);

        -- Eğer tüketim 0 ise atla
        IF v_consumption_qty <= 0 THEN
          CONTINUE;
        END IF;

        v_material_name := COALESCE(v_bom_record.material_name, 'Bilinmeyen');
        v_material_code := COALESCE(v_bom_record.material_code, '');

        IF v_bom_record.material_type = 'raw' THEN
          -- Hammadde için mevcut stoku al (BEFORE update)
          SELECT COALESCE(quantity, 0) INTO v_before_qty
          FROM raw_materials
          WHERE id = v_bom_record.material_id;

          IF v_before_qty IS NULL THEN
            RAISE WARNING 'Hammadde bulunamadı: %', v_bom_record.material_id;
            CONTINUE;
          END IF;

          -- Yeni stok hesapla
          v_after_qty := v_before_qty - v_consumption_qty;

          -- Stok negatif olmamalı (uyarı ver ama devam et)
          IF v_after_qty < 0 THEN
            RAISE WARNING 'Stok yetersiz: % (Mevcut: %, Gerekli: %)', 
              v_material_name, v_before_qty, v_consumption_qty;
          END IF;

          -- Hammadde stokunu güncelle
          UPDATE raw_materials
          SET 
            quantity = GREATEST(0, v_after_qty), -- Negatif olmasın
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
            -v_consumption_qty,  -- Negatif (tüketim)
            v_before_qty,
            GREATEST(0, v_after_qty),
            NEW.operator_id,
            format('Üretim tüketimi: %s adet %s için %s (%s)', 
              NEW.quantity_produced, 
              COALESCE(v_product_name, 'Ürün'),
              v_consumption_qty,
              v_material_code),
            COALESCE(NEW.timestamp, NOW()),
            NEW.id
          );

        ELSIF v_bom_record.material_type = 'semi' THEN
          -- Yarı mamul için mevcut stoku al (BEFORE update)
          SELECT COALESCE(quantity, 0) INTO v_before_qty
          FROM semi_finished_products
          WHERE id = v_bom_record.material_id;

          IF v_before_qty IS NULL THEN
            RAISE WARNING 'Yarı mamul bulunamadı: %', v_bom_record.material_id;
            CONTINUE;
          END IF;

          -- Yeni stok hesapla
          v_after_qty := v_before_qty - v_consumption_qty;

          -- Stok negatif olmamalı (uyarı ver ama devam et)
          IF v_after_qty < 0 THEN
            RAISE WARNING 'Stok yetersiz: % (Mevcut: %, Gerekli: %)', 
              v_material_name, v_before_qty, v_consumption_qty;
          END IF;

          -- Yarı mamul stokunu güncelle
          UPDATE semi_finished_products
          SET 
            quantity = GREATEST(0, v_after_qty), -- Negatif olmasın
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
            -v_consumption_qty,  -- Negatif (tüketim)
            v_before_qty,
            GREATEST(0, v_after_qty),
            NEW.operator_id,
            format('Üretim tüketimi: %s adet %s için %s (%s)', 
              NEW.quantity_produced, 
              COALESCE(v_product_name, 'Ürün'),
              v_consumption_qty,
              v_material_code),
            COALESCE(NEW.timestamp, NOW()),
            NEW.id
          );
        END IF;

      EXCEPTION
        WHEN OTHERS THEN
          -- Bu malzeme için hata olsa bile diğer malzemeler için devam et
          RAISE WARNING 'Malzeme tüketim hatası (%s - %s): % - Context: %', 
            v_bom_record.material_type, 
            COALESCE(v_material_name, v_bom_record.material_id::TEXT),
            SQLERRM, 
            v_error_context;
          CONTINUE;
      END;
    END LOOP;

    RETURN NEW;

  EXCEPTION
    WHEN OTHERS THEN
      -- BOM bulunamadı veya başka bir hata
      RAISE WARNING 'consume_materials_on_production hatası: % - Context: %', SQLERRM, v_error_context;
      -- Hata durumunda da NEW'i döndür (log kaydı olsun)
      RETURN NEW;
  END;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. TRIGGER'LARI OLUŞTUR
-- ============================================

-- Nihai ürün stok güncellemesi için trigger
CREATE TRIGGER trigger_update_stock_on_production
AFTER INSERT ON production_logs
FOR EACH ROW
EXECUTE FUNCTION update_stock_on_production();

-- Malzeme tüketimi için trigger
CREATE TRIGGER trigger_consume_materials_on_production
AFTER INSERT ON production_logs
FOR EACH ROW
EXECUTE FUNCTION consume_materials_on_production();

-- ============================================
-- 4. DOĞRULAMA SORGULARI
-- ============================================

-- Trigger'ların varlığını kontrol et
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

  RAISE NOTICE '✅ Tüm triggerlar başarıyla oluşturuldu!';
END $$;

-- ============================================
-- 5. TEST NOTLARI
-- ============================================

COMMENT ON FUNCTION update_stock_on_production() IS 
'Production log eklendiğinde nihai ürün stokunu artırır ve stok hareketi kaydeder. Hata durumunda uyarı verir ama log kaydını engellemez.';

COMMENT ON FUNCTION consume_materials_on_production() IS 
'Production log eklendiğinde BOM snapshottan malzemeleri tüketir ve stok hareketleri kaydeder. Her malzeme için ayrı hata yakalama yapar.';

