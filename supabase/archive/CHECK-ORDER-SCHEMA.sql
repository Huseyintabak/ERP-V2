-- =====================================================
-- Orders Tablosu Schema Kontrolu
-- =====================================================

-- orders tablosu kolonlarini goster
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- order_items tablosu var mi?
SELECT 
    table_name,
    'Tablo var' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'order_items';

-- order_items tablosu varsa kolonlarini goster
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

