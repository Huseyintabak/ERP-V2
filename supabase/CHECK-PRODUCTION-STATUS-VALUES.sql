-- ============================================
-- CHECK: Production Plans Status Values
-- ============================================

-- İzin verilen status değerlerini bul
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%production_plans_status%';

-- Alternatif: pg_constraint tablosundan
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname LIKE '%production_plans_status%';



