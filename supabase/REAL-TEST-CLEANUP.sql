-- =====================================================
-- ADIM 0: Test Verilerini Temizle (Opsiyonel)
-- =====================================================
-- Bu script eski test verilerini temizler ve temiz bir başlangıç sağlar

-- 1. ONCE stock_movements sil (foreign key constraint!)
DELETE FROM stock_movements
WHERE production_log_id IN (
    SELECT id FROM production_logs
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
);

-- 2. SONRA production logs sil
DELETE FROM production_logs
WHERE timestamp >= NOW() - INTERVAL '1 hour';

-- 3. Test siparişlerini sil
DELETE FROM production_plans
WHERE order_id IN (
    SELECT id FROM orders 
    WHERE order_number LIKE 'ORD-TEST%' 
    OR order_number LIKE 'ORD-2025%'
);

DELETE FROM orders
WHERE order_number LIKE 'ORD-TEST%'
OR order_number LIKE 'ORD-2025%';

-- 4. Test bildirimlerini temizle
DELETE FROM notifications
WHERE title LIKE '%Test%' OR title LIKE '%Migration%';

-- 5. Stokları sıfırla (yeterli stok için)
UPDATE raw_materials
SET quantity = 10000
WHERE code IN ('HM-CELIK-001', 'HM-BOYA-001');

UPDATE semi_finished_products
SET quantity = 5000;

UPDATE finished_products
SET quantity = 100;

SELECT 'ADIM 0: Test verileri temizlendi, stoklar sifirlandi' as result;

