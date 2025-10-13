-- ==========================================
-- ZORLA TÜM AUDIT SİSTEMİNİ KALDIR
-- ==========================================

-- 1. TÜM TRIGGER'LARI ZORLA KALDIR
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_orders ON orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_production_plans ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_bom ON bom CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_users ON users CASCADE;

-- 2. TÜM AUDIT FUNCTION'LARINI KALDIR
DROP FUNCTION IF EXISTS audit_log_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.audit_log_trigger() CASCADE;

-- 3. AUDIT_LOGS TABLOSUNU KALDIR
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 4. TÜM TRIGGER'LARI LİSTELE
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  trigger_schema
FROM information_schema.triggers
WHERE trigger_schema = 'public';

-- 5. TÜM FUNCTION'LARI LİSTELE
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%audit%';

-- 6. SADECE AUDIT OLMAYAN TRIGGER'LARI GÖSTER
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name NOT LIKE '%audit%';

