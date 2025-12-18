-- ============================================
-- Production Plan'a Operatör Ata
-- ============================================

-- ORD-2025-011 için oluşturulan production plan'a Thunder Operatör'ü ata
UPDATE production_plans pp
SET 
    assigned_operator_id = (SELECT id FROM operators WHERE series = 'thunder' AND current_status = 'idle' LIMIT 1),
    -- Status: planlandi kalır (operatör atanması status'u değiştirmez)
    updated_at = NOW()
FROM orders o
WHERE pp.order_id = o.id 
  AND o.order_number = 'ORD-2025-011';

-- Return güncelleme sayısını
SELECT 'Operatör atandı' as result;

-- Sonucu kontrol et
SELECT 
    pp.id as plan_id,
    o.order_number,
    fp.name as product_name,
    pp.planned_quantity,
    pp.status,
    pp.assigned_operator_id,
    op.series as operator_series,
    op.location as operator_location
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
JOIN finished_products fp ON fp.id = pp.product_id
LEFT JOIN operators op ON op.id = pp.assigned_operator_id
WHERE o.order_number = 'ORD-2025-011';

