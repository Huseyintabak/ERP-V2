-- ==========================================
-- Thunder ERP v2 - Check Existing Tables
-- ==========================================
-- Mevcut tabloları kontrol et

SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'production_logs',
    'production_plans', 
    'order_items',
    'orders',
    'bom',
    'notifications',
    'audit_logs',
    'finished_products',
    'semi_finished_products',
    'raw_materials',
    'operators',
    'users',
    'settings'
  )
ORDER BY table_name;

