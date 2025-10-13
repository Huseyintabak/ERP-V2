-- =====================================================
-- STEP 2: BOM Snapshot Var Mi?
-- =====================================================

SELECT 
    'STEP 2: BOM Snapshot Kontrolu' as step_name,
    COUNT(*) as snapshot_count
FROM production_plan_bom_snapshot;

-- Detayli bilgi
SELECT 
    plan_id,
    material_type,
    material_code,
    material_name,
    quantity_needed
FROM production_plan_bom_snapshot
LIMIT 5;

