-- ==========================================
-- TRIGGER'LARI KONTROL ET VE KALDIR
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Mevcut trigger'ları listele
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%audit%';

-- 2. Tüm audit trigger'larını kaldır
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_orders ON orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_production_plans ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_bom ON bom CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_users ON users CASCADE;

-- 3. Trigger'ları tekrar kontrol et
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%audit%';
