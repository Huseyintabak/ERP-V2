-- Disable RLS for audit_logs table completely
-- audit_logs tablosu için RLS'yi tamamen devre dışı bırak

-- Disable RLS for audit_logs table
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Also check if the table exists, if not create it
-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
