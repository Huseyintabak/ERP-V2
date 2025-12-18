-- ============================================
-- CHECK: BOM Snapshot Table Schema
-- ============================================

-- 1. production_plan_bom_snapshot tablosunun kolonlarını listele
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'production_plan_bom_snapshot'
ORDER BY ordinal_position;

-- 2. Tüm BOM snapshot kayıtlarını göster
SELECT *
FROM production_plan_bom_snapshot
LIMIT 10;

-- 3. En son oluşturulan production plan'ları göster
SELECT 
    pp.id,
    pp.order_id,
    pp.product_id,
    pp.planned_quantity,
    pp.status,
    pp.created_at,
    o.order_number
FROM production_plans pp
LEFT JOIN orders o ON o.id = pp.order_id
ORDER BY pp.created_at DESC
LIMIT 5;

