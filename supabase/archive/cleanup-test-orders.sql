-- Test siparişlerini temizlemek için SQL komutları:

-- 1. Önce mevcut siparişleri kontrol et
SELECT 
  o.id, 
  o.order_number, 
  o.customer_name, 
  o.status, 
  o.created_at,
  COUNT(oi.id) as item_count
FROM orders o 
LEFT JOIN order_items oi ON o.id = oi.order_id 
GROUP BY o.id, o.order_number, o.customer_name, o.status, o.created_at
ORDER BY o.created_at DESC;

-- 2. Test siparişlerini sil (order_items önce silinmeli)
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE customer_name LIKE '%Test%' OR customer_name LIKE '%test%'
);

-- 3. Ana siparişleri sil
DELETE FROM orders WHERE customer_name LIKE '%Test%' OR customer_name LIKE '%test%';

-- 4. Temizlik sonrası kontrol
SELECT COUNT(*) as remaining_orders FROM orders;
SELECT COUNT(*) as remaining_order_items FROM order_items;
