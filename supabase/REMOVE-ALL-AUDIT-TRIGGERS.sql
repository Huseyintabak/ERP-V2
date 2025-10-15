-- 🔧 REMOVE: All Audit Log Triggers
-- Bu dosya tüm audit log trigger'larını kaldırır

-- Tüm audit trigger'ları kaldır
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_transfers;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_inventories;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON semi_finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON raw_materials;

-- Audit trigger fonksiyonunu kaldır
DROP FUNCTION IF EXISTS audit_stock_changes();

-- Audit log fonksiyonunu kaldır (eğer varsa)
DROP FUNCTION IF EXISTS log_audit_event(UUID, VARCHAR, VARCHAR, TEXT, JSONB, JSONB, TEXT, VARCHAR, VARCHAR);

SELECT '✅ ALL AUDIT LOG TRIGGERS REMOVED!' as result;
