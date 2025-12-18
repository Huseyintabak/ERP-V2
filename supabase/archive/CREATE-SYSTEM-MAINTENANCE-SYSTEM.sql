-- Sistem Bakım Araçları
-- Log temizleme, optimizasyon, yedekleme fonksiyonları

-- 1. Eski audit logları temizleme
CREATE OR REPLACE FUNCTION clean_old_audit_logs(
    p_days_to_keep INTEGER DEFAULT 90
) RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
    result JSONB;
BEGIN
    -- Eski audit logları sil
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', 'Eski audit logları temizlendi'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Audit log temizleme hatası'
        );
END;
$$ LANGUAGE plpgsql;

-- 2. Eski notification'ları temizleme
CREATE OR REPLACE FUNCTION clean_old_notifications(
    p_days_to_keep INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    deleted_count INTEGER;
    result JSONB;
BEGIN
    -- Eski notification'ları sil
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    result := jsonb_build_object(
        'success', true,
        'deleted_count', deleted_count,
        'message', 'Eski bildirimler temizlendi'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Bildirim temizleme hatası'
        );
END;
$$ LANGUAGE plpgsql;

-- 3. Database istatistiklerini güncelleme
CREATE OR REPLACE FUNCTION update_database_stats() RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- Tüm tabloların istatistiklerini güncelle
    ANALYZE;
    
    result := jsonb_build_object(
        'success', true,
        'message', 'Database istatistikleri güncellendi',
        'timestamp', NOW()
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Database istatistik güncelleme hatası'
        );
END;
$$ LANGUAGE plpgsql;

-- 4. Sistem performans metrikleri
CREATE OR REPLACE FUNCTION get_system_metrics() RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_users INTEGER;
    total_orders INTEGER;
    total_plans INTEGER;
    total_stock_movements INTEGER;
    total_audit_logs INTEGER;
    total_notifications INTEGER;
    db_size TEXT;
BEGIN
    -- Kullanıcı sayısı
    SELECT COUNT(*) INTO total_users FROM users WHERE is_active = true;
    
    -- Sipariş sayısı
    SELECT COUNT(*) INTO total_orders FROM orders;
    
    -- Üretim planı sayısı
    SELECT COUNT(*) INTO total_plans FROM production_plans;
    
    -- Stok hareketi sayısı
    SELECT COUNT(*) INTO total_stock_movements FROM stock_movements;
    
    -- Audit log sayısı
    SELECT COUNT(*) INTO total_audit_logs FROM audit_logs;
    
    -- Bildirim sayısı
    SELECT COUNT(*) INTO total_notifications FROM notifications;
    
    -- Database boyutu
    SELECT pg_size_pretty(pg_database_size(current_database())) INTO db_size;
    
    result := jsonb_build_object(
        'success', true,
        'metrics', jsonb_build_object(
            'users', total_users,
            'orders', total_orders,
            'production_plans', total_plans,
            'stock_movements', total_stock_movements,
            'audit_logs', total_audit_logs,
            'notifications', total_notifications,
            'database_size', db_size,
            'timestamp', NOW()
        )
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Sistem metrikleri alınamadı'
        );
END;
$$ LANGUAGE plpgsql;

-- 5. Sistem sağlık kontrolü
CREATE OR REPLACE FUNCTION check_system_health() RETURNS JSONB AS $$
DECLARE
    result JSONB;
    critical_stock_count INTEGER;
    pending_orders_count INTEGER;
    active_plans_count INTEGER;
    recent_errors_count INTEGER;
    health_status TEXT;
BEGIN
    -- Kritik stok sayısı
    SELECT COUNT(*) INTO critical_stock_count 
    FROM (
        SELECT r.id FROM raw_materials r WHERE r.current_stock <= r.min_stock
        UNION ALL
        SELECT s.id FROM semi_finished_products s WHERE s.current_stock <= s.min_stock
        UNION ALL
        SELECT f.id FROM finished_products f WHERE f.current_stock <= f.min_stock
    ) critical_items;
    
    -- Bekleyen siparişler
    SELECT COUNT(*) INTO pending_orders_count 
    FROM orders WHERE status IN ('beklemede', 'onaylandi');
    
    -- Aktif üretim planları
    SELECT COUNT(*) INTO active_plans_count 
    FROM production_plans WHERE status IN ('planlandi', 'devam_ediyor');
    
    -- Son 24 saatteki hatalar (audit log'dan)
    SELECT COUNT(*) INTO recent_errors_count 
    FROM audit_logs 
    WHERE severity = 'high' AND created_at > NOW() - INTERVAL '24 hours';
    
    -- Sağlık durumu belirleme
    IF critical_stock_count > 10 OR recent_errors_count > 5 THEN
        health_status := 'critical';
    ELSIF critical_stock_count > 5 OR recent_errors_count > 2 THEN
        health_status := 'warning';
    ELSE
        health_status := 'healthy';
    END IF;
    
    result := jsonb_build_object(
        'success', true,
        'health_status', health_status,
        'metrics', jsonb_build_object(
            'critical_stock_items', critical_stock_count,
            'pending_orders', pending_orders_count,
            'active_production_plans', active_plans_count,
            'recent_errors', recent_errors_count,
            'timestamp', NOW()
        )
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Sistem sağlık kontrolü başarısız'
        );
END;
$$ LANGUAGE plpgsql;

-- 6. Sistem temizleme (tüm eski verileri temizleme)
CREATE OR REPLACE FUNCTION full_system_cleanup(
    p_audit_days INTEGER DEFAULT 90,
    p_notification_days INTEGER DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
    result JSONB;
    audit_cleaned INTEGER;
    notification_cleaned INTEGER;
BEGIN
    -- Audit logları temizle
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_audit_days;
    GET DIAGNOSTICS audit_cleaned = ROW_COUNT;
    
    -- Notification'ları temizle
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_notification_days;
    GET DIAGNOSTICS notification_cleaned = ROW_COUNT;
    
    -- Database istatistiklerini güncelle
    ANALYZE;
    
    result := jsonb_build_object(
        'success', true,
        'cleaned_audit_logs', audit_cleaned,
        'cleaned_notifications', notification_cleaned,
        'message', 'Sistem temizleme tamamlandı',
        'timestamp', NOW()
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Sistem temizleme hatası'
        );
END;
$$ LANGUAGE plpgsql;
