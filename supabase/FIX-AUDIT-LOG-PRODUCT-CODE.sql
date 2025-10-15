-- 🔧 FIX: Audit Log System - Product Code Field Issue
-- Bu dosya audit log trigger'ındaki product_code alanı hatasını düzeltir

-- Önce mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_transfers;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_inventories;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON semi_finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON raw_materials;

-- Düzeltilmiş audit log trigger fonksiyonu
CREATE OR REPLACE FUNCTION audit_stock_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    action_type VARCHAR(20);
    old_data JSONB;
    new_data JSONB;
    description TEXT;
    severity_level VARCHAR(20);
    table_name VARCHAR(100);
BEGIN
    -- Determine table name
    table_name := TG_TABLE_NAME;
    
    IF TG_OP = 'INSERT' THEN
        action_type := 'INSERT';
        new_data := to_jsonb(NEW);
        description := 'Yeni stok ürünü eklendi: ' || COALESCE(NEW.name, NEW.id::TEXT) || ' (' || table_name || ')';
        severity_level := 'medium';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
            description := 'Stok miktarı değiştirildi: ' || COALESCE(NEW.name, NEW.id::TEXT) || 
                          ' (' || OLD.quantity || ' -> ' || NEW.quantity || ')';
            severity_level := 'high';
        ELSIF OLD.unit_cost IS DISTINCT FROM NEW.unit_cost THEN
            description := 'Birim maliyet güncellendi: ' || COALESCE(NEW.name, NEW.id::TEXT) || 
                          ' (' || OLD.unit_cost || ' -> ' || NEW.unit_cost || ')';
            severity_level := 'medium';
        ELSE
            description := 'Stok ürünü güncellendi: ' || COALESCE(NEW.name, NEW.id::TEXT);
            severity_level := 'low';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        description := 'Stok ürünü silindi: ' || COALESCE(OLD.name, OLD.id::TEXT) || ' (' || table_name || ')';
        severity_level := 'critical';
    END IF;

    PERFORM log_audit_event(
        NULL, -- Stock changes might not have a specific user
        action_type,
        table_name,
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        old_data,
        new_data,
        description,
        severity_level,
        'inventory'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger'ları yeniden oluştur
CREATE TRIGGER audit_trigger_stock_changes
    AFTER INSERT OR UPDATE OR DELETE ON zone_transfers
    FOR EACH ROW EXECUTE FUNCTION audit_stock_changes();

CREATE TRIGGER audit_trigger_stock_changes
    AFTER INSERT OR UPDATE OR DELETE ON zone_inventories
    FOR EACH ROW EXECUTE FUNCTION audit_stock_changes();

CREATE TRIGGER audit_trigger_stock_changes
    AFTER INSERT OR UPDATE OR DELETE ON finished_products
    FOR EACH ROW EXECUTE FUNCTION audit_stock_changes();

CREATE TRIGGER audit_trigger_stock_changes
    AFTER INSERT OR UPDATE OR DELETE ON semi_finished_products
    FOR EACH ROW EXECUTE FUNCTION audit_stock_changes();

CREATE TRIGGER audit_trigger_stock_changes
    AFTER INSERT OR UPDATE OR DELETE ON raw_materials
    FOR EACH ROW EXECUTE FUNCTION audit_stock_changes();

-- Grant permissions
GRANT EXECUTE ON FUNCTION audit_stock_changes() TO authenticated;
GRANT EXECUTE ON FUNCTION audit_stock_changes() TO service_role;

SELECT '✅ AUDIT LOG TRIGGER FIXED - PRODUCT_CODE FIELD ISSUE RESOLVED!' as result;
