-- =====================================================
-- 🎯 MIGRATION FINAL VALIDATION
-- =====================================================
-- Bu query'yi çalıştırarak migration'ın başarılı olup olmadığını görebilirsiniz.

-- ✅ CHECK 1: stock_movements tablosunda production_log_id var mı?
SELECT 
    '✅ stock_movements.production_log_id' as check_name,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ BAŞARILI'
        ELSE '❌ EKSİK'
    END as status
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
  AND column_name = 'production_log_id';

-- ✅ CHECK 2: notifications tablosunda target_roles var mı?
SELECT 
    '✅ notifications.target_roles' as check_name,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ BAŞARILI'
        ELSE '❌ EKSİK'
    END as status
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND column_name = 'target_roles';

-- ✅ CHECK 3: İlgili index'ler oluştu mu?
SELECT 
    '✅ Database Indexes' as check_name,
    CASE 
        WHEN COUNT(*) = 2 THEN '✅ BAŞARILI'
        ELSE '⚠️ KISMİ (' || COUNT(*) || '/2)'
    END as status
FROM pg_indexes
WHERE indexname IN (
    'idx_stock_movements_production_log',
    'idx_notifications_target_roles'
);

-- ✅ CHECK 4: consume_materials_on_production function BOM snapshot kullanıyor mu?
SELECT 
    '✅ consume_materials trigger' as check_name,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%production_plan_bom_snapshot%' THEN '✅ BAŞARILI'
        WHEN pg_get_functiondef(oid) LIKE '%FROM bom%' THEN '❌ ESKİ VERSİYON'
        ELSE '⚠️ BİLİNMİYOR'
    END as status
FROM pg_proc 
WHERE proname = 'consume_materials_on_production';

-- ✅ CHECK 5: check_critical_stock function rol bazlı bildirim gönderiyor mu?
SELECT 
    '✅ check_critical_stock trigger' as check_name,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%target_roles%' THEN '✅ BAŞARILI'
        ELSE '❌ ESKİ VERSİYON'
    END as status
FROM pg_proc 
WHERE proname = 'check_critical_stock';

-- ✅ CHECK 6: create_bom_snapshot trigger var mı?
SELECT 
    '✅ BOM snapshot trigger' as check_name,
    CASE 
        WHEN COUNT(*) = 1 THEN '✅ BAŞARILI'
        ELSE '❌ EKSİK'
    END as status
FROM information_schema.triggers
WHERE trigger_name = 'trigger_create_bom_snapshot';

-- =====================================================
-- 🧪 TEST: target_roles Kolonu Gerçekten Çalışıyor mu?
-- =====================================================

-- Test bildirimi ekle
INSERT INTO notifications (
    type,
    title,
    message,
    severity,
    target_roles
) VALUES (
    'critical_stock',
    'Migration Validation Test',
    'Bu test bildirimi migration doğrulaması için oluşturuldu.',
    'low',
    ARRAY['planlama', 'yonetici']
) RETURNING 
    '🧪 TEST INSERT' as test_name,
    '✅ target_roles çalışıyor: ' || target_roles::text as result;

-- Test kaydını temizle
DELETE FROM notifications WHERE title = 'Migration Validation Test'
RETURNING '🧹 TEST CLEANUP' as cleanup, '✅ Test kaydı silindi' as result;

-- =====================================================
-- 📊 FINAL REPORT
-- =====================================================

SELECT 
    '🎉 MIGRATION DURUMU' as report_title,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'stock_movements' AND column_name = 'production_log_id'
        ) = 1
        AND (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'notifications' AND column_name = 'target_roles'
        ) = 1
        THEN '✅✅✅ BAŞARILI - Sistem Production Ready! ✅✅✅'
        ELSE '⚠️ KISMİ BAŞARILI - Bazı kontroller başarısız'
    END as final_status;

-- =====================================================
-- 📋 Sonraki Adımlar
-- =====================================================

SELECT '
📋 MIGRATION BAŞARILIYSA SONRAKI ADIMLAR:

1. ✅ Operatör panelinde test üretimi yap
2. ✅ Barkod okuttuğunda stoklar düzgün güncellensin
3. ✅ stock_movements kayıtlarında production_log_id dolu olsun
4. ✅ Hammadde kritik seviyeye düştüğünde bildirim gelsin
5. ✅ Bildirimde target_roles: {planlama,yonetici} görünsün

🚀 Sistem artık production ready!
' as next_steps;

