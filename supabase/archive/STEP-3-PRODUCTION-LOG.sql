-- =====================================================
-- STEP 3: Production Log Var Mi?
-- =====================================================

SELECT 
    'STEP 3: Production Logs Kontrolu' as step_name,
    COUNT(*) as log_count
FROM production_logs;

-- Detayli bilgi
SELECT 
    id,
    plan_id,
    operator_id,
    barcode_scanned,
    quantity_produced,
    timestamp
FROM production_logs
ORDER BY timestamp DESC
LIMIT 5;

