-- ==========================================
-- YENİ SİPARİŞ KONTROL
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Yeni siparişin ID'sini bul
SELECT id, order_number, customer_name, status 
FROM orders 
WHERE order_number = 'ORD-2025-008';

-- 2. Bu siparişin order_items'ını kontrol et
SELECT 
  oi.id,
  oi.order_id,
  oi.product_id,
  oi.quantity,
  fp.name as product_name
FROM order_items oi
LEFT JOIN finished_products fp ON oi.product_id = fp.id
WHERE oi.order_id = (
  SELECT id FROM orders WHERE order_number = 'ORD-2025-008'
);

-- 3. Tüm order_items tablosunu kontrol et
SELECT COUNT(*) as total_order_items FROM order_items;

-- 4. Son 5 order_items kaydını listele
SELECT 
  oi.id,
  oi.order_id,
  o.order_number,
  oi.product_id,
  oi.quantity,
  fp.name as product_name,
  oi.created_at
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN finished_products fp ON oi.product_id = fp.id
ORDER BY oi.created_at DESC
LIMIT 5;

