-- =====================================================
-- STEP 5: notifications + target_roles (MIGRATION TEST!)
-- =====================================================

SELECT 
    'STEP 5: Notifications + target_roles' as step_name,
    COUNT(*) as total_notifications,
    COUNT(target_roles) as notifications_with_roles
FROM notifications;

-- target_roles testi
SELECT 
    id,
    type,
    title,
    message,
    target_roles,
    CASE 
        WHEN target_roles IS NOT NULL 
        THEN 'MIGRATION BASARILI!'
        ELSE 'target_roles bos'
    END as migration_result,
    is_read,
    created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 10;

