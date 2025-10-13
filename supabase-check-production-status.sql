-- ==========================================
-- PRODUCTION PLAN DURUMUNU KONTROL ET
-- ==========================================

-- 1. Production plans'ları kontrol et
SELECT 
  pp.id,
  pp.order_id,
  pp.product_id,
  pp.planned_quantity,
  pp.status,
  pp.assigned_operator_id,
  pp.started_at,
  pp.created_at,
  o.order_number,
  fp.name as product_name,
  u.name as operator_name
FROM production_plans pp
LEFT JOIN orders o ON pp.order_id = o.id
LEFT JOIN finished_products fp ON pp.product_id = fp.id
LEFT JOIN users u ON pp.assigned_operator_id = u.id
WHERE o.order_number = 'ORD-2025-008'
ORDER BY pp.created_at DESC;

