-- Sistem Ayarları Real-time Broadcast Sistemi
-- Tüm kullanıcılara anlık ayar güncellemeleri

-- 1. Sistem ayarları broadcast tablosu
CREATE TABLE IF NOT EXISTS settings_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
    broadcast_to TEXT NOT NULL CHECK (broadcast_to IN ('all', 'role', 'user')),
    target_roles TEXT[],
    target_users UUID[],
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_settings_broadcasts_key ON settings_broadcasts(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_broadcasts_created ON settings_broadcasts(created_at);
CREATE INDEX IF NOT EXISTS idx_settings_broadcasts_expires ON settings_broadcasts(expires_at);

-- 2. Kullanıcı ayar durumu tablosu
CREATE TABLE IF NOT EXISTS user_settings_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMPTZ,
    UNIQUE(user_id, setting_key)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings_status(setting_key);
CREATE INDEX IF NOT EXISTS idx_user_settings_acknowledged ON user_settings_status(is_acknowledged);

-- 3. Ayarları broadcast etme fonksiyonu
CREATE OR REPLACE FUNCTION broadcast_setting_change(
    p_setting_key TEXT,
    p_setting_value JSONB,
    p_changed_by UUID,
    p_change_type TEXT,
    p_broadcast_to TEXT DEFAULT 'all',
    p_target_roles TEXT[] DEFAULT NULL,
    p_target_users UUID[] DEFAULT NULL,
    p_message TEXT DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    broadcast_id UUID;
BEGIN
    -- Broadcast kaydı oluştur
    INSERT INTO settings_broadcasts (
        setting_key, setting_value, changed_by, change_type,
        broadcast_to, target_roles, target_users, message, expires_at
    ) VALUES (
        p_setting_key, p_setting_value, p_changed_by, p_change_type,
        p_broadcast_to, p_target_roles, p_target_users, p_message, p_expires_at
    ) RETURNING id INTO broadcast_id;
    
    -- Tüm kullanıcılar için ayar durumu güncelle
    IF p_broadcast_to = 'all' THEN
        INSERT INTO user_settings_status (user_id, setting_key, last_updated, is_acknowledged)
        SELECT id, p_setting_key, NOW(), false
        FROM users
        WHERE is_active = true
        ON CONFLICT (user_id, setting_key) 
        DO UPDATE SET 
            last_updated = NOW(),
            is_acknowledged = false,
            acknowledged_at = NULL;
    ELSIF p_broadcast_to = 'role' AND p_target_roles IS NOT NULL THEN
        INSERT INTO user_settings_status (user_id, setting_key, last_updated, is_acknowledged)
        SELECT u.id, p_setting_key, NOW(), false
        FROM users u
        WHERE u.is_active = true 
        AND u.role = ANY(p_target_roles)
        ON CONFLICT (user_id, setting_key) 
        DO UPDATE SET 
            last_updated = NOW(),
            is_acknowledged = false,
            acknowledged_at = NULL;
    ELSIF p_broadcast_to = 'user' AND p_target_users IS NOT NULL THEN
        INSERT INTO user_settings_status (user_id, setting_key, last_updated, is_acknowledged)
        SELECT u.id, p_setting_key, NOW(), false
        FROM users u
        WHERE u.is_active = true 
        AND u.id = ANY(p_target_users)
        ON CONFLICT (user_id, setting_key) 
        DO UPDATE SET 
            last_updated = NOW(),
            is_acknowledged = false,
            acknowledged_at = NULL;
    END IF;
    
    RETURN broadcast_id;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Kullanıcının bekleyen ayar güncellemelerini alma
CREATE OR REPLACE FUNCTION get_pending_settings_updates(
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    pending_updates JSONB;
BEGIN
    -- Bekleyen güncellemeleri al
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sb.id,
            'setting_key', sb.setting_key,
            'setting_value', sb.setting_value,
            'change_type', sb.change_type,
            'message', sb.message,
            'created_at', sb.created_at,
            'changed_by', jsonb_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email
            )
        )
    ) INTO pending_updates
    FROM settings_broadcasts sb
    JOIN users u ON u.id = sb.changed_by
    JOIN user_settings_status uss ON uss.user_id = p_user_id 
        AND uss.setting_key = sb.setting_key
    WHERE uss.is_acknowledged = false
    AND (sb.expires_at IS NULL OR sb.expires_at > NOW())
    ORDER BY sb.created_at DESC;
    
    result := jsonb_build_object(
        'success', true,
        'pending_updates', COALESCE(pending_updates, '[]'::jsonb),
        'count', COALESCE(jsonb_array_length(pending_updates), 0),
        'timestamp', NOW()
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Bekleyen güncellemeler alınamadı'
        );
