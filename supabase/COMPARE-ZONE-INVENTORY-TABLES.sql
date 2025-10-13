-- İki zone inventory tablosunu karşılaştır

-- zone_inventory
SELECT 
    'zone_inventory' as table_name,
    COUNT(*) as record_count
FROM zone_inventory;

-- zone_inventories  
SELECT 
    'zone_inventories' as table_name,
    COUNT(*) as record_count
FROM zone_inventories;

-- Hangisi kullanılıyor? Her ikisinden de şema çek
SELECT 
    '📋 ZONE_INVENTORY SCHEMA' as info,
    column_name
FROM information_schema.columns
WHERE table_name = 'zone_inventory'
ORDER BY ordinal_position;

SELECT 
    '📋 ZONE_INVENTORIES SCHEMA' as info,
    column_name
FROM information_schema.columns
WHERE table_name = 'zone_inventories'
ORDER BY ordinal_position;



