-- Her iki zone inventory tablosunu kontrol et

-- 1. zone_inventory şeması
SELECT 
    '🔧 ZONE_INVENTORY COLUMNS' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'zone_inventory'
ORDER BY ordinal_position;

-- 2. zone_inventories şeması
SELECT 
    '🔧 ZONE_INVENTORIES COLUMNS' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'zone_inventories'
ORDER BY ordinal_position;

-- 3. zone_inventory kayıt sayısı
SELECT 
    'zone_inventory' as table_name,
    COUNT(*) as record_count
FROM zone_inventory;

-- 4. zone_inventories kayıt sayısı
SELECT 
    'zone_inventories' as table_name,
    COUNT(*) as record_count
FROM zone_inventories;

-- 5. finished_products'ta zone_id var mı?
SELECT 
    '🔧 FINISHED_PRODUCTS COLUMNS' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'finished_products'
ORDER BY ordinal_position;



