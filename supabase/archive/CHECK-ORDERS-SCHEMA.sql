-- ============================================
-- CHECK: Orders Table Schema
-- ============================================

-- 1. Orders tablosunun tüm kolonlarını listele
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- 2. order_items tablosu var mı?
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 3. Yeni oluşturulan siparişi kontrol et (mevcut kolonlarla)
SELECT 
    id,
    order_number,
    customer_name,
    customer_id,
    status,
    priority,
    delivery_date,
    created_at
FROM orders
WHERE order_number = 'ORD-2025-011';

-- 4. Bu siparişe ait order_items kayıtlarını kontrol et (eğer ayrı tablo ise)
SELECT 
    oi.*
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
WHERE o.order_number = 'ORD-2025-011';

