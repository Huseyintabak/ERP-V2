-- ============================================
-- ADIM 3: SİPARİŞ ONAYLAMA & BOM SNAPSHOT TEST
-- ============================================

-- Test senaryosu:
-- 1. Siparişi onayla (status = 'uretimde')
-- 2. Production plan oluştur
-- 3. BOM snapshot oluşturulduğunu kontrol et

DO $$
DECLARE
    v_order_id UUID;
    v_product_id UUID;
    v_quantity DECIMAL;
    v_plan_id UUID;
    v_snapshot_count INT;
BEGIN
    -- 1. ORD-2025-011 siparişini bul
    SELECT id INTO v_order_id
    FROM orders
    WHERE order_number = 'ORD-2025-011';

    IF v_order_id IS NULL THEN
        RAISE EXCEPTION 'Sipariş bulunamadı!';
    END IF;

    RAISE NOTICE 'Sipariş ID: %', v_order_id;

    -- 2. Siparişi onayla
    UPDATE orders
    SET status = 'uretimde',
        updated_at = NOW()
    WHERE id = v_order_id;

    RAISE NOTICE 'Sipariş onaylandı (status = uretimde)';

    -- 3. Order item bilgilerini al
    SELECT product_id, quantity
    INTO v_product_id, v_quantity
    FROM order_items
    WHERE order_id = v_order_id
    LIMIT 1;

    RAISE NOTICE 'Product ID: %, Quantity: %', v_product_id, v_quantity;

    -- 4. Production plan oluştur
    INSERT INTO production_plans (
        order_id,
        product_id,
        planned_quantity,
        produced_quantity,
        status,
        created_at,
        updated_at
    )
    VALUES (
        v_order_id,
        v_product_id,
        v_quantity,
        0,
        'planlandi',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_plan_id;

    RAISE NOTICE 'Production plan oluşturuldu: %', v_plan_id;

    -- 5. BOM snapshot oluşturuldu mu kontrol et (trigger otomatik çalıştı)
    SELECT COUNT(*)
    INTO v_snapshot_count
    FROM production_plan_bom_snapshot
    WHERE production_plan_id = v_plan_id;

    RAISE NOTICE 'BOM snapshot kayıt sayısı: %', v_snapshot_count;

    IF v_snapshot_count > 0 THEN
        RAISE NOTICE '✅ BOM SNAPSHOT BAŞARILI!';
    ELSE
        RAISE NOTICE '❌ BOM SNAPSHOT OLUŞMADI!';
    END IF;

END $$;

-- Sonuçları kontrol et
SELECT 
    'Production Plan' as table_name,
    pp.id,
    pp.order_id,
    pp.product_id,
    pp.planned_quantity,
    pp.status,
    o.order_number
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-011';

SELECT 
    'BOM Snapshot' as table_name,
    pbs.production_plan_id,
    pbs.raw_material_id,
    rm.name as material_name,
    pbs.quantity_required,
    pbs.unit
FROM production_plan_bom_snapshot pbs
JOIN production_plans pp ON pp.id = pbs.production_plan_id
JOIN raw_materials rm ON rm.id = pbs.raw_material_id
JOIN orders o ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-011';
