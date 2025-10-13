-- ============================================
-- CHECK: Operator User ID vs Assigned ID
-- ============================================

-- 1. Thunder Operatör'ün user bilgisi
SELECT 
    'Thunder Operator User' as info_type,
    u.id as user_id,
    u.email,
    u.role,
    o.id as operator_id,
    o.series,
    o.location
FROM users u
JOIN operators o ON o.id = u.id
WHERE u.email LIKE '%operator%' OR u.email LIKE '%thunder%'
ORDER BY u.created_at;

-- 2. Production plan'ın assigned_operator_id
SELECT 
    'Production Plan Assignment' as info_type,
    pp.id as plan_id,
    pp.assigned_operator_id,
    ord.order_number,
    u.email as assigned_operator_email,
    o.series as assigned_operator_series
FROM production_plans pp
JOIN orders ord ON ord.id = pp.order_id
LEFT JOIN users u ON u.id = pp.assigned_operator_id
LEFT JOIN operators o ON o.id = pp.assigned_operator_id
WHERE ord.order_number = 'ORD-2025-011';

-- 3. Eşleşme kontrolü
SELECT 
    CASE 
        WHEN pp.assigned_operator_id = u.id THEN '✅ ID eşleşiyor'
        ELSE '❌ ID eşleşmiyor'
    END as match_status,
    pp.assigned_operator_id as plan_operator_id,
    u.id as thunder_operator_user_id,
    u.email
FROM production_plans pp
CROSS JOIN users u
JOIN orders ord ON ord.id = pp.order_id
WHERE ord.order_number = 'ORD-2025-011'
  AND u.email = 'operator@thunder.com'
LIMIT 1;



