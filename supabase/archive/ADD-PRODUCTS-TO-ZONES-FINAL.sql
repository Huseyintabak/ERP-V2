-- ═══════════════════════════════════════════════════════════
-- 🏭 ZONE'LARA ÜRÜN EKLEME (FINAL)
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    v_merkez_zone_id UUID := '41b496ba-0e3f-4a08-89ae-6119e3cfd0e3';
    v_ltsauto_zone_id UUID := 'c6ef3be6-3854-4df6-a458-f4f01a29cfb7';
    v_inserted_count INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '       ZONE INVENTORY - URUN EKLEME';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Merkez Depo Zone ID: %', v_merkez_zone_id;
    RAISE NOTICE '✅ Ltsauto Zone ID: %', v_ltsauto_zone_id;
    RAISE NOTICE '';

    -- Merkez Depo'ya finished products ekle (stok > 0 olanlar)
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
        LEAST(fp.quantity, 50.00), -- Her üründen max 50 adet
        NOW(),
        NOW()
    FROM finished_products fp
    WHERE fp.quantity > 0
    ORDER BY fp.quantity DESC
    LIMIT 15 -- İlk 15 ürün
    ON CONFLICT (zone_id, material_type, material_id) 
    DO UPDATE SET 
        quantity = zone_inventories.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    
    RAISE NOTICE '✅ MERKEZ DEPO: % urun eklendi!', v_inserted_count;
    RAISE NOTICE '';
    
    -- Ltsauto Zone'a birkaç ürün ekle (transfer testi için)
    INSERT INTO zone_inventories (
        zone_id,
        material_type,
        material_id,
        quantity,
        created_at,
        updated_at
    )
    SELECT 
        v_ltsauto_zone_id,
        'finished',
        fp.id,
        5.00, -- Her üründen 5 adet
        NOW(),
        NOW()
    FROM finished_products fp
    WHERE fp.quantity > 0
    ORDER BY fp.quantity DESC
    LIMIT 3 -- Sadece 3 ürün
    ON CONFLICT (zone_id, material_type, material_id) 
    DO UPDATE SET 
        quantity = zone_inventories.quantity + EXCLUDED.quantity,
        updated_at = NOW();
    
    GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
    
    RAISE NOTICE '✅ LTSAUTO ZONE: % urun eklendi!', v_inserted_count;
    RAISE NOTICE '';
    
END $$;

-- Kontrol: Zone'lardaki ürünler
SELECT 
    '📦 ZONE INVENTORY - SUMMARY' as info,
    wz.name as zone_name,
    COUNT(*) as product_count,
    SUM(zi.quantity) as total_quantity
FROM zone_inventories zi
JOIN warehouse_zones wz ON wz.id = zi.zone_id
GROUP BY wz.name
ORDER BY wz.name;

-- Detay
SELECT 
    '📋 ZONE INVENTORY - DETAIL' as info,
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
ORDER BY wz.name, zi.quantity DESC;



