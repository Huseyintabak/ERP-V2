-- ==============================================
-- ThunderV2 Production-Ready Migration
-- Tüm iş kritik özellikler için tek migration dosyası
-- ==============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================
-- CLEANUP - Mevcut policy'leri ve tabloları temizle
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view warehouse zones" ON warehouse_zones;
DROP POLICY IF EXISTS "Users can insert warehouse zones" ON warehouse_zones;
DROP POLICY IF EXISTS "Users can update warehouse zones" ON warehouse_zones;
DROP POLICY IF EXISTS "Users can delete warehouse zones" ON warehouse_zones;

-- Drop existing tables if they exist (CASCADE to handle dependencies)
DROP TABLE IF EXISTS zone_inventories CASCADE;
DROP TABLE IF EXISTS warehouse_zones CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;

-- Drop existing views if they exist
DROP VIEW IF EXISTS detailed_stock_movements CASCADE;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_check_critical_stock ON stock;
DROP TRIGGER IF EXISTS check_critical_raw ON raw_materials;
DROP TRIGGER IF EXISTS check_critical_semi ON semi_finished_products;

-- Drop existing functions if they exist (CASCADE to handle triggers)
DROP FUNCTION IF EXISTS complete_production(UUID) CASCADE;
DROP FUNCTION IF EXISTS transfer_zone_inventory(UUID, UUID, VARCHAR, UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_critical_stock() CASCADE;

-- ==============================================
-- 1. ÜRETİM-STOK ENTEGRASYONU
-- ==============================================

-- Complete Production Function
CREATE OR REPLACE FUNCTION complete_production(production_plan_id UUID)
RETURNS JSON AS $$
DECLARE
  plan_record RECORD;
  bom_item RECORD;
BEGIN
  SELECT * INTO plan_record FROM production_plans WHERE id = production_plan_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Production plan not found');
  END IF;

  -- BOM'a göre malzemeleri tüket
  FOR bom_item IN 
    SELECT b.*, b.quantity * plan_record.planned_quantity as total_needed
    FROM bom b
    WHERE b.finished_product_id = plan_record.product_id
  LOOP
    IF bom_item.material_type = 'raw' THEN
      UPDATE raw_materials 
      SET quantity = quantity - bom_item.total_needed
      WHERE id = bom_item.material_id;
    ELSIF bom_item.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET quantity = quantity - bom_item.total_needed
      WHERE id = bom_item.material_id;
    END IF;

    INSERT INTO stock_movements (
      material_type, material_id, movement_type, quantity, 
      user_id, description
    ) VALUES (
      bom_item.material_type, bom_item.material_id, 'cikis', 
      bom_item.total_needed, 
      (SELECT id FROM users WHERE role = 'operator' LIMIT 1),
      'Üretim tüketimi: ' || plan_record.order_number
    );
  END LOOP;

  -- Nihai ürünü stoka ekle
  UPDATE finished_products
  SET quantity = quantity + plan_record.produced_quantity
  WHERE id = plan_record.product_id;

  INSERT INTO stock_movements (
    material_type, material_id, movement_type, quantity,
    user_id, description
  ) VALUES (
    'finished', plan_record.product_id, 'giris',
    plan_record.produced_quantity,
    (SELECT id FROM users WHERE role = 'operator' LIMIT 1),
    'Üretim tamamlandı: ' || plan_record.order_number
  );

  UPDATE production_plans
  SET status = 'tamamlandi', completed_at = NOW()
  WHERE id = production_plan_id;

  INSERT INTO notifications (type, title, message, severity)
  VALUES (
    'order_update',
    'Üretim Tamamlandı',
    'Sipariş ' || plan_record.order_number || ' üretimi tamamlandı.',
    'low'
  );

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 2. WAREHOUSE ZONE MANAGEMENT
-- ==============================================

-- Warehouse Zones Table
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  zone_type VARCHAR(20) DEFAULT 'customer',
  customer_id UUID REFERENCES customers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zone Inventory Table
CREATE TABLE IF NOT EXISTS zone_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_id UUID REFERENCES warehouse_zones(id) ON DELETE CASCADE,
  product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  UNIQUE(zone_id, product_id)
);

