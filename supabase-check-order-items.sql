-- ==========================================
-- ORDER ITEMS KONTROL
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Order items tablosunu kontrol et
SELECT * FROM order_items WHERE order_id = '40b98baa-eadc-4486-b6c7-b44c2870673d';

-- 2. Orders tablosunu detaylı kontrol et
SELECT * FROM orders WHERE id = '40b98baa-eadc-4486-b6c7-b44c2870673d';

-- 3. Tüm order_items kayıtlarını listele
SELECT 
  oi.id,
  oi.order_id,
  o.order_number,
  oi.product_id,
  oi.quantity,
  fp.name as product_name
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
LEFT JOIN finished_products fp ON oi.product_id = fp.id
ORDER BY oi.created_at DESC
LIMIT 10;

-- 4. Finished products tablosunu kontrol et
SELECT id, code, name FROM finished_products LIMIT 5;

