-- 🔍 CHECK TRIGGERS: Mevcut trigger'ları kontrol et
-- Bu dosya veritabanındaki tüm trigger'ları listeler

-- 1. Tüm trigger'ları listele
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- 2. Audit log ile ilgili trigger'ları özellikle kontrol et
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND (t.tgname LIKE '%audit%' OR t.tgname LIKE '%stock%' OR t.tgname LIKE '%transfer%')
ORDER BY c.relname, t.tgname;

-- 3. Zone transfer tablosundaki trigger'ları kontrol et
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'zone_transfers'
ORDER BY t.tgname;

-- 4. Zone inventories tablosundaki trigger'ları kontrol et
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'zone_inventories'
ORDER BY t.tgname;

-- 5. Finished products tablosundaki trigger'ları kontrol et
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'finished_products'
ORDER BY t.tgname;

-- 6. Tüm fonksiyonları listele
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_function_result(p.oid) as return_type,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (p.proname LIKE '%audit%' OR p.proname LIKE '%transfer%' OR p.proname LIKE '%stock%')
ORDER BY p.proname;

SELECT '✅ TRIGGER CHECK COMPLETED!' as result;
