-- ============================================
-- CHECK: Operators Table Schema
-- ============================================

-- 1. Operators tablosunun kolonlarını listele
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'operators'
ORDER BY ordinal_position;

-- 2. Mevcut operatörleri listele
SELECT *
FROM operators
LIMIT 5;

