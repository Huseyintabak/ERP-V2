-- Basit kontrol: zone tabloları var mı?

-- 1. zone_inventory var mı?
SELECT 
    'zone_inventory' as table_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'zone_inventory'
    ) as exists;

-- 2. zone_transfers var mı?
SELECT 
    'zone_transfers' as table_name,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'zone_transfers'
    ) as exists;

-- 3. Varsa zone_inventory kayıt sayısı
SELECT 
    '📦 ZONE INVENTORY COUNT' as info,
    COUNT(*) as total_records
FROM zone_inventory;



