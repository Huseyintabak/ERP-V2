-- ==========================================
-- SİPARİŞ DURUMLARINI DÜZELT
-- ==========================================

-- 1. Mevcut siparişleri kontrol et
SELECT 
  o.order_number,
  o.status,
  o.assigned_operator_id,
  u.name as operator_name
FROM orders o
LEFT JOIN users u ON o.assigned_operator_id = u.id
ORDER BY o.created_at DESC;

-- 2. Siparişleri 'beklemede' durumuna geri çevir (test için)
UPDATE orders 
SET status = 'beklemede' 
WHERE status = 'uretimde';

-- 3. Production plans'ları sil (temizlik için)
DELETE FROM production_plans;

-- 4. Material reservations'ları sil (temizlik için)
DELETE FROM material_reservations;

-- 5. Kontrol et
SELECT 
  o.order_number,
  o.status,
  o.assigned_operator_id,
  u.name as operator_name
FROM orders o
LEFT JOIN users u ON o.assigned_operator_id = u.id
ORDER BY o.created_at DESC;

