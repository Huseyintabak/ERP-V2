-- Hangi zone inventory tablosu kullanılıyor?

-- 1. zone_inventory kayıt sayısı
SELECT 
    'zone_inventory' as table_name,
    COUNT(*) as record_count
FROM zone_inventory;

-- 2. zone_inventories kayıt sayısı
SELECT 
    'zone_inventories' as table_name,
    COUNT(*) as record_count
FROM zone_inventories;

-- 3. Eğer zone_inventories dolu ise içeriğini göster
SELECT 
    '📦 ZONE_INVENTORIES DATA' as info,
    zi.id,
    wz.name as zone_name,
    zi.material_type,
    zi.material_id,
    zi.quantity,
    CASE 
        WHEN zi.material_type = 'finished' THEN (SELECT name FROM finished_products WHERE id = zi.material_id)
        WHEN zi.material_type = 'semi' THEN (SELECT name FROM semi_finished_products WHERE id = zi.material_id)
        WHEN zi.material_type = 'raw' THEN (SELECT name FROM raw_materials WHERE id = zi.material_id)
    END as material_name
FROM zone_inventories zi
JOIN warehouse_zones wz ON wz.id = zi.zone_id
ORDER BY wz.name, zi.material_type
LIMIT 10;



