-- ==========================================
-- MANUEL PRODUCTION PLAN OLUŞTUR
-- ==========================================

-- 1. ORD-2025-008 siparişinin ürününü bul
SELECT 
  oi.order_id,
  oi.product_id,
  oi.quantity,
  o.order_number,
  fp.name as product_name
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
JOIN finished_products fp ON oi.product_id = fp.id
WHERE o.order_number = 'ORD-2025-008';

-- 2. Production plan oluştur
INSERT INTO production_plans (
  order_id,
  product_id,
  planned_quantity,
  status,
  assigned_operator_id
) 
SELECT 
  oi.order_id,
  oi.product_id,
  oi.quantity,
  'planlandi',
  o.assigned_operator_id
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.order_number = 'ORD-2025-008';

-- 3. Oluşturulan production plan'ı kontrol et
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
JOIN orders o ON pp.order_id = o.id
JOIN finished_products fp ON pp.product_id = fp.id
WHERE o.order_number = 'ORD-2025-008';

