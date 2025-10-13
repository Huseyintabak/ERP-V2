-- Doğru tablo adıyla zone inventory kontrol

-- 1. zone_inventory tablosu var mı?
SELECT 
    '📋 ZONE_INVENTORY TABLE' as info,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'zone_inventory'
    ) as table_exists;

-- 2. zone_inventory şeması
SELECT 
    '🔧 ZONE_INVENTORY COLUMNS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'zone_inventory'
ORDER BY ordinal_position;

-- 3. zone_inventory kayıtları (varsa)
SELECT 
    '📦 ZONE INVENTORY DATA' as info,
    zi.*
FROM zone_inventory zi
LIMIT 10;

-- 4. zone_transfers tablosu var mı?
SELECT 
    '📋 ZONE_TRANSFERS TABLE' as info,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'zone_transfers'
    ) as table_exists;

-- 5. Finished products toplam
SELECT 
    '🎯 FINISHED PRODUCTS' as info,
    COUNT(*) as total_products,
    SUM(quantity) as total_quantity
FROM finished_products;



