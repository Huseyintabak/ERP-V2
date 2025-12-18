-- Zone'larda ürün nasıl tutuluyor?

-- 1. Finished products'ta zone_id kolonu var mı?
SELECT 
    '🔧 FINISHED_PRODUCTS COLUMNS' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'finished_products'
AND (column_name LIKE '%zone%' OR column_name LIKE '%location%' OR column_name LIKE '%warehouse%')
ORDER BY ordinal_position;

-- 2. Raw materials'ta zone_id var mı?
SELECT 
    '🔧 RAW_MATERIALS COLUMNS' as info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'raw_materials'
AND (column_name LIKE '%zone%' OR column_name LIKE '%location%' OR column_name LIKE '%warehouse%')
ORDER BY ordinal_position;

-- 3. Tüm tabloları listele (zone/warehouse/inventory ile ilgili)
SELECT 
    '📋 ALL TABLES' as info,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;



