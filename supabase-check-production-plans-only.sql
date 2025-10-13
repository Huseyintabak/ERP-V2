-- ==========================================
-- SADECE PRODUCTION PLANS KONTROL ET
-- ==========================================

-- 1. Production plans'ları kontrol et
SELECT 
  pp.id,
  pp.order_id,
  pp.product_id,
  pp.planned_quantity,
  pp.status,
  pp.assigned_operator_id,
  pp.created_at,
  o.order_number,
  fp.name as product_name
FROM production_plans pp
LEFT JOIN orders o ON pp.order_id = o.id
LEFT JOIN finished_products fp ON pp.product_id = fp.id
ORDER BY pp.created_at DESC;

-- 2. Production plans sayısı
SELECT COUNT(*) as production_plans_count FROM production_plans;

-- 3. Orders'ları kontrol et (uretimde olanlar)
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.assigned_operator_id,
  u.name as operator_name,
  o.created_at
FROM orders o
LEFT JOIN users u ON o.assigned_operator_id = u.id
WHERE o.status = 'uretimde'
ORDER BY o.created_at DESC;

