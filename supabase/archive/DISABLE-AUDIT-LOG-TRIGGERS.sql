-- 🔧 DISABLE: Audit Log Triggers for Zone Transfers
-- Bu dosya zone transfer işlemleri için audit log trigger'larını devre dışı bırakır

-- Zone transfers için audit trigger'ı kaldır
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_transfers;

-- Zone inventories için audit trigger'ı kaldır  
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_inventories;

-- Finished products için audit trigger'ı kaldır
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON finished_products;

-- Semi finished products için audit trigger'ı kaldır
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON semi_finished_products;

-- Raw materials için audit trigger'ı kaldır
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON raw_materials;

SELECT '✅ AUDIT LOG TRIGGERS DISABLED FOR ZONE TRANSFERS!' as result;
