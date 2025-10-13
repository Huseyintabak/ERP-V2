-- Warehouse ile ilgili tabloları bul

SELECT 
    '📋 WAREHOUSE TABLES' as info,
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns c 
     WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name LIKE '%warehouse%'
OR table_name LIKE '%zone%'
ORDER BY table_name;

-- warehouse_zones tablosunun kolonlarını göster
SELECT 
    '🔧 WAREHOUSE_ZONES COLUMNS' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'warehouse_zones'
ORDER BY ordinal_position;