END;
$$ LANGUAGE plpgsql;

-- 5. Ayar güncellemesini onaylama
CREATE OR REPLACE FUNCTION acknowledge_settings_update(
    p_user_id UUID,
    p_setting_key TEXT
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Ayar durumunu onaylandı olarak işaretle
    UPDATE user_settings_status 
    SET is_acknowledged = true,
        acknowledged_at = NOW()
    WHERE user_id = p_user_id 
    AND setting_key = p_setting_key;
    
    IF FOUND THEN
        result := jsonb_build_object(
            'success', true,
            'message', 'Ayar güncellemesi onaylandı'
        );
    ELSE
        result := jsonb_build_object(
            'success', false,
            'message', 'Onaylanacak güncelleme bulunamadı'
        );
    END IF;
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Onaylama işlemi başarısız'
        );
END;
$$ LANGUAGE plpgsql;

-- 6. Eski broadcast kayıtlarını temizleme
CREATE OR REPLACE FUNCTION clean_expired_broadcasts(
    p_days_to_keep INTEGER DEFAULT 7
) RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
    result JSONB;
BEGIN
    -- Süresi dolmuş broadcast'leri sil
    DELETE FROM settings_broadcasts 
    WHERE expires_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', 'Süresi dolmuş broadcast kayıtları temizlendi'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Temizleme işlemi başarısız'
        );
END;
$$ LANGUAGE plpgsql;

-- 7. Sistem ayarları değişiklik trigger'ı
CREATE OR REPLACE FUNCTION trigger_settings_broadcast() RETURNS TRIGGER AS $$
DECLARE
    broadcast_id UUID;
BEGIN
    -- Yeni kayıt eklenirse
    IF TG_OP = 'INSERT' THEN
        SELECT broadcast_setting_change(
            NEW.key,
            NEW.value,
            NEW.updated_by,
            'created',
            'all',
            NULL,
            NULL,
            'Yeni sistem ayarı eklendi: ' || NEW.key,
            NOW() + INTERVAL '24 hours'
        ) INTO broadcast_id;
    
    -- Kayıt güncellenirse
    ELSIF TG_OP = 'UPDATE' THEN
        SELECT broadcast_setting_change(
            NEW.key,
            NEW.value,
            NEW.updated_by,
            'updated',
            'all',
            NULL,
            NULL,
            'Sistem ayarı güncellendi: ' || NEW.key,
            NOW() + INTERVAL '24 hours'
        ) INTO broadcast_id;
    
    -- Kayıt silinirse
    ELSIF TG_OP = 'DELETE' THEN
        SELECT broadcast_setting_change(
            OLD.key,
            'null'::jsonb,
            OLD.updated_by,
            'deleted',
            'all',
            NULL,
            NULL,
            'Sistem ayarı silindi: ' || OLD.key,
            NOW() + INTERVAL '24 hours'
        ) INTO broadcast_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger'ı oluştur
DROP TRIGGER IF EXISTS settings_broadcast_trigger ON settings;
CREATE TRIGGER settings_broadcast_trigger
    AFTER INSERT OR UPDATE OR DELETE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_settings_broadcast();

-- 9. Örnek ayar güncellemeleri için fonksiyon
CREATE OR REPLACE FUNCTION update_system_setting_with_broadcast(
    p_key TEXT,
    p_value JSONB,
    p_updated_by UUID,
    p_message TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    setting_id UUID;
BEGIN
    -- Ayarı güncelle veya oluştur
    INSERT INTO settings (key, value, updated_by)
    VALUES (p_key, p_value, p_updated_by)
    ON CONFLICT (key) 
    DO UPDATE SET 
        value = p_value,
        updated_by = p_updated_by,
        updated_at = NOW();
    
    -- Broadcast ID'yi al
    SELECT id INTO setting_id FROM settings WHERE key = p_key;
    
    result := jsonb_build_object(
        'success', true,
        'setting_id', setting_id,
        'message', COALESCE(p_message, 'Sistem ayarı güncellendi ve tüm kullanıcılara bildirildi')
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Ayar güncelleme işlemi başarısız'
        );
END;
$$ LANGUAGE plpgsql;
