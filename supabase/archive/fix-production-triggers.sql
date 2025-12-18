-- =====================================================
-- PHASE 0: Database Trigger Düzeltmeleri
-- =====================================================

-- 1. Mevcut hatalı consume_materials_on_production trigger'ını düzelt
-- Sorun: BOM tablosunu kullanıyor, production_plan_bom_snapshot yerine!

DROP TRIGGER IF EXISTS trigger_consume_materials ON production_logs;

CREATE OR REPLACE FUNCTION consume_materials_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_planned_qty NUMERIC;
BEGIN
  -- Production plan'ın planned_quantity'sini al
  SELECT planned_quantity INTO v_planned_qty
  FROM production_plans WHERE id = NEW.plan_id;
  
  -- BOM SNAPSHOT'tan malzemeleri al (BOM tablosu değil!)
  FOR v_bom_record IN
    SELECT material_type, material_id, material_code, material_name, quantity_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = NEW.plan_id
  LOOP
    -- Birim başına tüketim hesapla
    DECLARE
      v_consumption NUMERIC := (v_bom_record.quantity_needed / v_planned_qty) * NEW.quantity_produced;
    BEGIN
      IF v_bom_record.material_type = 'raw' THEN
        -- Hammadde stok azalt
        UPDATE raw_materials
        SET quantity = quantity - v_consumption
        WHERE id = v_bom_record.material_id;
        
        -- Stock movement kaydet (production_log_id ile)
        INSERT INTO stock_movements (
          material_type, 
          material_id, 
          movement_type, 
          quantity, 
          user_id, 
          description, 
          production_log_id
        )
        VALUES (
          'raw', 
          v_bom_record.material_id, 
          'uretim', 
          -v_consumption, 
          NEW.operator_id, 
          format('Üretim tüketimi: %s adet %s için', NEW.quantity_produced, 
            (SELECT fp.name FROM production_plans pp 
             JOIN finished_products fp ON pp.product_id = fp.id 
             WHERE pp.id = NEW.plan_id)),
          NEW.id
        );
                
      ELSIF v_bom_record.material_type = 'semi' THEN
        -- Yarı mamul stok azalt
        UPDATE semi_finished_products
        SET quantity = quantity - v_consumption
        WHERE id = v_bom_record.material_id;
        
        -- Stock movement kaydet (production_log_id ile)
        INSERT INTO stock_movements (
          material_type, 
          material_id, 
          movement_type, 
          quantity, 
          user_id, 
          description, 
          production_log_id
        )
        VALUES (
          'semi', 
          v_bom_record.material_id, 
          'uretim', 
          -v_consumption, 
          NEW.operator_id,
          format('Üretim tüketimi: %s adet için', NEW.quantity_produced),
          NEW.id
        );
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER trigger_consume_materials
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION consume_materials_on_production();

-- =====================================================
-- 2. Stock Movements Tablosu Güncelle
-- =====================================================

-- production_log_id kolonu ekle
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS production_log_id UUID REFERENCES production_logs(id);

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_stock_movements_production_log 
ON stock_movements(production_log_id);

-- =====================================================
-- 3. Notifications Tablosu Güncelle
-- =====================================================

-- target_roles kolonu ekle (rol bazlı bildirim için)
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS target_roles TEXT[];

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_notifications_target_roles 
ON notifications USING GIN(target_roles);

-- Eski user_id'ye dayalı bildirimleri koru, yeni target_roles ekle
-- user_id NULL ise target_roles kullanılacak

-- =====================================================
-- 4. Kritik Stok Kontrolü Trigger'ını Düzelt
-- =====================================================

-- Mevcut check_critical_stock() function'ını güncelle
CREATE OR REPLACE FUNCTION check_critical_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_material_name TEXT;
  v_material_code TEXT;
  v_critical_level NUMERIC;
  v_current_quantity NUMERIC;
  v_material_type TEXT;
BEGIN
  -- Malzeme bilgilerini al
  IF TG_TABLE_NAME = 'raw_materials' THEN
    v_material_type := 'raw';
    SELECT name, code, critical_level, quantity 
    INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM raw_materials WHERE id = NEW.id;
  ELSIF TG_TABLE_NAME = 'semi_finished_products' THEN
    v_material_type := 'semi';
    SELECT name, code, critical_level, quantity 
    INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM semi_finished_products WHERE id = NEW.id;
  ELSIF TG_TABLE_NAME = 'finished_products' THEN
    v_material_type := 'finished';
    SELECT name, code, critical_level, quantity 
    INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM finished_products WHERE id = NEW.id;
  END IF;

  -- Kritik seviyenin altındaysa bildirim oluştur (target_roles ile)
  IF v_current_quantity <= v_critical_level  THEN
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE material_id = NEW.id 
        AND type = 'critical_stock' 
        AND is_read = FALSE
    ) THEN
      INSERT INTO notifications (
        type, 
        title, 
        message, 
        material_type, 
        material_id, 
        severity, 
        target_roles
      )
      VALUES (
        'critical_stock',
        'Kritik Stok Seviyesi',
        format('Malzeme: %s (%s) - Mevcut: %s - Kritik Seviye: %s', 
          v_material_name, v_material_code, v_current_quantity, v_critical_level),
        v_material_type,
        NEW.id,
        'high',
        ARRAY['planlama', 'yonetici']  -- Rol bazlı bildirim
      );
    END IF;
  ELSE
    -- Stok kritik seviyenin üzerine çıktıysa bildirimleri kapat
    UPDATE notifications
    SET is_read = TRUE
    WHERE material_id = NEW.id 
      AND type = 'critical_stock' 
      AND is_read = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Production Plan BOM Snapshot Trigger Kontrolü
-- =====================================================

-- Function oluştur (varsa değiştir)
CREATE OR REPLACE FUNCTION create_bom_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO production_plan_bom_snapshot (
    plan_id, 
    material_type, 
    material_id, 
    material_code, 
    material_name, 
    quantity_needed
  )
  SELECT 
    NEW.id,
    bom.material_type,
    bom.material_id,
    CASE 
      WHEN bom.material_type = 'raw' THEN rm.code
      ELSE sfp.code
    END,
    CASE 
      WHEN bom.material_type = 'raw' THEN rm.name
      ELSE sfp.name
    END,
    bom.quantity_needed * NEW.planned_quantity
  FROM bom
  LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
  LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
  WHERE bom.finished_product_id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mevcut trigger'ı sil ve yeniden oluştur
DROP TRIGGER IF EXISTS trigger_create_bom_snapshot ON production_plans;

CREATE TRIGGER trigger_create_bom_snapshot
AFTER INSERT ON production_plans
FOR EACH ROW EXECUTE FUNCTION create_bom_snapshot();

-- =====================================================
-- Migration Tamamlandı
-- =====================================================

-- Test için bir production plan oluşturup BOM snapshot'ının çalışıp çalışmadığını kontrol et
-- Bu kısım test amaçlı, production'da çalıştırılmayabilir

-- SELECT 'Database trigger fixes completed successfully' as status;
