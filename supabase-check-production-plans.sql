-- ==========================================
-- PRODUCTION PLANS KONTROL ET
-- ==========================================

-- 1. Production plans'ları kontrol et
SELECT 
  pp.id,
  pp.order_id,
  pp.product_id,
  pp.planned_quantity,
  pp.status,
  pp.assigned_operator_id,
  o.order_number,
  fp.name as product_name
FROM production_plans pp
LEFT JOIN orders o ON pp.order_id = o.id
LEFT JOIN finished_products fp ON pp.product_id = fp.id
ORDER BY pp.created_at DESC;

-- 2. Orders'ları kontrol et
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.assigned_operator_id,
  u.name as operator_name
FROM orders o
LEFT JOIN users u ON o.assigned_operator_id = u.id
WHERE o.status = 'uretimde'
ORDER BY o.created_at DESC;

-- 3. Material reservations'ları kontrol et
SELECT 
  mr.id,
  mr.order_id,
  mr.material_type,
  mr.material_id,
  mr.reserved_quantity,
  o.order_number
FROM material_reservations mr
LEFT JOIN orders o ON mr.order_id = o.id
ORDER BY mr.created_at DESC;

