-- ==============================================
-- ThunderV2 Production-Ready Migration - SAFE VERSION
-- Tüm iş kritik özellikler için tek migration dosyası
-- ==============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- 1. ÜRETİM-STOK ENTEGRASYONU
-- ==============================================

-- Complete Production Function
CREATE OR REPLACE FUNCTION complete_production(production_plan_id UUID)
RETURNS JSON AS $$
DECLARE
  plan_record RECORD;
  bom_item RECORD;
  order_record RECORD;
BEGIN
  -- Get production plan with order details
  SELECT pp.*, o.order_number
  INTO plan_record
  FROM production_plans pp
  JOIN orders o ON pp.order_id = o.id
  WHERE pp.id = production_plan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Production plan not found');
  END IF;

  -- BOM'a göre malzemeleri tüket
  FOR bom_item IN 
    SELECT b.*, b.quantity_needed * plan_record.produced_quantity AS total_needed
    FROM bom b
    WHERE b.finished_product_id = plan_record.product_id
  LOOP
    -- Stoktan düş (material_type'a göre ilgili tabloyu güncelle)
    IF bom_item.material_type = 'raw' THEN
      UPDATE raw_materials
      SET quantity = quantity - bom_item.total_needed
      WHERE id = bom_item.material_id;
    ELSIF bom_item.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET quantity = quantity - bom_item.total_needed
      WHERE id = bom_item.material_id;
    END IF;

    -- Stok hareketi kaydet
    INSERT INTO stock_movements (
      material_type, material_id, movement_type, quantity, 
      user_id, description
    ) VALUES (
      bom_item.material_type, bom_item.material_id, 'cikis', 
      bom_item.total_needed, 
      plan_record.assigned_operator_id, -- Assign operator ID
      'Üretim tüketimi: ' || plan_record.order_number
    );
  END LOOP;

  -- Nihai ürünü stoka ekle
  UPDATE finished_products
  SET quantity = quantity + plan_record.produced_quantity
  WHERE id = plan_record.product_id;

  -- Stok hareketi kaydet
  INSERT INTO stock_movements (
    material_type, material_id, movement_type, quantity,
    user_id, description
  ) VALUES (
    'finished', plan_record.product_id, 'giris',
    plan_record.produced_quantity,
    plan_record.assigned_operator_id, -- Assign operator ID
    'Üretim tamamlandı: ' || plan_record.order_number
  );

  -- Üretim planını tamamlandı olarak işaretle
  UPDATE production_plans
  SET status = 'tamamlandi', completed_at = NOW()
  WHERE id = production_plan_id;

  -- Bildirim oluştur
  INSERT INTO notifications (type, title, message, severity)
  VALUES (
    'order_update',
    'Üretim Tamamlandı',
    'Sipariş ' || plan_record.order_number || ' üretimi tamamlandı.',
    'low'
  );

  RETURN json_build_object('success', true, 'message', 'Production completed successfully');
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 2. WAREHOUSE ZONES
-- ==============================================

-- Table: warehouse_zones
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: zone_inventories (many-to-many for stock in zones)
CREATE TABLE IF NOT EXISTS zone_inventories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES warehouse_zones(id) ON DELETE CASCADE,
  material_type VARCHAR(50) NOT NULL, -- 'raw', 'semi_finished', 'finished'
  material_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (zone_id, material_type, material_id)
);

-- Function to transfer inventory between zones
CREATE OR REPLACE FUNCTION transfer_zone_inventory(
  p_from_zone_id UUID,
  p_to_zone_id UUID,
  p_material_type VARCHAR(50),
  p_material_id UUID,
  p_quantity INTEGER
)
RETURNS JSON AS $$
DECLARE
  from_qty INTEGER;
  to_qty INTEGER;
BEGIN
  -- Check if from_zone has enough quantity
  SELECT quantity INTO from_qty
  FROM zone_inventories
  WHERE zone_id = p_from_zone_id
    AND material_type = p_material_type
    AND material_id = p_material_id;

  IF from_qty IS NULL OR from_qty < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient stock in source zone');
  END IF;

  -- Deduct from source zone
  UPDATE zone_inventories
  SET quantity = quantity - p_quantity
  WHERE zone_id = p_from_zone_id
    AND material_type = p_material_type
    AND material_id = p_material_id;

  -- Add to destination zone
  INSERT INTO zone_inventories (zone_id, material_type, material_id, quantity)
  VALUES (p_to_zone_id, p_material_type, p_material_id, p_quantity)
  ON CONFLICT (zone_id, material_type, material_id) DO UPDATE
  SET quantity = zone_inventories.quantity + p_quantity;

  RETURN json_build_object('success', true, 'message', 'Inventory transferred successfully');
END;
$$ LANGUAGE plpgsql;

-- RLS for warehouse_zones
ALTER TABLE warehouse_zones ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for admins" ON warehouse_zones;
DROP POLICY IF EXISTS "Allow read for depo" ON warehouse_zones;

