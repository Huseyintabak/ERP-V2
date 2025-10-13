-- ==========================================
-- PRICE CHANGE TRIGGER'LARINI KALDIR
-- ==========================================

-- 1. Price change trigger'larını kaldır
DROP TRIGGER IF EXISTS trigger_raw_price_change ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_semi_price_change ON semi_finished_products CASCADE;

-- 2. Price change function'ını kaldır
DROP FUNCTION IF EXISTS log_price_change() CASCADE;

-- 3. Price_history tablosunu da kaldır (geçici olarak)
DROP TABLE IF EXISTS price_history CASCADE;

-- 4. Diğer kritik trigger'ları da kaldır (geçici olarak)
DROP TRIGGER IF EXISTS trigger_consume_materials ON production_logs CASCADE;
DROP TRIGGER IF EXISTS trigger_production_log_stock ON production_logs CASCADE;
DROP TRIGGER IF EXISTS trigger_create_bom_snapshot ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_operator_count ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_release_reservations ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_raw_critical_stock ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_semi_critical_stock ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_finished_critical_stock ON finished_products CASCADE;

-- 5. Kontrol et - hangi trigger'lar kaldı
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

