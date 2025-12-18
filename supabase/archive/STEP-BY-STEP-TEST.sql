-- =====================================================
-- STEP 1: Production Plan Var Mi?
-- =====================================================

SELECT 
    'STEP 1: Production Plan Kontrolu' as step_name,
    COUNT(*) as plan_count
FROM production_plans
WHERE status IN ('planlandi', 'devam_ediyor');

-- Detayli bilgi
SELECT 
    id,
    order_id,
    product_id,
    planned_quantity,
    produced_quantity,
    status,
    assigned_operator_id
FROM production_plans
WHERE status IN ('planlandi', 'devam_ediyor')
LIMIT 3;

