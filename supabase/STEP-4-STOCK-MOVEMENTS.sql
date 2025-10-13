-- =====================================================
-- STEP 4: stock_movements + production_log_id (MIGRATION TEST!)
-- =====================================================

SELECT 
    'STEP 4: Stock Movements + production_log_id' as step_name,
    COUNT(*) as total_movements,
    COUNT(production_log_id) as movements_with_log_id
FROM stock_movements;

-- EN ONEMLI TEST: production_log_id dolu mu?
SELECT 
    id as movement_id,
    material_type,
    movement_type,
    quantity,
    production_log_id,
    CASE 
        WHEN production_log_id IS NOT NULL 
        THEN 'MIGRATION BASARILI!'
        ELSE 'production_log_id bos'
    END as migration_result,
    created_at
FROM stock_movements
ORDER BY created_at DESC
LIMIT 10;