CREATE POLICY "Allow all for admins" ON warehouse_zones
FOR ALL USING (auth.role() = 'yonetici') WITH CHECK (auth.role() = 'yonetici');
CREATE POLICY "Allow read for depo" ON warehouse_zones
FOR SELECT USING (auth.role() = 'depo');

-- RLS for zone_inventories
ALTER TABLE zone_inventories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for admins" ON zone_inventories;
DROP POLICY IF EXISTS "Allow read for depo" ON zone_inventories;
DROP POLICY IF EXISTS "Allow insert/update for depo" ON zone_inventories;
DROP POLICY IF EXISTS "Allow update for depo" ON zone_inventories;

CREATE POLICY "Allow all for admins" ON zone_inventories
FOR ALL USING (auth.role() = 'yonetici') WITH CHECK (auth.role() = 'yonetici');
CREATE POLICY "Allow read for depo" ON zone_inventories
FOR SELECT USING (auth.role() = 'depo');
CREATE POLICY "Allow insert/update for depo" ON zone_inventories
FOR INSERT WITH CHECK (auth.role() = 'depo');
CREATE POLICY "Allow update for depo" ON zone_inventories
FOR UPDATE USING (auth.role() = 'depo');

-- ==============================================
-- 3. KRİTİK STOK SİSTEMİ
-- ==============================================

-- Table: purchase_requests
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_type VARCHAR(50) NOT NULL, -- 'raw', 'semi_finished', 'finished'
  material_id UUID NOT NULL,
  requested_quantity INTEGER NOT NULL CHECK (requested_quantity > 0),
  status VARCHAR(50) NOT NULL DEFAULT 'beklemede', -- 'beklemede', 'onaylandi', 'reddedildi', 'tamamlandi'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (material_type, material_id, status) -- Only one pending request per material
);

-- Trigger function for critical stock (for raw_materials)
CREATE OR REPLACE FUNCTION check_critical_stock_raw()
RETURNS TRIGGER AS $$
DECLARE
  material_name VARCHAR(255);
  material_code VARCHAR(255);
