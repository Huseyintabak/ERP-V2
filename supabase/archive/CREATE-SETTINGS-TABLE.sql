-- Settings tablosu oluşturma
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at);

-- Örnek ayarlar ekle
INSERT INTO settings (key, value, description) VALUES
('system_maintenance_mode', '{"enabled": false, "message": "Sistem bakım modu aktif"}', 'Sistem bakım modu ayarı'),
('notification_settings', '{"email_enabled": true, "push_enabled": true, "sms_enabled": false}', 'Bildirim ayarları'),
('production_settings', '{"auto_approve": false, "max_operators": 5, "shift_duration": 8}', 'Üretim ayarları'),
('inventory_settings', '{"low_stock_threshold": 10, "critical_stock_threshold": 5, "auto_reorder": false}', 'Envanter ayarları'),
('security_settings', '{"session_timeout": 30, "max_login_attempts": 5, "password_expiry": 90}', 'Güvenlik ayarları')
ON CONFLICT (key) DO NOTHING;
