-- 🔧 COMPREHENSIVE AUDIT LOG FIX: Tüm audit log sorunlarını düzelt
-- Bu dosya tüm audit log trigger'larını ve fonksiyonlarını düzeltir

-- 1. Tüm mevcut audit trigger'ları kaldır
DROP TRIGGER IF EXISTS orders_audit_trigger ON orders;
DROP TRIGGER IF EXISTS users_audit_trigger ON users;
DROP TRIGGER IF EXISTS production_plans_audit_trigger ON production_plans;
DROP TRIGGER IF EXISTS raw_materials_audit_trigger ON raw_materials;
DROP TRIGGER IF EXISTS semi_finished_products_audit_trigger ON semi_finished_products;
DROP TRIGGER IF EXISTS finished_products_audit_trigger ON finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_transfers;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_inventories;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON semi_finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON raw_materials;

-- Migration.sql'deki eski trigger'ları da kaldır
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products;
DROP TRIGGER IF EXISTS trigger_audit_orders ON orders;
DROP TRIGGER IF EXISTS trigger_audit_production_plans ON production_plans;
DROP TRIGGER IF EXISTS trigger_audit_bom ON bom;
DROP TRIGGER IF EXISTS trigger_audit_users ON users;

-- 2. Tüm audit fonksiyonlarını kaldır
DROP FUNCTION IF EXISTS audit_orders_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_users_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_orders_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_production_plans_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_stock_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_stock_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_log_trigger() CASCADE;
DROP FUNCTION IF EXISTS log_audit_event(UUID, VARCHAR, VARCHAR, TEXT, JSONB, JSONB, TEXT, VARCHAR, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS log_audit_event(UUID, VARCHAR(50), VARCHAR(100), TEXT, JSONB, JSONB, UUID, VARCHAR(20), VARCHAR(50), INET, TEXT) CASCADE;

-- 3. Audit logs tablosunu kontrol et ve gerekirse düzelt
DO $$
BEGIN
    -- Eğer audit_logs tablosu yoksa oluştur
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
        CREATE TABLE audit_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(50) NOT NULL,
            table_name VARCHAR(100) NOT NULL,
            record_id UUID,
            old_values JSONB,
            new_values JSONB,
            description TEXT NOT NULL,
            severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
            category VARCHAR(50) DEFAULT 'general',
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- İndeksleri oluştur
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
    ELSE
        -- Mevcut tabloyu güncelle - user_id kolonunu NULL olabilir hale getir
        ALTER TABLE audit_logs ALTER COLUMN user_id DROP NOT NULL;
        ALTER TABLE audit_logs ALTER COLUMN user_id SET DEFAULT NULL;
    END IF;
END $$;

-- 4. Düzeltilmiş log_audit_event fonksiyonunu oluştur
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_table_name VARCHAR(100),
  p_record_id UUID,
  p_old_values JSONB,
  p_new_values JSONB,
  p_description TEXT,
  p_severity VARCHAR(20) DEFAULT 'medium',
  p_category VARCHAR(50) DEFAULT 'general',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    description,
    severity,
    category,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_values,
    p_new_values,
    p_description,
    p_severity,
    p_category,
    p_ip_address,
    p_user_agent
  );
END;
$$;

-- 5. Fonksiyon izinlerini ver
GRANT EXECUTE ON FUNCTION log_audit_event(UUID, VARCHAR(50), VARCHAR(100), UUID, JSONB, JSONB, TEXT, VARCHAR(20), VARCHAR(50), INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(UUID, VARCHAR(50), VARCHAR(100), UUID, JSONB, JSONB, TEXT, VARCHAR(20), VARCHAR(50), INET, TEXT) TO service_role;

-- 6. Orders için basit audit trigger oluştur
CREATE OR REPLACE FUNCTION audit_orders_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  action_type VARCHAR(50);
  description TEXT;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'INSERT';
    description := 'Yeni sipariş oluşturuldu: ' || COALESCE(NEW.customer_name, 'Bilinmeyen Müşteri');
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
    description := 'Sipariş güncellendi: ' || COALESCE(NEW.customer_name, 'Bilinmeyen Müşteri');
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
    description := 'Sipariş silindi: ' || COALESCE(OLD.customer_name, 'Bilinmeyen Müşteri');
  END IF;

  -- Log the audit event
  PERFORM log_audit_event(
    COALESCE(NEW.created_by, OLD.created_by),
    action_type,
    'orders',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    description,
    'medium',
    'orders'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 7. Orders audit trigger'ını oluştur
CREATE TRIGGER orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_orders_changes();

-- 8. Test fonksiyonu
CREATE OR REPLACE FUNCTION test_audit_log()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Test audit log (user_id NULL olabilir)
  PERFORM log_audit_event(
    NULL,
    'TEST',
    'test_table',
    gen_random_uuid(),
    '{}'::jsonb,
    '{"test": "value"}'::jsonb,
    'Test audit log entry',
    'low',
    'test'
  );
  
  RETURN 'Audit log test successful';
END;
$$;

-- Test fonksiyonunu çalıştır
SELECT test_audit_log();

-- Test fonksiyonunu kaldır
DROP FUNCTION test_audit_log();

SELECT '✅ COMPREHENSIVE AUDIT LOG FIX COMPLETED!' as result;
