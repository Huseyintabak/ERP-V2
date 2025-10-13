-- ============================================
-- BOM SNAPSHOT FINAL CHECK
-- ============================================

-- 1. Production Plan (ORD-2025-011)
SELECT 
    'Production Plan' as check_type,
    pp.id as plan_id,
    pp.product_id,
    fp.name as product_name,
    pp.planned_quantity,
    pp.status,
    o.order_number
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
LEFT JOIN finished_products fp ON fp.id = pp.product_id
WHERE o.order_number = 'ORD-2025-011';

-- 2. BOM Snapshot (ORD-2025-011 için oluşturuldu mu?)
SELECT 
    'BOM Snapshot' as check_type,
    pbs.plan_id,
    pbs.material_type,
    pbs.material_id,
    pbs.material_code,
    pbs.material_name,
    pbs.quantity_needed
FROM production_plan_bom_snapshot pbs
JOIN production_plans pp ON pp.id = pbs.plan_id
JOIN orders o ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-011'
ORDER BY pbs.material_name;

-- 3. Özet: BOM Snapshot Başarılı mı?
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ BOM SNAPSHOT BAŞARILI!'
        ELSE '❌ BOM SNAPSHOT OLUŞMADI!'
    END as migration_result,
    COUNT(*) as snapshot_count,
    'Migration testi tamamlandı' as status
FROM production_plan_bom_snapshot pbs
JOIN production_plans pp ON pp.id = pbs.plan_id
JOIN orders o ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-011';

