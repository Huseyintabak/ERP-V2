-- ═══════════════════════════════════════════════════════════
-- 🏭 ZONE TRANSFER TEST DATA
-- ═══════════════════════════════════════════════════════════

-- ADIM 1: Zone ID'leri bul
DO $$
DECLARE
    v_merkez_zone_id UUID;
    v_ltsauto_zone_id UUID;
    v_product_id UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '           ZONE TRANSFER TEST - SETUP';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- Zone'ları bul
    SELECT id INTO v_merkez_zone_id
    FROM warehouse_zones
    WHERE name = 'Merkez Depo'
    LIMIT 1;
    
    SELECT id INTO v_ltsauto_zone_id
    FROM warehouse_zones
    WHERE name = 'Ltsauto - Depo'
    LIMIT 1;
    
    -- Finished product bul
    SELECT id INTO v_product_id
    FROM finished_products
    WHERE code = 'FP-KAPI-001'
    LIMIT 1;
    
    RAISE NOTICE '✅ Merkez Zone ID: %', v_merkez_zone_id;
    RAISE NOTICE '✅ Ltsauto Zone ID: %', v_ltsauto_zone_id;
    RAISE NOTICE '✅ Product ID: %', v_product_id;
    RAISE NOTICE '';
    
    -- Merkez Depo'ya 10 adet ürün ekle
    INSERT INTO warehouse_zone_inventory (
        zone_id,
        product_type,
        product_id,
        quantity,
        created_at,
        updated_at
    ) VALUES (
        v_merkez_zone_id,
        'finished',
        v_product_id,
        10.00,
        NOW(),
        NOW()
    )
    ON CONFLICT (zone_id, product_type, product_id) 
    DO UPDATE SET 
        quantity = warehouse_zone_inventory.quantity + 10.00,
        updated_at = NOW();
    
    RAISE NOTICE '✅ Merkez Depo''ya 10 adet urun eklendi!';
    RAISE NOTICE '';
    
END $$;

-- ADIM 2: Eklenen ürünleri kontrol et
SELECT 
    '📦 ZONE INVENTORY' as info,
    wz.name as zone_name,
    wzi.product_type,
    fp.name as product_name,
    fp.code as product_code,
    wzi.quantity,
    wzi.created_at
FROM warehouse_zone_inventory wzi
JOIN warehouse_zones wz ON wz.id = wzi.zone_id
LEFT JOIN finished_products fp ON fp.id = wzi.product_id AND wzi.product_type = 'finished'
ORDER BY wz.name, wzi.product_type;



