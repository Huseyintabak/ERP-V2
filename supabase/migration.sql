-- ============================================
-- Thunder ERP v2 - Database Migration
-- ============================================
-- Sırayla çalıştırın! (Tek seferde tümünü de çalıştırabilirsiniz)
-- ============================================

-- ============================================
-- 1. TABLOLAR
-- ============================================

-- 1.1 Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('yonetici', 'planlama', 'depo', 'operator')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- 1.2 Raw Materials
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity NUMERIC(12, 2) DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (reserved_quantity >= 0),
  critical_level NUMERIC(12, 2) DEFAULT 10 CHECK (critical_level >= 0),
  unit TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_materials_code ON raw_materials(code);
CREATE INDEX idx_raw_materials_barcode ON raw_materials(barcode) WHERE barcode IS NOT NULL;

-- 1.3 Semi-Finished Products
CREATE TABLE semi_finished_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity NUMERIC(12, 2) DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (reserved_quantity >= 0),
  critical_level NUMERIC(12, 2) DEFAULT 5 CHECK (critical_level >= 0),
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_semi_finished_code ON semi_finished_products(code);
CREATE INDEX idx_semi_finished_barcode ON semi_finished_products(barcode) WHERE barcode IS NOT NULL;

-- 1.4 Finished Products
CREATE TABLE finished_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity NUMERIC(12, 2) DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (reserved_quantity >= 0),
  critical_level NUMERIC(12, 2) DEFAULT 5 CHECK (critical_level >= 0),
  unit TEXT NOT NULL,
  sale_price NUMERIC(12, 2) NOT NULL CHECK (sale_price >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finished_code ON finished_products(code);
CREATE INDEX idx_finished_barcode ON finished_products(barcode) WHERE barcode IS NOT NULL;

-- 1.5 Price History
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_material ON price_history(material_type, material_id);
CREATE INDEX idx_price_history_date ON price_history(effective_date);

-- 1.6 BOM (Bill of Materials)
CREATE TABLE bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  quantity_needed NUMERIC(12, 2) NOT NULL CHECK (quantity_needed > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(finished_product_id, material_type, material_id)
);

CREATE INDEX idx_bom_product ON bom(finished_product_id);
CREATE INDEX idx_bom_material ON bom(material_type, material_id);

-- 1.6.1 Semi-BOM (Yarımmamül Ürünler için BOM)
CREATE TABLE semi_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semi_product_id UUID NOT NULL REFERENCES semi_finished_products(id) ON DELETE CASCADE,
  material_id UUID NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT DEFAULT 'adet',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semi_product_id, material_id, material_type)
);

CREATE INDEX idx_semi_bom_semi_product_id ON semi_bom(semi_product_id);
CREATE INDEX idx_semi_bom_material_id ON semi_bom(material_id);
CREATE INDEX idx_semi_bom_material_type ON semi_bom(material_type);

-- Updated_at trigger for semi_bom
CREATE OR REPLACE FUNCTION update_semi_bom_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER semi_bom_updated_at_trigger
    BEFORE UPDATE ON semi_bom
    FOR EACH ROW
    EXECUTE FUNCTION update_semi_bom_updated_at();

