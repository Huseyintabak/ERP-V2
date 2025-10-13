-- Zone ID'lerini ve inventory'leri kontrol et

-- UI'daki zone ID
SELECT 
    '🔍 UI ZONE ID' as info,
    id,
    name,
    zone_type
FROM warehouse_zones
WHERE id = '41b496ba-0e3f-4a08-89ae-6119e3cfd0e3';

-- zone_inventories tablosundaki zone ID'ler
SELECT 
    '📦 INVENTORY ZONE IDS' as info,
    zone_id,
    COUNT(*) as product_count
FROM zone_inventories
GROUP BY zone_id
ORDER BY product_count DESC;

-- Tüm zone'lar ve isimleri
SELECT 
    '📋 ALL ZONES' as info,
    wz.id,
    wz.name,
    wz.zone_type,
    COUNT(zi.id) as inventory_count
FROM warehouse_zones wz
LEFT JOIN zone_inventories zi ON zi.zone_id = wz.id
GROUP BY wz.id, wz.name, wz.zone_type
ORDER BY inventory_count DESC;

