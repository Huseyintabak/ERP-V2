-- ============================================
-- ADIM 4 SONUÇLARI: Material Consumption Trigger
-- ============================================

-- 1. Production log oluşturuldu mu?
SELECT 
    'Production Log' as check_type,
    pl.id as log_id,
    pl.plan_id,
    pl.barcode_scanned,
    pl.quantity_produced,
    pl.timestamp,
    pp.product_id,
    fp.name as product_name
FROM production_logs pl
JOIN production_plans pp ON pp.id = pl.plan_id
JOIN finished_products fp ON fp.id = pp.product_id
WHERE pl.timestamp >= NOW() - INTERVAL '10 minutes'
ORDER BY pl.timestamp DESC;

-- 2. Stock movements oluşturuldu mu? (production_log_id ile)
SELECT 
    'Stock Movements' as check_type,
    sm.id as movement_id,
    sm.movement_type,
    sm.material_type,
    sm.quantity,
    sm.production_log_id,
    CASE 
        WHEN sm.material_type = 'raw' THEN rm.name
        WHEN sm.material_type = 'semi' THEN sfp.name
    END as material_name,
    CASE 
        WHEN sm.material_type = 'raw' THEN rm.code
        WHEN sm.material_type = 'semi' THEN sfp.code
    END as material_code
FROM stock_movements sm
LEFT JOIN raw_materials rm ON sm.material_type = 'raw' AND sm.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON sm.material_type = 'semi' AND sm.material_id = sfp.id
WHERE sm.production_log_id IS NOT NULL
  AND sm.created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY sm.created_at DESC;

-- 3. SONUÇ: Trigger başarılı mı?
SELECT 
    CASE 
        WHEN COUNT(DISTINCT pl.id) > 0 AND COUNT(DISTINCT sm.id) > 0 THEN '✅✅✅ MATERIAL CONSUMPTION TRİGGER BAŞARILI!'
        WHEN COUNT(DISTINCT pl.id) > 0 AND COUNT(DISTINCT sm.id) = 0 THEN '❌ Production log var AMA stock movements yok!'
        ELSE '❌ Production log bile yok!'
    END as test_result,
    COUNT(DISTINCT pl.id) as production_logs_count,
    COUNT(DISTINCT sm.id) as stock_movements_count
FROM production_logs pl
LEFT JOIN stock_movements sm ON sm.production_log_id = pl.id
WHERE pl.timestamp >= NOW() - INTERVAL '10 minutes';

