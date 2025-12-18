-- ============================================
-- CLEANUP DATA ONLY (Tablo yapısı korunur)
-- ============================================
-- Sadece verileri temizler, tablolar/function'lar kalır
-- Seed data'yı tekrar çalıştırmadan önce kullan
-- ============================================

-- Foreign key sırasına göre tabloları temizle
DELETE FROM audit_logs;
DELETE FROM production_logs;
DELETE FROM production_plan_bom_snapshot;
DELETE FROM material_reservations;
DELETE FROM stock_movements;
DELETE FROM production_plans;
DELETE FROM bom;
DELETE FROM orders;
DELETE FROM operators;
DELETE FROM notifications;
DELETE FROM finished_products;
DELETE FROM semi_finished_products;
DELETE FROM raw_materials;
DELETE FROM price_history;
DELETE FROM system_settings;
DELETE FROM users;

-- Sequence'i sıfırla
ALTER SEQUENCE order_number_seq RESTART WITH 1;

-- ============================================
-- Cleanup Complete!
-- ============================================
-- Şimdi seed.sql'i tekrar çalıştırabilirsin
-- ============================================


