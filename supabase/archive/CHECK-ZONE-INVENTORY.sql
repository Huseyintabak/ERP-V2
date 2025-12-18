-- Zone'ları ve inventory'yi kontrol et

-- 1. Zone'lar
SELECT 
    '🏭 ZONES' as info,
    id,
    name,
    zone_type,
    customer_id,
    created_at
FROM warehouse_zones
ORDER BY name;

-- 2. Zone Inventory (varsa)
SELECT 
    '📦 ZONE INVENTORY' as info,
    wzi.id,
    wz.name as zone_name,
    wzi.product_type,
    wzi.product_id,
    wzi.quantity
FROM warehouse_zone_inventory wzi
JOIN warehouse_zones wz ON wz.id = wzi.zone_id
ORDER BY wz.name;

-- 3. Finished Products (Zone'a atanmamış)
SELECT 
    '🎯 FINISHED PRODUCTS (Toplam)' as info,
    COUNT(*) as total_count,
    SUM(quantity) as total_quantity
FROM finished_products;

-- 4. Finished Products Detay
SELECT 
    '📋 FINISHED PRODUCTS (İlk 5)' as info,
    id,
    code,
    name,
    quantity,
    barcode
FROM finished_products
ORDER BY created_at DESC
LIMIT 5;



