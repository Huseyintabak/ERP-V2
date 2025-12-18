-- =====================================================
-- ADIM 2: SQL ile Siparis Olustur (UI bypass)
-- =====================================================

-- Mevcut musteri ve urun bilgilerini kontrol et
SELECT 
    'Musteri:' as info_type,
    id,
    name,
    company
FROM customers
WHERE is_active = true
LIMIT 1;

SELECT 
    'Urun:' as info_type,
    id,
    code,
    name,
    barcode,
    sale_price
FROM finished_products
WHERE code LIKE 'NM%'
LIMIT 1;

-- Yeni siparis olustur (orders tablosu)
WITH new_order AS (
    INSERT INTO orders (
        customer_id,
        customer_name,
        order_number,
        priority,
        status,
        delivery_date,
        created_by,
        created_at,
        updated_at
    )
    SELECT 
        c.id as customer_id,
        c.name as customer_name,
        'REAL-TEST-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS') as order_number,
        'orta' as priority,
        'beklemede' as status,
        (CURRENT_DATE + INTERVAL '7 days')::DATE as delivery_date,
        (SELECT id FROM users WHERE role = 'planlama' LIMIT 1) as created_by,
        NOW() as created_at,
        NOW() as updated_at
    FROM customers c
    WHERE c.is_active = true
    LIMIT 1
    RETURNING id, order_number, status, delivery_date
)
-- order_items tablosuna urun ekle
INSERT INTO order_items (
    order_id,
    product_id,
    quantity,
    created_at,
    updated_at
)
SELECT 
    new_order.id,
    fp.id,
    3,
    NOW(),
    NOW()
FROM new_order
CROSS JOIN finished_products fp
WHERE fp.code LIKE 'NM%'
LIMIT 1
RETURNING 
    order_id,
    product_id,
    quantity,
    (SELECT order_number FROM new_order) as order_number,
    'ADIM 2 TAMAM - Siparis ve urun eklendi!' as result;

