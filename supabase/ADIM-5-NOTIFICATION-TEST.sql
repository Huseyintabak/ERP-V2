-- ============================================
-- ADIM 5: CRITICAL STOCK NOTIFICATION TEST
-- ============================================

-- Strateji: Önce stoğu normale çevir, barkod okut, 
-- sonra stoğu manuel düşürüp notification trigger'ını test et

-- 1. Önce mevcut notification sayısını kaydet, sonra test yap
DO $$
DECLARE
    v_notification_count_before INT;
    v_notification_count_after INT;
    v_material_id UUID;
BEGIN
    -- Önce Çelik Levha'yı normale çevir
    UPDATE raw_materials
    SET quantity = 10000
    WHERE code = 'HM-CELIK-001';
    
    RAISE NOTICE '✅ Çelik Levha stoğu normale çevrildi: 10000';
    
    -- Önce bildirim sayısını al
    SELECT COUNT(*) INTO v_notification_count_before
    FROM notifications
    WHERE type = 'critical_stock';
    
    RAISE NOTICE '📊 Önceki bildirim sayısı: %', v_notification_count_before;
    
    -- Çelik Levha ID'sini al
    SELECT id INTO v_material_id
    FROM raw_materials
    WHERE code = 'HM-CELIK-001';
    
    -- Stoğu kritik seviyenin altına düşür (40)
    UPDATE raw_materials
    SET quantity = 40
    WHERE id = v_material_id;
    
    RAISE NOTICE '⚠️  Stok kritik seviyeye düşürüldü: 40';
    
    -- Manuel stock movement ekle (trigger tetiklenecek)
    INSERT INTO stock_movements (
        movement_type,
        material_type,
        material_id,
        quantity,
        user_id,
        created_at
    ) VALUES (
        'cikis',
        'raw',
        v_material_id,
        9960, -- 10000'den 40'a düşürmek için
        (SELECT id FROM users WHERE role = 'planlama' LIMIT 1), -- Test user
        NOW()
    );
    
    RAISE NOTICE '✅ Stock movement eklendi';
    
    -- 1 saniye bekle (trigger çalışsın)
    PERFORM pg_sleep(1);
    
    -- Bildirim oluştu mu?
    SELECT COUNT(*) INTO v_notification_count_after
    FROM notifications
    WHERE type = 'critical_stock';
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Sonraki bildirim sayısı: %', v_notification_count_after;
    
    IF v_notification_count_after > v_notification_count_before THEN
        RAISE NOTICE '✅✅✅ CRITICAL STOCK NOTİFİCATİON TRİGGER BAŞARILI!';
    ELSE
        RAISE NOTICE '❌ Bildirim oluşturulmadı!';
    END IF;
    
END $$;

-- 3. Oluşan bildirimleri göster
SELECT 
    'Critical Stock Notifications' as check_type,
    n.id,
    n.type,
    n.title,
    n.message,
    n.severity,
    n.target_roles,
    n.created_at
FROM notifications n
WHERE n.type = 'critical_stock'
  AND n.created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY n.created_at DESC;

-- 4. target_roles kontrolü
SELECT 
    CASE 
        WHEN 'planlama' = ANY(target_roles) AND 'yonetici' = ANY(target_roles) 
        THEN '✅ target_roles: {planlama, yonetici} BAŞARILI!'
        ELSE '⚠️  target_roles yanlış veya eksik!'
    END as target_roles_check,
    target_roles,
    title,
    message
FROM notifications
WHERE type = 'critical_stock'
  AND created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

