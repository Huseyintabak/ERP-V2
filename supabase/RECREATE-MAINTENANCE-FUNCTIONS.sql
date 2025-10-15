-- 🔧 RECREATE MAINTENANCE FUNCTIONS: Bakım fonksiyonlarını yeniden oluştur
-- Bu dosya sistem bakım fonksiyonlarını yeniden oluşturur

-- 1. Audit log temizleme fonksiyonu
CREATE OR REPLACE FUNCTION clean_old_audit_logs(p_days_to_keep INTEGER DEFAULT 90)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Audit logs tablosu yoksa boş sonuç döndür
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        RETURN json_build_object(
            'success', true,
            'message', 'Audit logs table does not exist',
            'deleted_count', 0
        );
    END IF;
    
    -- Eski audit logları sil
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Cleaned %s old audit logs', deleted_count),
        'deleted_count', deleted_count
    );
END;
$$;

-- 2. Bildirim temizleme fonksiyonu
CREATE OR REPLACE FUNCTION clean_old_notifications(p_days_to_keep INTEGER DEFAULT 30)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Eski bildirimleri sil
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Cleaned %s old notifications', deleted_count),
        'deleted_count', deleted_count
    );
END;
$$;

-- 3. Sistem metrikleri fonksiyonu
CREATE OR REPLACE FUNCTION get_system_metrics()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM users),
        'total_orders', (SELECT COUNT(*) FROM orders),
        'total_production_plans', (SELECT COUNT(*) FROM production_plans),
        'total_products', (
            (SELECT COUNT(*) FROM raw_materials) + 
            (SELECT COUNT(*) FROM semi_finished_products) + 
            (SELECT COUNT(*) FROM finished_products)
        ),
        'database_size', (
            SELECT pg_size_pretty(pg_database_size(current_database()))
        ),
        'last_updated', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 4. Sistem sağlık kontrolü fonksiyonu
CREATE OR REPLACE FUNCTION check_system_health()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'status', 'healthy',
        'database_connection', 'ok',
        'critical_tables', json_build_object(
            'users', (SELECT COUNT(*) FROM users),
            'orders', (SELECT COUNT(*) FROM orders),
            'production_plans', (SELECT COUNT(*) FROM production_plans)
        ),
        'last_check', NOW()
    ) INTO result;
    
    RETURN result;
END;
$$;

-- 5. Veritabanı istatistikleri güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_database_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
    -- Veritabanı istatistiklerini güncelle
    ANALYZE;
    
    RETURN json_build_object(
        'success', true,
        'message', 'Database statistics updated successfully',
        'updated_at', NOW()
    );
END;
$$;

-- 6. Tam sistem temizliği fonksiyonu
CREATE OR REPLACE FUNCTION full_system_cleanup(
    p_audit_days INTEGER DEFAULT 90,
    p_notification_days INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    audit_result JSON;
    notification_result JSON;
    total_deleted INTEGER;
BEGIN
    -- Audit logları temizle
    SELECT clean_old_audit_logs(p_audit_days) INTO audit_result;
    
    -- Bildirimleri temizle
    SELECT clean_old_notifications(p_notification_days) INTO notification_result;
    
    -- Toplam silinen kayıt sayısını hesapla
    total_deleted := (audit_result->>'deleted_count')::INTEGER + (notification_result->>'deleted_count')::INTEGER;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Full system cleanup completed. Total deleted: %s records', total_deleted),
        'audit_cleanup', audit_result,
        'notification_cleanup', notification_result,
        'total_deleted', total_deleted,
        'completed_at', NOW()
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION clean_old_audit_logs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION clean_old_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION check_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION update_database_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION full_system_cleanup(INTEGER, INTEGER) TO authenticated;

SELECT '✅ MAINTENANCE FUNCTIONS RECREATED!' as result;
