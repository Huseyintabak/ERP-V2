-- zone_inventories tablosunu tekrar kontrol

-- 1. Kayıt sayısı
SELECT 
    '📦 ZONE_INVENTORIES COUNT' as info,
    COUNT(*) as total_records
FROM zone_inventories;

-- 2. Tüm kayıtlar (varsa)
SELECT 
    '📋 ZONE_INVENTORIES RECORDS' as info,
    zi.id,
    wz.name as zone_name,
    zi.material_type,
    zi.material_id,
    zi.quantity,
    zi.created_at
FROM zone_inventories zi
LEFT JOIN warehouse_zones wz ON wz.id = zi.zone_id
ORDER BY zi.created_at DESC
LIMIT 20;

-- 3. Zone'lar
SELECT 
    '🏭 WAREHOUSE ZONES' as info,
    id,
    name,
    zone_type
FROM warehouse_zones
ORDER BY name;



