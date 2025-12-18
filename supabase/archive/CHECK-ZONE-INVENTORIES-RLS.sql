-- zone_inventories RLS politikalarını kontrol et

-- 1. RLS aktif mi?
SELECT 
    '🔐 RLS STATUS' as info,
    tablename as table_name,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'zone_inventories';

-- 2. Politikalar
SELECT 
    '📋 RLS POLICIES' as info,
    policyname as policy_name,
    cmd as command,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'zone_inventories';

-- 3. Direkt SELECT (RLS bypass için set_config kullan)
SELECT 
    '📦 ZONE_INVENTORIES (Direct)' as info,
    COUNT(*) as total_count
FROM zone_inventories;

-- 4. Zone başına sayım
SELECT 
    '📊 BY ZONE' as info,
    zone_id,
    COUNT(*) as product_count,
    SUM(quantity) as total_quantity
FROM zone_inventories
GROUP BY zone_id;



