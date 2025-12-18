-- ============================================
-- CHECK: Materials Tables Schema
-- ============================================

-- 1. raw_materials kolonları
SELECT 
    'raw_materials' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'raw_materials'
ORDER BY ordinal_position;

-- 2. semi_finished_products kolonları
SELECT 
    'semi_finished_products' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'semi_finished_products'
ORDER BY ordinal_position;

-- 3. Hammadde örnek kayıt
SELECT *
FROM raw_materials
LIMIT 2;



