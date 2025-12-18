-- 🔍 DETAILED TRIGGER CHECK: Detaylı trigger kontrolü
-- Bu dosya trigger'ları daha detaylı kontrol eder

-- 1. Tüm trigger'ları listele (sadece isimler)
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, t.tgname;

-- 2. Zone transfer tablosundaki trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'zone_transfers';

-- 3. Zone inventories tablosundaki trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'zone_inventories';

-- 4. Finished products tablosundaki trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'finished_products';

-- 5. Semi finished products tablosundaki trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'semi_finished_products';

-- 6. Raw materials tablosundaki trigger'ları kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND c.relname = 'raw_materials';

SELECT '✅ DETAILED TRIGGER CHECK COMPLETED!' as result;