-- 1.7 Orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('dusuk', 'orta', 'yuksek')),
  status TEXT NOT NULL DEFAULT 'beklemede' CHECK (status IN ('beklemede', 'uretimde', 'tamamlandi')),
  assigned_operator_id UUID REFERENCES operators(id),
  total_quantity NUMERIC(12, 2) DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7.1 Order Items (Multiple products per order)
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES finished_products(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_operator ON orders(assigned_operator_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- 1.8 Production Plans
CREATE TABLE production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES finished_products(id),
  planned_quantity NUMERIC(12, 2) NOT NULL CHECK (planned_quantity > 0),
  produced_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (produced_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'planlandi' CHECK (status IN ('planlandi', 'devam_ediyor', 'duraklatildi', 'tamamlandi', 'iptal_edildi')),
  assigned_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_production_plans_order ON production_plans(order_id);
CREATE INDEX idx_production_plans_status ON production_plans(status);
CREATE INDEX idx_production_plans_operator ON production_plans(assigned_operator_id);

-- 1.9 Operators
CREATE TABLE operators (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  series TEXT NOT NULL CHECK (series IN ('thunder', 'thunder_pro')),
  experience_years INTEGER DEFAULT 0 CHECK (experience_years >= 0),
  daily_capacity NUMERIC(8, 2) NOT NULL CHECK (daily_capacity > 0),
  location TEXT NOT NULL,
  hourly_rate NUMERIC(8, 2) NOT NULL CHECK (hourly_rate > 0),
  active_productions_count INTEGER DEFAULT 0 CHECK (active_productions_count >= 0)
);

CREATE INDEX idx_operators_series ON operators(series);

-- 1.10 Production Logs
CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES users(id),
  barcode_scanned TEXT NOT NULL,
  quantity_produced NUMERIC(12, 2) NOT NULL CHECK (quantity_produced > 0),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_production_logs_plan ON production_logs(plan_id);
CREATE INDEX idx_production_logs_operator ON production_logs(operator_id);
CREATE INDEX idx_production_logs_timestamp ON production_logs(timestamp);

-- 1.11 Stock Movements
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('giris', 'cikis', 'uretim', 'sayim')),
  quantity NUMERIC(12, 2) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_material ON stock_movements(material_type, material_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

-- 1.12 Material Reservations
CREATE TABLE material_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  reserved_quantity NUMERIC(12, 2) NOT NULL CHECK (reserved_quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_order ON material_reservations(order_id);
CREATE INDEX idx_reservations_material ON material_reservations(material_type, material_id);

-- 1.13 Production Plan BOM Snapshot
CREATE TABLE production_plan_bom_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  material_code TEXT NOT NULL,
  material_name TEXT NOT NULL,
  quantity_needed NUMERIC(12, 2) NOT NULL CHECK (quantity_needed > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bom_snapshot_plan ON production_plan_bom_snapshot(plan_id);
CREATE INDEX idx_bom_snapshot_material ON production_plan_bom_snapshot(material_type, material_id);

-- 1.14 Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('critical_stock', 'production_delay', 'order_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  material_type TEXT CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_read BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- 1.15 Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- 1.16 System Settings
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SEQUENCES
-- ============================================

CREATE SEQUENCE order_number_seq START 1;

-- ============================================
-- 3. FUNCTIONS
-- ============================================

-- 3.1 Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.2 Log Price Change
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.unit_price IS DISTINCT FROM NEW.unit_price) OR
     (TG_OP = 'UPDATE' AND OLD.unit_cost IS DISTINCT FROM NEW.unit_cost) THEN
    INSERT INTO price_history (material_type, material_id, price, effective_date)
    VALUES (
      CASE WHEN TG_TABLE_NAME = 'raw_materials' THEN 'raw' ELSE 'semi' END,
      NEW.id,
      COALESCE(NEW.unit_price, NEW.unit_cost),
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.3 Update Stock on Production
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

-- 3.4 Consume Materials on Production
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

-- 3.5 Update Operator Active Productions Count
CREATE OR REPLACE FUNCTION update_operator_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assigned_operator_id IS NOT NULL THEN
    UPDATE operators
    SET active_productions_count = active_productions_count + 1
    WHERE id = NEW.assigned_operator_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status NOT IN ('tamamlandi', 'iptal_edildi') 
       AND NEW.status IN ('tamamlandi', 'iptal_edildi') 
       AND NEW.assigned_operator_id IS NOT NULL THEN
      UPDATE operators
      SET active_productions_count = active_productions_count - 1
      WHERE id = NEW.assigned_operator_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.6 Check Critical Stock Level
CREATE OR REPLACE FUNCTION check_critical_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_material_name TEXT;
  v_material_code TEXT;
  v_critical_level NUMERIC;
  v_current_quantity NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'raw_materials' THEN
    SELECT name, code, critical_level, quantity INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM raw_materials WHERE id = NEW.id;
  ELSIF TG_TABLE_NAME = 'semi_finished_products' THEN
    SELECT name, code, critical_level, quantity INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM semi_finished_products WHERE id = NEW.id;
  ELSIF TG_TABLE_NAME = 'finished_products' THEN
    SELECT name, code, critical_level, quantity INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM finished_products WHERE id = NEW.id;
  END IF;

  IF v_current_quantity <= v_critical_level THEN
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE material_id = NEW.id 
        AND type = 'critical_stock' 
        AND is_read = FALSE
    ) THEN
      INSERT INTO notifications (type, title, message, material_type, material_id, severity)
      VALUES (
        'critical_stock',
        'Kritik Stok Seviyesi',
        format('Malzeme: %s (%s) - Mevcut: %s - Kritik Seviye: %s', 
          v_material_name, v_material_code, v_current_quantity, v_critical_level),
        CASE 
          WHEN TG_TABLE_NAME = 'raw_materials' THEN 'raw'
          WHEN TG_TABLE_NAME = 'semi_finished_products' THEN 'semi'
          ELSE 'finished'
        END,
        NEW.id,
        'high'
      );
    END IF;
  ELSE
    UPDATE notifications
    SET is_read = TRUE
    WHERE material_id = NEW.id 
      AND type = 'critical_stock' 
      AND is_read = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.7 Create BOM Snapshot
CREATE OR REPLACE FUNCTION create_bom_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO production_plan_bom_snapshot (
    plan_id, material_type, material_id, material_code, material_name, quantity_needed
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

-- 3.8 Generic Audit Log Trigger
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- User ID'yi context'ten al (yoksa NULL)
  BEGIN
    v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      v_user_id := NULL;
  END;
  
  -- Eğer user_id yoksa (seed data gibi), audit log kaydetme
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- User ID varsa audit log kaydet
  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (v_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, v_old_values);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, v_old_values, v_new_values);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (v_user_id, 'CREATE', TG_TABLE_NAME, NEW.id, v_new_values);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3.9 Generate Order Number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  year TEXT;
  seq_num TEXT;
BEGIN
  SELECT value INTO prefix FROM system_settings WHERE key = 'order_number_prefix';
  IF prefix IS NULL THEN
    prefix := 'ORD';
  END IF;
  
  year := TO_CHAR(NOW(), 'YYYY');
  seq_num := LPAD(nextval('order_number_seq')::TEXT, 3, '0');
  
  RETURN prefix || '-' || year || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

-- 3.10 Set User Context
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, TRUE);
  -- Also set for auth.uid() compatibility
  PERFORM set_config('request.jwt.claims', json_build_object('sub', user_id::TEXT)::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.11 Check Stock Availability
CREATE OR REPLACE FUNCTION check_stock_availability(
  p_product_id UUID,
  p_quantity NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_bom_record RECORD;
  v_needed NUMERIC;
  v_missing_materials JSON[] := ARRAY[]::JSON[];
BEGIN
  FOR v_bom_record IN
    SELECT 
      bom.material_type,
      bom.material_id,
      bom.quantity_needed,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.code
        ELSE sfp.code
      END as material_code,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.name
        ELSE sfp.name
      END as material_name,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.quantity - rm.reserved_quantity
        ELSE sfp.quantity - sfp.reserved_quantity
      END as available_quantity,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.quantity
        ELSE sfp.quantity
      END as total_quantity,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.reserved_quantity
        ELSE sfp.reserved_quantity
      END as reserved_quantity
    FROM bom
    LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
    LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
    WHERE bom.finished_product_id = p_product_id
  LOOP
    v_needed := v_bom_record.quantity_needed * p_quantity;
    
    IF v_bom_record.available_quantity < v_needed THEN
      v_missing_materials := array_append(
        v_missing_materials,
        json_build_object(
          'material_type', v_bom_record.material_type,
          'material_code', v_bom_record.material_code,
          'material_name', v_bom_record.material_name,
          'needed', v_needed,
          'available', v_bom_record.available_quantity,
          'total', v_bom_record.total_quantity,
          'reserved', v_bom_record.reserved_quantity,
          'missing', v_needed - v_bom_record.available_quantity
        )::JSON
      );
    END IF;
  END LOOP;
  
  IF array_length(v_missing_materials, 1) > 0 THEN
    RETURN json_build_object('missing_materials', to_json(v_missing_materials));
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3.12 Create Material Reservations
CREATE OR REPLACE FUNCTION create_material_reservations(
  p_order_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_bom_record RECORD;
  v_needed NUMERIC;
BEGIN
  FOR v_bom_record IN
    SELECT material_type, material_id, quantity_needed
    FROM bom
    WHERE finished_product_id = p_product_id
  LOOP
    v_needed := v_bom_record.quantity_needed * p_quantity;
    
    INSERT INTO material_reservations (order_id, material_type, material_id, reserved_quantity)
    VALUES (p_order_id, v_bom_record.material_type, v_bom_record.material_id, v_needed);
    
    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom_record.material_id;
    ELSIF v_bom_record.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom_record.material_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3.13 Release Reservations on Plan Cancel
CREATE OR REPLACE FUNCTION release_reservations_on_plan_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('iptal_edildi', 'tamamlandi') AND OLD.status NOT IN ('iptal_edildi', 'tamamlandi') THEN
    UPDATE raw_materials rm
    SET reserved_quantity = reserved_quantity - mr.reserved_quantity
    FROM material_reservations mr
    WHERE mr.order_id = NEW.order_id
      AND mr.material_type = 'raw'
      AND mr.material_id = rm.id;
    
    UPDATE semi_finished_products sfp
    SET reserved_quantity = reserved_quantity - mr.reserved_quantity
    FROM material_reservations mr
    WHERE mr.order_id = NEW.order_id
      AND mr.material_type = 'semi'
      AND mr.material_id = sfp.id;
    
    DELETE FROM material_reservations WHERE order_id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3.14 Approve Order Transaction (Updated for new schema)
CREATE OR REPLACE FUNCTION approve_order_transaction(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_order_items RECORD;
  v_plan_id UUID;
  v_missing_materials JSON;
  v_total_missing JSONB := '[]'::JSONB;
  v_item_missing JSON;
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  -- Her order_item için stok kontrolü yap
  FOR v_order_items IN 
    SELECT product_id, quantity 
    FROM order_items 
    WHERE order_id = p_order_id
  LOOP
    -- Her ürün için stok kontrolü
    SELECT check_stock_availability(v_order_items.product_id, v_order_items.quantity) INTO v_item_missing;
    
    -- Eğer bu ürün için stok yoksa, missing listesine ekle
    IF v_item_missing IS NOT NULL THEN
      v_total_missing := v_total_missing || jsonb_build_object(
        'product_id', v_order_items.product_id,
        'quantity', v_order_items.quantity,
        'missing_materials', v_item_missing
      );
    END IF;
  END LOOP;
  
  -- Eğer herhangi bir ürün için stok yoksa
  IF jsonb_array_length(v_total_missing) > 0 THEN
    RETURN json_build_object('success', FALSE, 'missing_materials', v_total_missing);
  END IF;
  
  -- Her order_item için production plan oluştur
  FOR v_order_items IN 
    SELECT product_id, quantity 
    FROM order_items 
    WHERE order_id = p_order_id
  LOOP
    INSERT INTO production_plans (order_id, product_id, planned_quantity, status)
    VALUES (p_order_id, v_order_items.product_id, v_order_items.quantity, 'planlandi')
    RETURNING id INTO v_plan_id;
    
    -- Her ürün için malzeme rezervasyonları oluştur
    PERFORM create_material_reservations(p_order_id, v_order_items.product_id, v_order_items.quantity);
  END LOOP;
  
  -- Sipariş durumunu güncelle
  UPDATE orders SET status = 'uretimde' WHERE id = p_order_id;
  
  RETURN json_build_object('success', TRUE, 'plan_id', v_plan_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 3.15 Bulk Import Raw Materials
CREATE OR REPLACE FUNCTION bulk_import_raw_materials(
  p_materials JSONB,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_material JSONB;
  v_count INTEGER := 0;
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
  LOOP
    INSERT INTO raw_materials (code, name, barcode, quantity, unit, unit_price, critical_level, description)
    VALUES (
      v_material->>'code',
      v_material->>'name',
      v_material->>'barcode',
      (v_material->>'quantity')::NUMERIC,
      v_material->>'unit',
      (v_material->>'unit_price')::NUMERIC,
      COALESCE((v_material->>'critical_level')::NUMERIC, 10),
      v_material->>'description'
    )
    ON CONFLICT (code) DO UPDATE
    SET 
      quantity = EXCLUDED.quantity,
      unit_price = EXCLUDED.unit_price,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 3.16 Bulk Import Semi-Finished
CREATE OR REPLACE FUNCTION bulk_import_semi_finished(
  p_materials JSONB,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_material JSONB;
  v_count INTEGER := 0;
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
  LOOP
    INSERT INTO semi_finished_products (code, name, barcode, quantity, unit, unit_cost, critical_level, description)
    VALUES (
      v_material->>'code',
      v_material->>'name',
      v_material->>'barcode',
      (v_material->>'quantity')::NUMERIC,
      v_material->>'unit',
      (v_material->>'unit_cost')::NUMERIC,
      COALESCE((v_material->>'critical_level')::NUMERIC, 5),
      v_material->>'description'
    )
    ON CONFLICT (code) DO UPDATE
    SET 
      quantity = EXCLUDED.quantity,
      unit_cost = EXCLUDED.unit_cost,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 3.17 Bulk Import Finished Products
CREATE OR REPLACE FUNCTION bulk_import_finished(
  p_materials JSONB,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_material JSONB;
  v_count INTEGER := 0;
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
  LOOP
    INSERT INTO finished_products (code, name, barcode, quantity, unit, sale_price, critical_level, description)
    VALUES (
      v_material->>'code',
      v_material->>'name',
      v_material->>'barcode',
      (v_material->>'quantity')::NUMERIC,
      v_material->>'unit',
      (v_material->>'sale_price')::NUMERIC,
      COALESCE((v_material->>'critical_level')::NUMERIC, 5),
      v_material->>'description'
    )
    ON CONFLICT (code) DO UPDATE
    SET 
      quantity = EXCLUDED.quantity,
      sale_price = EXCLUDED.sale_price,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- 4.1 Updated At Triggers
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_raw_materials_updated_at BEFORE UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_semi_finished_updated_at BEFORE UPDATE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_finished_updated_at BEFORE UPDATE ON finished_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_production_plans_updated_at BEFORE UPDATE ON production_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4.2 Price Change Triggers
CREATE TRIGGER trigger_raw_price_change
AFTER UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION log_price_change();

CREATE TRIGGER trigger_semi_price_change
AFTER UPDATE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION log_price_change();

-- 4.3 Production Triggers
CREATE TRIGGER trigger_production_log_stock
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION update_stock_on_production();

CREATE TRIGGER trigger_consume_materials
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION consume_materials_on_production();

CREATE TRIGGER trigger_operator_count
AFTER INSERT OR UPDATE ON production_plans
FOR EACH ROW EXECUTE FUNCTION update_operator_count();

CREATE TRIGGER trigger_create_bom_snapshot
AFTER INSERT ON production_plans
FOR EACH ROW EXECUTE FUNCTION create_bom_snapshot();

CREATE TRIGGER trigger_release_reservations
AFTER UPDATE ON production_plans
FOR EACH ROW EXECUTE FUNCTION release_reservations_on_plan_cancel();

-- 4.4 Critical Stock Triggers
CREATE TRIGGER trigger_raw_critical_stock
AFTER UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();

CREATE TRIGGER trigger_semi_critical_stock
AFTER UPDATE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();

CREATE TRIGGER trigger_finished_critical_stock
AFTER UPDATE ON finished_products
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();

-- 4.5 Audit Log Triggers
CREATE TRIGGER trigger_audit_raw_materials
AFTER INSERT OR UPDATE OR DELETE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_semi_finished
AFTER INSERT OR UPDATE OR DELETE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_finished
AFTER INSERT OR UPDATE OR DELETE ON finished_products
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_production_plans
AFTER INSERT OR UPDATE OR DELETE ON production_plans
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_bom
AFTER INSERT OR UPDATE OR DELETE ON bom
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- ============================================
-- 5. VIEWS
-- ============================================

CREATE VIEW v_yearly_average_prices AS
SELECT
  material_type,
  material_id,
  AVG(price) as avg_price,
  COUNT(*) as price_change_count
FROM price_history
WHERE effective_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY material_type, material_id;

CREATE VIEW v_stock_values AS
SELECT
  'raw' as material_type,
  SUM(quantity * unit_price) as total_value
FROM raw_materials
UNION ALL
SELECT
  'semi' as material_type,
  SUM(quantity * unit_cost) as total_value
FROM semi_finished_products
UNION ALL
SELECT
  'finished' as material_type,
  SUM(quantity * sale_price) as total_value
FROM finished_products;

CREATE VIEW v_active_production_stats AS
SELECT
  COUNT(*) as total_active_productions,
  COUNT(DISTINCT assigned_operator_id) as active_operators,
  SUM(planned_quantity - produced_quantity) as remaining_quantity
FROM production_plans
WHERE status IN ('planlandi', 'devam_ediyor');

-- ============================================
-- 6. REALTIME ACTIVATION
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE production_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE production_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE raw_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE semi_finished_products;
ALTER PUBLICATION supabase_realtime ADD TABLE finished_products;

-- ============================================
-- Migration Complete!
-- ============================================
-- Şimdi seed.sql dosyasını çalıştırın
-- ============================================

