-- ============================================
-- CLEANUP - Tüm Tabloları Sil (Temiz Başlangıç)
-- ============================================
-- UYARI: Bu script tüm verileri siler!
-- Sadece hata aldığında kullan
-- ============================================

-- Trigger'ları sil
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users CASCADE;
DROP TRIGGER IF EXISTS trigger_raw_materials_updated_at ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_semi_finished_updated_at ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_finished_updated_at ON finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders CASCADE;
DROP TRIGGER IF EXISTS trigger_production_plans_updated_at ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_raw_price_change ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_semi_price_change ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_production_log_stock ON production_logs CASCADE;
DROP TRIGGER IF EXISTS trigger_consume_materials ON production_logs CASCADE;
DROP TRIGGER IF EXISTS trigger_operator_count ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_create_bom_snapshot ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_release_reservations ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_raw_critical_stock ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_semi_critical_stock ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_finished_critical_stock ON finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_orders ON orders CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_production_plans ON production_plans CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_bom ON bom CASCADE;
DROP TRIGGER IF EXISTS trigger_audit_users ON users CASCADE;

-- View'ları sil
DROP VIEW IF EXISTS v_yearly_average_prices CASCADE;
DROP VIEW IF EXISTS v_stock_values CASCADE;
DROP VIEW IF EXISTS v_active_production_stats CASCADE;

-- Tabloları sil (foreign key sırasına göre)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS production_logs CASCADE;
DROP TABLE IF EXISTS production_plan_bom_snapshot CASCADE;
DROP TABLE IF EXISTS material_reservations CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS production_plans CASCADE;
DROP TABLE IF EXISTS bom CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS finished_products CASCADE;
DROP TABLE IF EXISTS semi_finished_products CASCADE;
DROP TABLE IF EXISTS raw_materials CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS system_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Function'ları sil
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS log_price_change() CASCADE;
DROP FUNCTION IF EXISTS update_stock_on_production() CASCADE;
DROP FUNCTION IF EXISTS consume_materials_on_production() CASCADE;
DROP FUNCTION IF EXISTS update_operator_count() CASCADE;
DROP FUNCTION IF EXISTS check_critical_stock() CASCADE;
DROP FUNCTION IF EXISTS create_bom_snapshot() CASCADE;
DROP FUNCTION IF EXISTS audit_log_trigger() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS set_user_context(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_stock_availability(UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS create_material_reservations(UUID, UUID, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS release_reservations_on_plan_cancel() CASCADE;
DROP FUNCTION IF EXISTS approve_order_transaction(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS bulk_import_raw_materials(JSONB, UUID) CASCADE;
DROP FUNCTION IF EXISTS bulk_import_semi_finished(JSONB, UUID) CASCADE;
DROP FUNCTION IF EXISTS bulk_import_finished(JSONB, UUID) CASCADE;

-- Sequence'ı sil
DROP SEQUENCE IF EXISTS order_number_seq CASCADE;

-- ============================================
-- Cleanup Complete!
-- ============================================
-- Şimdi migration.sql'i tekrar çalıştır
-- ============================================

