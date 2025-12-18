-- ============================================
-- DOĞRU Operatör'ü Ata (11111111...)
-- ============================================

-- ORD-2025-011 production plan'ına 11111111 operatörünü ata
UPDATE production_plans pp
SET 
    assigned_operator_id = '11111111-1111-1111-1111-111111111111',
    updated_at = NOW()
FROM orders o
WHERE pp.order_id = o.id 
  AND o.order_number = 'ORD-2025-011';

-- Sonucu kontrol et
SELECT 
    pp.id as plan_id,
    o.order_number,
    fp.name as product_name,
    fp.barcode as product_barcode,
    pp.planned_quantity,
    pp.status,
    pp.assigned_operator_id,
    op.series as operator_series,
    op.location as operator_location,
    CASE 
        WHEN pp.assigned_operator_id = '11111111-1111-1111-1111-111111111111' 
        THEN '✅ Doğru operatör atandı!'
        ELSE '❌ Yanlış operatör!'
    END as check_result
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
JOIN finished_products fp ON fp.id = pp.product_id
LEFT JOIN operators op ON op.id = pp.assigned_operator_id
WHERE o.order_number = 'ORD-2025-011';



