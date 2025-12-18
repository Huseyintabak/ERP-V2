-- Orders tablosundaki audit log trigger'larını kaldır ve log_audit_event fonksiyonunu yeniden oluştur

-- 1. Orders tablosundaki audit trigger'ları kaldır
DROP TRIGGER IF EXISTS orders_audit_trigger ON orders;

-- 2. log_audit_event fonksiyonunu yeniden oluştur
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

-- 3. Fonksiyon izinlerini ver
GRANT EXECUTE ON FUNCTION log_audit_event(UUID, VARCHAR(50), VARCHAR(100), UUID, JSONB, JSONB, TEXT, VARCHAR(20), VARCHAR(50), INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(UUID, VARCHAR(50), VARCHAR(100), UUID, JSONB, JSONB, TEXT, VARCHAR(20), VARCHAR(50), INET, TEXT) TO service_role;

-- 4. Orders tablosu için basit audit trigger oluştur
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

-- 5. Orders audit trigger'ını oluştur
CREATE TRIGGER orders_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION audit_orders_changes();

SELECT '✅ ORDERS AUDIT LOG FIXED!' as result;
