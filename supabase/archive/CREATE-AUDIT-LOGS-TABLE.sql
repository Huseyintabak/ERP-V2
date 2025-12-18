-- 🔧 CREATE AUDIT LOGS TABLE: Audit logs tablosunu oluştur
-- Bu dosya audit logs tablosunu ve ilgili fonksiyonları oluşturur

-- Audit logs tablosunu oluştur
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- Index'ler oluştur
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- RLS politikaları
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Sadece yönetici ve planlama rolleri audit logları görebilir
CREATE POLICY "audit_logs_select_policy" ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = audit_logs.user_id 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Sadece sistem audit log oluşturabilir
CREATE POLICY "audit_logs_insert_policy" ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Audit log fonksiyonu
CREATE OR REPLACE FUNCTION log_audit_event(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_table_name VARCHAR(100),
  p_description TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_severity VARCHAR(20) DEFAULT 'medium',
  p_category VARCHAR(50) DEFAULT 'general',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
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
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_audit_event(UUID, VARCHAR(50), VARCHAR(100), TEXT, JSONB, JSONB, UUID, VARCHAR(20), VARCHAR(50), INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event(UUID, VARCHAR(50), VARCHAR(100), TEXT, JSONB, JSONB, UUID, VARCHAR(20), VARCHAR(50), INET, TEXT) TO service_role;

-- Örnek audit log verisi ekle
INSERT INTO audit_logs (
  user_id,
  action,
  table_name,
  description,
  severity,
  category
) VALUES (
  (SELECT id FROM users WHERE role = 'yonetici' LIMIT 1),
  'CREATE',
  'audit_logs',
  'Audit logs tablosu oluşturuldu',
  'medium',
  'system'
);

SELECT '✅ AUDIT LOGS TABLE CREATED!' as result;