-- Zone Transfers Table
CREATE TABLE IF NOT EXISTS zone_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_zone_id UUID REFERENCES warehouse_zones(id),
  to_zone_id UUID REFERENCES warehouse_zones(id),
  product_id UUID REFERENCES finished_products(id),
  quantity INTEGER,
  transfer_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Insert Merkez Zone
INSERT INTO warehouse_zones (name, zone_type)
VALUES ('Merkez Depo', 'center')
ON CONFLICT (name) DO NOTHING;

-- Auto-assign zone to customers function
CREATE OR REPLACE FUNCTION assign_zone_to_customer()
RETURNS TRIGGER AS $$
DECLARE
  zone_count INTEGER;
  new_zone_name VARCHAR(100);
BEGIN
  SELECT COUNT(*) INTO zone_count FROM warehouse_zones WHERE zone_type = 'customer';
  new_zone_name := 'ZONE-' || CHR(65 + zone_count);
  
  INSERT INTO warehouse_zones (name, zone_type, customer_id)
  VALUES (new_zone_name, 'customer', NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-assigning zones
DROP TRIGGER IF EXISTS trigger_assign_zone ON customers;
CREATE TRIGGER trigger_assign_zone
AFTER INSERT ON customers
FOR EACH ROW EXECUTE FUNCTION assign_zone_to_customer();

-- Transfer between zones function
CREATE OR REPLACE FUNCTION transfer_between_zones(
  from_zone UUID, to_zone UUID, product UUID, qty INTEGER, user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  -- Check if source zone has enough quantity
  SELECT quantity INTO current_qty 
  FROM zone_inventory 
  WHERE zone_id = from_zone AND product_id = product;
  
  IF current_qty IS NULL OR current_qty < qty THEN
    RETURN json_build_object('success', false, 'error', 'Yetersiz stok');
  END IF;

  -- Update source zone
  UPDATE zone_inventory
  SET quantity = quantity - qty
  WHERE zone_id = from_zone AND product_id = product;

  -- Insert or update destination zone
  INSERT INTO zone_inventory (zone_id, product_id, quantity)
  VALUES (to_zone, product, qty)
  ON CONFLICT (zone_id, product_id)
  DO UPDATE SET quantity = zone_inventory.quantity + EXCLUDED.quantity;

  -- Record transfer
  INSERT INTO zone_transfers (from_zone_id, to_zone_id, product_id, quantity, created_by)
  VALUES (from_zone, to_zone, product, qty, user_id);

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- 3. KRİTİK STOK & OTOMATİK SİPARİŞ SİSTEMİ
-- ==============================================

-- Purchase Requests Table
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_type VARCHAR(20) NOT NULL,
  material_id UUID NOT NULL,
  material_name VARCHAR(255),
  current_stock INTEGER,
  requested_quantity INTEGER,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(10) DEFAULT 'normal',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Critical Stock Check Function
CREATE OR REPLACE FUNCTION check_critical_stock()
RETURNS TRIGGER AS $$
DECLARE
  material_name_val VARCHAR(255);
BEGIN
  -- Get material name based on table
  IF TG_TABLE_NAME = 'raw_materials' THEN
    material_name_val := NEW.name;
  ELSIF TG_TABLE_NAME = 'semi_finished_products' THEN
    material_name_val := NEW.name;
  END IF;

  -- Check if stock dropped to critical level
  IF NEW.quantity <= NEW.critical_level AND OLD.quantity > NEW.critical_level THEN
    -- Create notification
    INSERT INTO notifications (type, title, message, severity)
    VALUES (
      'critical_stock',
      'KRİTİK STOK',
      material_name_val || ' stok kritik seviyede!',
      'critical'
    );

    -- Create purchase request
    INSERT INTO purchase_requests (
      material_type, 
      material_id, 
      material_name,
      current_stock, 
      requested_quantity, 
      priority
    ) VALUES (
      CASE TG_TABLE_NAME 
        WHEN 'raw_materials' THEN 'raw' 
        ELSE 'semi' 
      END,
      NEW.id,
      material_name_val,
      NEW.quantity,
      GREATEST(NEW.critical_level * 3, 100), -- Min 100 units
      'critical'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for critical stock monitoring
DROP TRIGGER IF EXISTS check_critical_raw ON raw_materials;
CREATE TRIGGER check_critical_raw
AFTER UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();

DROP TRIGGER IF EXISTS check_critical_semi ON semi_finished_products;
CREATE TRIGGER check_critical_semi
AFTER UPDATE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();

-- ==============================================
-- 4. STOCK MOVEMENTS ENHANCED
-- ==============================================

-- Add new columns to stock_movements (user_id already exists)
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS movement_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS before_quantity INTEGER,
ADD COLUMN IF NOT EXISTS after_quantity INTEGER;

-- Enhanced Stock Movements View
CREATE OR REPLACE VIEW stock_movements_detailed AS
SELECT 
  sm.*,
  CASE sm.material_type
    WHEN 'raw' THEN rm.name
    WHEN 'semi' THEN sfp.name
    WHEN 'finished' THEN fp.name
  END as material_name,
  CASE sm.material_type
    WHEN 'raw' THEN rm.code
    WHEN 'semi' THEN sfp.code
    WHEN 'finished' THEN fp.code
  END as material_code,
  u.name as user_name,
  u.email as user_email
FROM stock_movements sm
LEFT JOIN raw_materials rm ON sm.material_type = 'raw' AND sm.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON sm.material_type = 'semi' AND sm.material_id = sfp.id
LEFT JOIN finished_products fp ON sm.material_type = 'finished' AND sm.material_id = fp.id
LEFT JOIN users u ON sm.user_id = u.id;

-- ==============================================
-- 5. ENHANCED PRODUCTION PLANS
-- ==============================================

-- Add completed_at column if not exists
ALTER TABLE production_plans 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ==============================================
-- 6. RLS (Row Level Security) POLICIES
-- ==============================================

-- Enable RLS on new tables
ALTER TABLE warehouse_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

-- Warehouse Zones Policies
CREATE POLICY "Users can view warehouse zones" ON warehouse_zones
FOR SELECT USING (true);

CREATE POLICY "Yönetici and Depo can manage warehouse zones" ON warehouse_zones
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = current_setting('app.current_user_id', true)::UUID
    AND users.role IN ('yonetici', 'depo')
  )
);

-- Zone Inventory Policies
CREATE POLICY "Users can view zone inventory" ON zone_inventory
FOR SELECT USING (true);

CREATE POLICY "Depo can manage zone inventory" ON zone_inventory
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('depo', 'yonetici')
  )
);

