-- ============================================
-- ADIM 4: MATERIAL CONSUMPTION TRIGGER TEST
-- ============================================
-- Test: Production log eklenince hammadde stokları düşmeli

-- 1. Önce mevcut stok seviyelerini kaydet
DO $$
DECLARE
    v_plan_id UUID;
    v_product_barcode TEXT;
    v_operator_id UUID;
    v_production_log_id UUID;
    
    -- Stok seviyeleri (test öncesi)
    v_aluminyum_stock_before DECIMAL;
    v_cam_stock_before DECIMAL;
    
    -- Stok seviyeleri (test sonrası)
    v_aluminyum_stock_after DECIMAL;
    v_cam_stock_after DECIMAL;
    
    -- BOM snapshot miktarları
    v_aluminyum_needed DECIMAL;
    v_cam_needed DECIMAL;
    
    -- Stock movement sayısı
    v_stock_movement_count INT;
BEGIN
    -- Production plan ID'sini al (ORD-2025-011)
    SELECT pp.id INTO v_plan_id
    FROM production_plans pp
    JOIN orders o ON o.id = pp.order_id
    WHERE o.order_number = 'ORD-2025-011'
    LIMIT 1;
    
    IF v_plan_id IS NULL THEN
        RAISE EXCEPTION 'Production plan bulunamadı!';
    END IF;
    
    RAISE NOTICE '📋 Production Plan ID: %', v_plan_id;
    
    -- Ürün barkodunu al
    SELECT fp.barcode INTO v_product_barcode
    FROM production_plans pp
    JOIN finished_products fp ON fp.id = pp.product_id
    WHERE pp.id = v_plan_id;
    
    RAISE NOTICE '📦 Ürün Barcode: %', v_product_barcode;
    
    -- Bir operatör ID'si al (test için)
    SELECT id INTO v_operator_id
    FROM operators
    LIMIT 1;
    
    IF v_operator_id IS NULL THEN
        RAISE NOTICE '⚠️  Operatör bulunamadı, dummy operator oluşturuluyor...';
        INSERT INTO operators (name, email, series, experience_years, daily_capacity, location, hourly_rate)
        VALUES ('Test Operatör', 'test@operator.com', 'thunder', 5, 10, 'Fabrika A', 50)
        RETURNING id INTO v_operator_id;
    END IF;
    
    -- Mevcut stok seviyelerini kaydet
    SELECT quantity INTO v_aluminyum_stock_before
    FROM raw_materials
    WHERE name ILIKE '%alüminyum%profil%'
    LIMIT 1;
    
    SELECT quantity INTO v_cam_stock_before
    FROM raw_materials
    WHERE name ILIKE '%cam%panel%'
    LIMIT 1;
    
    RAISE NOTICE '📊 Stok Durumu (Önce):';
    RAISE NOTICE '   - Alüminyum Profil: %', v_aluminyum_stock_before;
    RAISE NOTICE '   - Cam Panel: %', v_cam_stock_before;
    
    -- BOM snapshot'tan gerekli miktarları al (1 adet için)
    SELECT 
        MAX(CASE WHEN material_name ILIKE '%alüminyum%profil%' THEN quantity_needed / 5 END),
        MAX(CASE WHEN material_name ILIKE '%cam%panel%' THEN quantity_needed / 5 END)
    INTO v_aluminyum_needed, v_cam_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = v_plan_id;
    
    RAISE NOTICE '📊 BOM Snapshot (1 adet için):';
    RAISE NOTICE '   - Alüminyum Profil: %', v_aluminyum_needed;
    RAISE NOTICE '   - Cam Panel: %', v_cam_needed;
    
    -- Production log oluştur (1 adet üretim)
    RAISE NOTICE '';
    RAISE NOTICE '🏭 Production Log oluşturuluyor (1 adet)...';
    
    INSERT INTO production_logs (
        plan_id,
        operator_id,
        barcode_scanned,
        quantity_produced,
        timestamp
    )
    VALUES (
        v_plan_id,
        v_operator_id,
        v_product_barcode,
        1, -- 1 adet ürettik
        NOW()
    )
    RETURNING id INTO v_production_log_id;
    
    RAISE NOTICE '✅ Production Log oluşturuldu: %', v_production_log_id;
    
    -- Trigger çalıştı mı? Stokları kontrol et
    SELECT quantity INTO v_aluminyum_stock_after
    FROM raw_materials
    WHERE name ILIKE '%alüminyum%profil%'
    LIMIT 1;
    
    SELECT quantity INTO v_cam_stock_after
    FROM raw_materials
    WHERE name ILIKE '%cam%panel%'
    LIMIT 1;
    
    RAISE NOTICE '';
    RAISE NOTICE '📊 Stok Durumu (Sonra):';
    RAISE NOTICE '   - Alüminyum Profil: % (Fark: %)', v_aluminyum_stock_after, v_aluminyum_stock_before - v_aluminyum_stock_after;
    RAISE NOTICE '   - Cam Panel: % (Fark: %)', v_cam_stock_after, v_cam_stock_before - v_cam_stock_after;
    
    -- Stock movements kontrol et
    SELECT COUNT(*) INTO v_stock_movement_count
    FROM stock_movements
    WHERE production_log_id = v_production_log_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 Stock Movements:';
    RAISE NOTICE '   - Toplam kayıt: %', v_stock_movement_count;
    
    -- Sonuç
    RAISE NOTICE '';
    IF v_stock_movement_count > 0 AND 
       v_aluminyum_stock_after < v_aluminyum_stock_before AND 
       v_cam_stock_after < v_cam_stock_before THEN
        RAISE NOTICE '✅✅✅ MATERIAL CONSUMPTION TRİGGER BAŞARILI! ✅✅✅';
    ELSE
        RAISE NOTICE '❌ MATERIAL CONSUMPTION TRİGGER ÇALIŞMADI!';
    END IF;
    
END $$;

-- 2. Detaylı kontrol: Stock movements kayıtları
SELECT 
    'Stock Movements Detail' as check_type,
    sm.id,
    sm.movement_type,
    sm.material_type,
    sm.quantity,
    sm.production_log_id,
    CASE 
        WHEN sm.material_type = 'raw' THEN rm.name
        WHEN sm.material_type = 'semi' THEN sfp.name
    END as material_name
FROM stock_movements sm
LEFT JOIN raw_materials rm ON sm.material_type = 'raw' AND sm.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON sm.material_type = 'semi' AND sm.material_id = sfp.id
WHERE sm.production_log_id IN (
    SELECT id FROM production_logs 
    WHERE timestamp >= NOW() - INTERVAL '5 minutes'
)
ORDER BY sm.timestamp DESC;

-- 3. Production log ve plan durumu
SELECT 
    'Production Status' as check_type,
    pl.id as log_id,
    pl.barcode_scanned,
    pl.quantity_produced,
    pp.planned_quantity,
    pp.produced_quantity,
    pp.status
FROM production_logs pl
JOIN production_plans pp ON pp.id = pl.plan_id
WHERE pl.timestamp >= NOW() - INTERVAL '5 minutes'
ORDER BY pl.timestamp DESC;

