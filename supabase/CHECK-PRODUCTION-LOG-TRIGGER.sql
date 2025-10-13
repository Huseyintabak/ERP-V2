-- ============================================
-- CHECK: Production Log Trigger
-- ============================================

-- 1. production_logs tablosundaki trigger'ları listele
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'production_logs'
ORDER BY trigger_name;

-- 2. update_stock_on_production fonksiyonu var mı?
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'update_stock_on_production';