BEGIN
  -- Check if stock fell below critical level
  IF NEW.quantity <= NEW.critical_level AND OLD.quantity > NEW.critical_level THEN
    -- Get material name and code
    material_name := NEW.name;
    material_code := NEW.code;

    -- Check if a pending purchase request already exists
    PERFORM 1 FROM purchase_requests
    WHERE material_type = 'raw' AND material_id = NEW.id AND status = 'beklemede';

    IF NOT FOUND THEN
      -- Create a new purchase request
      INSERT INTO purchase_requests (material_type, material_id, requested_quantity, status)
      VALUES ('raw', NEW.id, NEW.critical_level * 2, 'beklemede');

      -- Send notification
      INSERT INTO notifications (type, title, message, severity)
      VALUES (
        'critical_stock',
        'Kritik Stok Seviyesi!',
        material_name || ' (' || material_code || ') hammaddesi kritik stok seviyesinin altına düştü. Satın alma talebi oluşturuldu.',
        'high'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for critical stock (for semi_finished_products)
CREATE OR REPLACE FUNCTION check_critical_stock_semi()
RETURNS TRIGGER AS $$
DECLARE
  material_name VARCHAR(255);
  material_code VARCHAR(255);
BEGIN
  -- Check if stock fell below critical level
  IF NEW.quantity <= NEW.critical_level AND OLD.quantity > NEW.critical_level THEN
    -- Get material name and code
    material_name := NEW.name;
    material_code := NEW.code;

    -- Check if a pending purchase request already exists
    PERFORM 1 FROM purchase_requests
    WHERE material_type = 'semi_finished' AND material_id = NEW.id AND status = 'beklemede';

    IF NOT FOUND THEN
      -- Create a new purchase request
      INSERT INTO purchase_requests (material_type, material_id, requested_quantity, status)
      VALUES ('semi_finished', NEW.id, NEW.critical_level * 2, 'beklemede');

      -- Send notification
      INSERT INTO notifications (type, title, message, severity)
      VALUES (
        'critical_stock',
        'Kritik Stok Seviyesi!',
        material_name || ' (' || material_code || ') yarı mamülü kritik stok seviyesinin altına düştü. Satın alma talebi oluşturuldu.',
        'high'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger function for critical stock (for finished_products)
CREATE OR REPLACE FUNCTION check_critical_stock_finished()
RETURNS TRIGGER AS $$
DECLARE
  material_name VARCHAR(255);
  material_code VARCHAR(255);
BEGIN
  -- Check if stock fell below critical level
  IF NEW.quantity <= NEW.critical_level AND OLD.quantity > NEW.critical_level THEN
    -- Get material name and code
    material_name := NEW.name;
    material_code := NEW.code;

    -- Check if a pending purchase request already exists
    PERFORM 1 FROM purchase_requests
    WHERE material_type = 'finished' AND material_id = NEW.id AND status = 'beklemede';

    IF NOT FOUND THEN
      -- Create a new purchase request
      INSERT INTO purchase_requests (material_type, material_id, requested_quantity, status)
      VALUES ('finished', NEW.id, NEW.critical_level * 2, 'beklemede');

      -- Send notification
      INSERT INTO notifications (type, title, message, severity)
      VALUES (
        'critical_stock',
        'Kritik Stok Seviyesi!',
        material_name || ' (' || material_code || ') nihai ürünü kritik stok seviyesinin altına düştü. Satın alma talebi oluşturuldu.',
        'high'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each material type
DROP TRIGGER IF EXISTS trg_check_critical_stock_raw ON raw_materials;
CREATE TRIGGER trg_check_critical_stock_raw
AFTER UPDATE OF quantity ON raw_materials
FOR EACH ROW
EXECUTE FUNCTION check_critical_stock_raw();

DROP TRIGGER IF EXISTS trg_check_critical_stock_semi ON semi_finished_products;
CREATE TRIGGER trg_check_critical_stock_semi
AFTER UPDATE OF quantity ON semi_finished_products
FOR EACH ROW
EXECUTE FUNCTION check_critical_stock_semi();

DROP TRIGGER IF EXISTS trg_check_critical_stock_finished ON finished_products;
CREATE TRIGGER trg_check_critical_stock_finished
AFTER UPDATE OF quantity ON finished_products
FOR EACH ROW
EXECUTE FUNCTION check_critical_stock_finished();

-- RLS for purchase_requests
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all for admins" ON purchase_requests;
DROP POLICY IF EXISTS "Allow read for planlama/depo" ON purchase_requests;
DROP POLICY IF EXISTS "Allow update for planlama" ON purchase_requests;

CREATE POLICY "Allow all for admins" ON purchase_requests
FOR ALL USING (auth.role() = 'yonetici') WITH CHECK (auth.role() = 'yonetici');
CREATE POLICY "Allow read for planlama/depo" ON purchase_requests
FOR SELECT USING (auth.role() IN ('planlama', 'depo'));
CREATE POLICY "Allow update for planlama" ON purchase_requests
FOR UPDATE USING (auth.role() = 'planlama') WITH CHECK (auth.role() = 'planlama');

-- ==============================================
-- 4. STOCK MOVEMENTS ENHANCED
-- ==============================================

-- Add new columns to stock_movements (user_id already exists)
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS movement_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS before_quantity INTEGER,
ADD COLUMN IF NOT EXISTS after_quantity INTEGER;

-- Create a detailed view for stock movements
DROP VIEW IF EXISTS detailed_stock_movements CASCADE;
CREATE OR REPLACE VIEW detailed_stock_movements AS
SELECT
  sm.id,
  sm.material_type,
  sm.material_id,
  CASE
    WHEN sm.material_type = 'raw' THEN rm.name
    WHEN sm.material_type = 'semi_finished' THEN sf.name
    WHEN sm.material_type = 'finished' THEN fn.name
    ELSE 'Bilinmeyen Ürün'
  END AS material_name,
  CASE
    WHEN sm.material_type = 'raw' THEN rm.code
    WHEN sm.material_type = 'semi_finished' THEN sf.code
    WHEN sm.material_type = 'finished' THEN fn.code
    ELSE 'Bilinmeyen Kod'
  END AS material_code,
  sm.movement_type,
  sm.quantity,
  sm.user_id,
  u.name AS user_name,
  sm.description,
  sm.movement_source,
  sm.before_quantity,
  sm.after_quantity,
  sm.created_at
FROM stock_movements sm
LEFT JOIN raw_materials rm ON sm.material_id = rm.id AND sm.material_type = 'raw'
LEFT JOIN semi_finished_products sf ON sm.material_id = sf.id AND sm.material_type = 'semi_finished'
LEFT JOIN finished_products fn ON sm.material_id = fn.id AND sm.material_type = 'finished'
LEFT JOIN users u ON sm.user_id = u.id
ORDER BY sm.created_at DESC;

-- ==============================================
-- 5. PERFORMANS İNDEKSLEME
-- ==============================================

-- Existing indexes (from previous plan, ensure they exist)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_products_code ON finished_products(code);
CREATE INDEX IF NOT EXISTS idx_raw_materials_code ON raw_materials(code);
CREATE INDEX IF NOT EXISTS idx_semi_finished_products_code ON semi_finished_products(code);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_production_plans_status ON production_plans(status);
CREATE INDEX IF NOT EXISTS idx_production_plans_operator ON production_plans(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_bom_product ON bom(finished_product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- New indexes for new tables/views
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_customer ON warehouse_zones(customer_id);
CREATE INDEX IF NOT EXISTS idx_zone_inventories_zone ON zone_inventories(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_inventories_material ON zone_inventories(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_material ON purchase_requests(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);

-- Log migration completion
INSERT INTO notifications (type, title, message, severity)
VALUES (
  'order_update',
  'Migration Tamamlandı',
  'Production-ready migration başarıyla uygulandı.',
  'low'
);
