-- ═══════════════════════════════════════════════════════════
-- 🏭 MERKEZ DEPO'YA ÜRÜN EKLE (TEST DATA)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    v_merkez_zone_id UUID;
    v_product_id UUID;
    v_inserted_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '     MERKEZ DEPO ZONE - URUN EKLEME';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Merkez Depo zone ID'sini bul
    SELECT id INTO v_merkez_zone_id
    FROM warehouse_zones
    WHERE name = 'Merkez Depo'
    LIMIT 1;
    
    IF v_merkez_zone_id IS NULL THEN
        RAISE EXCEPTION 'Merkez Depo zone bulunamadi!';
    END IF;
    
    RAISE NOTICE '✅ Merkez Depo Zone ID: %', v_merkez_zone_id;
    RAISE NOTICE '';

    -- İlk 10 finished product'ı Merkez Depo'ya ekle
    INSERT INTO zone_inventories (
        zone_id,
        material_type,
        material_id,
        quantity,
        created_at,
        updated_at
    )
    SELECT 
        v_merkez_zone_id,
        'finished',
        fp.id,
        fp.quantity, -- Mevcut stoğu zone'a ekle
        NOW(),
        NOW()
    FROM finished_products fp
    WHERE fp.quantity > 0 -- Sadece stoğu olan ürünler
    ORDER BY fp.created_at DESC
    LIMIT 10
    ON CONFLICT (zone_id, material_type, material_id) 
    DO UPDATE SET 
        quantity = zone_inventories.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    
    RAISE NOTICE '✅ % adet urun Merkez Depo''ya eklendi!', v_inserted_count;
    RAISE NOTICE '';
    
END $$;

-- Kontrol: Merkez Depo zone inventory
SELECT 
    '📦 MERKEZ DEPO INVENTORY' as info,
    wz.name as zone_name,
    zi.material_type,
    fp.code as product_code,
    fp.name as product_name,
    zi.quantity,
    fp.sale_price,
    (zi.quantity * fp.sale_price) as total_value
FROM zone_inventories zi
JOIN warehouse_zones wz ON wz.id = zi.zone_id
LEFT JOIN finished_products fp ON fp.id = zi.material_id AND zi.material_type = 'finished'
WHERE wz.name = 'Merkez Depo'
ORDER BY zi.quantity DESC;

-- Özet
SELECT 
    '📊 SUMMARY' as info,
    wz.name as zone_name,
    COUNT(*) as product_count,
    SUM(zi.quantity) as total_quantity
FROM zone_inventories zi
JOIN warehouse_zones wz ON wz.id = zi.zone_id
GROUP BY wz.name
ORDER BY wz.name;

