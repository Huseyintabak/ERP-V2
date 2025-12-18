-- =====================================================
-- 🎯 MIGRATION BAŞARI KONTROLÜ (3 Basit Query)
-- =====================================================

-- ✅ CHECK 1: production_log_id kolonu var mı?
SELECT 
    '1️⃣ stock_movements.production_log_id' as check_name,
    column_name,
    data_type,
    '✅ Migration başarılı!' as result
FROM information_schema.columns 
WHERE table_name = 'stock_movements' 
  AND column_name = 'production_log_id';
-- BEKLENEN: 1 satır, data_type: uuid

-- ✅ CHECK 2: target_roles kolonu var mı?
SELECT 
    '2️⃣ notifications.target_roles' as check_name,
    column_name,
    data_type,
    '✅ Migration başarılı!' as result
FROM information_schema.columns 
WHERE table_name = 'notifications' 
  AND column_name = 'target_roles';
-- BEKLENEN: 1 satır, data_type: ARRAY

-- ✅ CHECK 3: consume_materials function BOM snapshot kullanıyor mu?
SELECT 
    '3️⃣ consume_materials trigger' as check_name,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%production_plan_bom_snapshot%' 
        THEN '✅ BOM snapshot kullanıyor - Migration başarılı!'
        ELSE '❌ Hala eski BOM kullanıyor - Migration yapılmamış!'
    END as result
FROM pg_proc 
WHERE proname = 'consume_materials_on_production';

-- =====================================================
-- 🎉 SONUÇ
-- =====================================================
-- Eğer 3 check de ✅ ise → Migration %100 başarılı!
-- Sistem production ready!

