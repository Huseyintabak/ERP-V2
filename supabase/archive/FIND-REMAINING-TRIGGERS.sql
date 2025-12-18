-- 🔍 FIND REMAINING TRIGGERS: Kalan trigger'ları bul
-- Bu dosya kalan tüm trigger'ları bulur

-- 1. Tüm trigger'ları listele
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 2. Audit ile ilgili tüm trigger'ları bul
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
  AND (t.tgname LIKE '%audit%' OR t.tgname LIKE '%stock%' OR t.tgname LIKE '%transfer%' OR t.tgname LIKE '%log%')
ORDER BY c.relname, t.tgname;

-- 3. Zone transfer tablosundaki tüm trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'zone_transfers'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 4. Zone inventories tablosundaki tüm trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'zone_inventories'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

-- 5. Finished products tablosundaki tüm trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'finished_products'
  AND NOT t.tgisinternal
ORDER BY t.tgname;

SELECT '✅ REMAINING TRIGGERS FOUND!' as result;
