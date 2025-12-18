-- ============================================
-- DEBUG: Approve Error - Order Structure Check
-- ============================================

-- 1. Yeni oluşturulan siparişi kontrol et
SELECT 
    id,
    order_number,
    customer_name,
    status,
    order_items,
    jsonb_typeof(order_items) as order_items_type,
    jsonb_array_length(order_items) as items_count
FROM orders
WHERE order_number = 'ORD-2025-011';

-- 2. order_items içindeki yapıyı kontrol et
SELECT 
    order_number,
    jsonb_array_elements(order_items) as item_detail
FROM orders
WHERE order_number = 'ORD-2025-011';

-- 3. product_id'lerin varlığını kontrol et
WITH order_products AS (
    SELECT 
        o.order_number,
        (jsonb_array_elements(o.order_items)->>'product_id')::UUID as product_id,
        (jsonb_array_elements(o.order_items)->>'quantity')::INT as quantity
    FROM orders o
    WHERE o.order_number = 'ORD-2025-011'
)
SELECT 
    op.order_number,
    op.product_id,
    op.quantity,
    fp.name as product_name,
    fp.barcode
FROM order_products op
LEFT JOIN finished_products fp ON fp.id = op.product_id;

-- 4. orders tablosunun schema'sını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

