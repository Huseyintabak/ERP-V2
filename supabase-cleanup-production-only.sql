-- ==========================================
-- Thunder ERP v2 - Production Data Cleanup (Safe Version)
-- ==========================================
-- Bu script sadece üretim ile ilgili verileri temizler
-- Kullanıcılar, ayarlar ve sistem verileri korunur

-- ==========================================
-- 1. Production Logs (Üretim Kayıtları)
-- ==========================================
DELETE FROM production_logs;

-- ==========================================
-- 2. Production Plans (Üretim Planları)
-- ==========================================
DELETE FROM production_plans;

-- ==========================================
-- 3. Order Items (Sipariş Kalemleri)
-- ==========================================
DELETE FROM order_items;

-- ==========================================
-- 4. Orders (Siparişler)
-- ==========================================
DELETE FROM orders;

-- ==========================================
-- 5. BOM (Bill of Materials)
-- ==========================================
DELETE FROM bom;

-- ==========================================
-- 6. Notifications (Bildirimler)
-- ==========================================
DELETE FROM notifications;

-- ==========================================
-- 7. Audit Logs (İşlem Geçmişi) - Tablo mevcut değil, atla
-- ==========================================
-- DELETE FROM audit_logs; -- Tablo mevcut değil

-- ==========================================
-- 8. Stock Items (Stok Ürünleri)
-- ==========================================
-- Nihai Ürünler
DELETE FROM finished_products;

-- Yarı Mamuller
DELETE FROM semi_finished_products;

-- Hammaddeler
DELETE FROM raw_materials;

-- ==========================================
-- 9. Reset Sequences (Sıralama Sayılarını Sıfırla)
-- ==========================================
-- Order number sequence - Mevcut değil, atla
-- SELECT setval('orders_order_number_seq', 1, false); -- Sequence mevcut değil

-- ==========================================
-- 10. Verification (Doğrulama)
-- ==========================================
-- Temizlik sonrası kontrol
SELECT 
  'production_logs' as table_name, 
  COUNT(*) as remaining_records 
FROM production_logs
UNION ALL
SELECT 
  'production_plans' as table_name, 
  COUNT(*) as remaining_records 
FROM production_plans
UNION ALL
SELECT 
  'order_items' as table_name, 
  COUNT(*) as remaining_records 
FROM order_items
UNION ALL
SELECT 
  'orders' as table_name, 
  COUNT(*) as remaining_records 
FROM orders
UNION ALL
SELECT 
  'bom' as table_name, 
  COUNT(*) as remaining_records 
FROM bom
UNION ALL
SELECT 
  'notifications' as table_name, 
  COUNT(*) as remaining_records 
FROM notifications
-- UNION ALL
-- SELECT 
--   'audit_logs' as table_name, 
--   COUNT(*) as remaining_records 
-- FROM audit_logs -- Tablo mevcut değil
UNION ALL
SELECT 
  'finished_products' as table_name, 
  COUNT(*) as remaining_records 
FROM finished_products
UNION ALL
SELECT 
  'semi_finished_products' as table_name, 
  COUNT(*) as remaining_records 
FROM semi_finished_products
UNION ALL
SELECT 
  'raw_materials' as table_name, 
  COUNT(*) as remaining_records 
FROM raw_materials;

-- ==========================================
-- 11. Success Message
-- ==========================================
SELECT 'Production data cleanup completed successfully! (Users and settings preserved)' as message;