-- Zone Transfers Policies
CREATE POLICY "Users can view zone transfers" ON zone_transfers
FOR SELECT USING (true);

CREATE POLICY "Depo can create zone transfers" ON zone_transfers
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('depo', 'yonetici')
  )
);

-- Purchase Requests Policies
CREATE POLICY "Users can view purchase requests" ON purchase_requests
FOR SELECT USING (true);

CREATE POLICY "Yönetici can manage purchase requests" ON purchase_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'yonetici'
  )
);

-- ==============================================
-- 7. INDEXES FOR PERFORMANCE
-- ==============================================

-- Warehouse zones indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_customer ON warehouse_zones(customer_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_zones_type ON warehouse_zones(zone_type);

-- Zone inventory indexes
CREATE INDEX IF NOT EXISTS idx_zone_inventory_zone ON zone_inventory(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_inventory_product ON zone_inventory(product_id);

-- Zone transfers indexes
CREATE INDEX IF NOT EXISTS idx_zone_transfers_from ON zone_transfers(from_zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_transfers_to ON zone_transfers(to_zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_transfers_date ON zone_transfers(transfer_date);

-- Purchase requests indexes
CREATE INDEX IF NOT EXISTS idx_purchase_requests_material ON purchase_requests(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_priority ON purchase_requests(priority);

-- Stock movements indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_type ON stock_movements(movement_type);

-- ==============================================
-- MIGRATION COMPLETED
-- ==============================================

-- Log migration completion
INSERT INTO notifications (type, title, message, severity)
VALUES (
  'order_update',
  'Migration Tamamlandı',
  'Production-ready migration başarıyla uygulandı.',
  'low'
);

-- Return success message
SELECT 'Production-Ready Migration completed successfully!' as message;
