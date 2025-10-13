-- =====================================================
-- Tum Tablolari Listele
-- =====================================================

SELECT 
    table_name,
    'Tablo mevcut' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Eger customers tablosu varsa, kolonlarini goster
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'customers'
ORDER BY ordinal_position;

