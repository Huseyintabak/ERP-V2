-- ==========================================
-- AUDIT LOG FUNCTION'INI TAMAMEN DEVRE DIŞI BIRAK
-- ==========================================

-- 1. Önce tüm trigger'ları kaldır
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_orders ON orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_production_plans ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_bom ON bom CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_users ON users CASCADE;

-- 2. Audit log function'ını tamamen değiştir (hiçbir şey yapmasın)
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Hiçbir şey yapma, sadece NEW veya OLD'u döndür
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger'ları tekrar ekle ama artık hiçbir şey yapmayacaklar
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

-- 4. Kontrol et
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%audit%';

