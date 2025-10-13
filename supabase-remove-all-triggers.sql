-- ==========================================
-- TÜM AUDIT TRIGGER'LARINI TAMAMEN KALDIR
-- ==========================================

-- 1. TÜM AUDIT TRIGGER'LARINI KALDIR (CASCADE ile)
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_orders ON orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_production_plans ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_bom ON bom CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_users ON users CASCADE;

-- 2. AUDIT FUNCTION'INI TAMAMEN KALDIR
DROP FUNCTION IF EXISTS audit_log_trigger() CASCADE;

-- 3. AUDIT_LOGS TABLOSUNU DA KALDIR (geçici olarak)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- 4. KONTROL ET - HİÇBİR AUDIT TRIGGER KALMAMALI
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%audit%';

-- 5. KONTROL ET - HİÇBİR AUDIT FUNCTION KALMAMALI
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%audit%';

