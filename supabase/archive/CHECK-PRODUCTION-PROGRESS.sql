-- ============================================
-- CHECK: Production Progress (UI vs Database)
-- ============================================

-- 1. Production plan durumu
SELECT 
    'Production Plan' as check_type,
    pp.id,
    o.order_number,
    fp.name as product_name,
    pp.planned_quantity,
    pp.produced_quantity,
    pp.status,
    CONCAT(ROUND((pp.produced_quantity / pp.planned_quantity) * 100), '%') as progress_percentage
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
JOIN finished_products fp ON fp.id = pp.product_id
WHERE o.order_number = 'ORD-2025-011';

-- 2. Production logs
SELECT 
    'Production Logs' as check_type,
    pl.id,
    pl.barcode_scanned,
    pl.quantity_produced,
    pl.timestamp,
    pp.id as plan_id
FROM production_logs pl
JOIN production_plans pp ON pp.id = pl.plan_id
JOIN orders o ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-011'
ORDER BY pl.timestamp DESC;

-- 3. Özet
SELECT 
    CASE 
        WHEN pp.produced_quantity > 0 THEN '✅ İlerleme var (produced_quantity > 0)'
        ELSE '❌ İlerleme yok (produced_quantity = 0) - UI bug!'
    END as ui_bug_check,
    pp.produced_quantity,
    (SELECT COUNT(*) FROM production_logs WHERE plan_id = pp.id) as total_logs
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-011';



