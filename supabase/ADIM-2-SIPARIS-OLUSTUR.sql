-- =====================================================
-- ADIM 2: Yeni Siparis Olustur
-- =====================================================

-- Yeni siparis ekle
INSERT INTO orders (
    customer_id,
    order_number,
    priority,
    status,
    delivery_date,
    order_items,
    created_at,
    updated_at
)
SELECT 
    c.id as customer_id,
    'REAL-TEST-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0') as order_number,
    'orta' as priority,
    'beklemede' as status,
    (CURRENT_DATE + INTERVAL '7 days')::DATE as delivery_date,
    jsonb_build_array(
        jsonb_build_object(
            'product_id', fp.id,
            'product_code', fp.code,
            'product_name', fp.name,
            'quantity', 3,
            'unit_price', fp.sale_price,
            'total_price', fp.sale_price * 3
        )
    ) as order_items,
    NOW() as created_at,
    NOW() as updated_at
FROM customers c
CROSS JOIN finished_products fp
WHERE c.is_active = true
  AND fp.code LIKE 'NM%'
LIMIT 1
RETURNING 
    order_number,
    status,
    (order_items->0->>'product_name') as product_name,
    (order_items->0->>'quantity')::INTEGER as quantity,
    'ADIM 2 BASARILI - Siparis olusturuldu!' as result;

