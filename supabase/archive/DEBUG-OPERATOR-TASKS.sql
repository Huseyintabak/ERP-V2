-- ============================================
-- DEBUG: Why operator can't see tasks?
-- ============================================

-- 1. Production plan'lar var mı?
SELECT 
    'All Production Plans' as check_type,
    id,
    order_id,
    product_id,
    status,
    assigned_operator_id
FROM production_plans
WHERE assigned_operator_id = '11111111-1111-1111-1111-111111111111';

-- 2. RLS policies kontrol et
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'production_plans';

-- 3. Direkt Supabase client gibi sorgu yap
SELECT 
    pp.*,
    o.id as order_id_from_join,
    o.order_number,
    o.customer_name,
    o.priority,
    o.delivery_date,
    o.status as order_status,
    fp.id as product_id_from_join,
    fp.name as product_name,
    fp.code as product_code,
    fp.barcode as product_barcode
FROM production_plans pp
LEFT JOIN orders o ON o.id = pp.order_id
LEFT JOIN finished_products fp ON fp.id = pp.product_id
WHERE pp.assigned_operator_id = '11111111-1111-1111-1111-111111111111'
  AND pp.status = 'planlandi';



