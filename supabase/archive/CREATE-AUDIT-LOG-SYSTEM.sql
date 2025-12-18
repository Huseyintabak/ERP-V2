-- Audit Log System
-- Comprehensive logging system for all system operations

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    table_name VARCHAR(100) NOT NULL, -- Table that was affected
    record_id VARCHAR(100), -- ID of the affected record
    old_values JSONB, -- Previous values (for UPDATE/DELETE)
    new_values JSONB, -- New values (for INSERT/UPDATE)
    description TEXT NOT NULL, -- Human readable description
    ip_address INET, -- IP address of the user
    user_agent TEXT, -- Browser/client information
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category VARCHAR(50) DEFAULT 'general' -- general, security, production, inventory, etc.
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action VARCHAR(50),
    p_table_name VARCHAR(100),
    p_description TEXT,
    p_record_id VARCHAR(100) DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_severity VARCHAR(20) DEFAULT 'medium',
    p_category VARCHAR(50) DEFAULT 'general',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        description,
        severity,
        category,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_values,
        p_new_values,
        p_description,
        p_severity,
        p_category,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to get audit log statistics
CREATE OR REPLACE FUNCTION get_audit_log_stats(
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS TABLE (
    total_events BIGINT,
    critical_events BIGINT,
    high_events BIGINT,
    medium_events BIGINT,
    low_events BIGINT,
    unique_users BIGINT,
    most_active_user TEXT,
    most_affected_table TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
        COUNT(*) FILTER (WHERE severity = 'high') as high_events,
        COUNT(*) FILTER (WHERE severity = 'medium') as medium_events,
        COUNT(*) FILTER (WHERE severity = 'low') as low_events,
        COUNT(DISTINCT user_id) as unique_users,
        (SELECT u.name FROM users u 
         JOIN audit_logs al ON u.id = al.user_id 
         WHERE (p_start_date IS NULL OR al.created_at >= p_start_date)
         AND (p_end_date IS NULL OR al.created_at <= p_end_date)
         GROUP BY u.name ORDER BY COUNT(*) DESC LIMIT 1) as most_active_user,
        (SELECT table_name FROM audit_logs 
         WHERE (p_start_date IS NULL OR created_at >= p_start_date)
         AND (p_end_date IS NULL OR created_at <= p_end_date)
         GROUP BY table_name ORDER BY COUNT(*) DESC LIMIT 1) as most_affected_table
    FROM audit_logs
    WHERE (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Create function to clean old audit logs
CREATE OR REPLACE FUNCTION clean_old_audit_logs(
    p_retention_days INTEGER DEFAULT 365
) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days
    AND severity IN ('low', 'medium');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the cleanup operation
    PERFORM log_audit_event(
        NULL, -- System operation
        'CLEANUP',
        'audit_logs',
        NULL,
        NULL,
        jsonb_build_object('deleted_count', deleted_count, 'retention_days', p_retention_days),
        'Eski audit log kayıtları temizlendi',
        'medium',
        'system',
        NULL,
        'System Cleanup'
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic audit logging

-- Users table audit trigger
CREATE OR REPLACE FUNCTION audit_users_trigger() RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    old_data JSONB;
    new_data JSONB;
    description TEXT;
    severity_level VARCHAR(20);
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        action_type := 'INSERT';
        new_data := to_jsonb(NEW);
        description := 'Yeni kullanıcı eklendi: ' || COALESCE(NEW.name, NEW.email);
        severity_level := 'high';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Check for sensitive changes
        IF OLD.role IS DISTINCT FROM NEW.role THEN
            description := 'Kullanıcı rolü değiştirildi: ' || COALESCE(NEW.name, NEW.email) || ' (' || OLD.role || ' -> ' || NEW.role || ')';
            severity_level := 'critical';
        ELSIF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
            description := 'Kullanıcı durumu değiştirildi: ' || COALESCE(NEW.name, NEW.email) || ' (' || 
                          CASE WHEN NEW.is_active THEN 'Aktif' ELSE 'Pasif' END || ')';
            severity_level := 'high';
        ELSE
            description := 'Kullanıcı bilgileri güncellendi: ' || COALESCE(NEW.name, NEW.email);
            severity_level := 'medium';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        description := 'Kullanıcı silindi: ' || COALESCE(OLD.name, OLD.email);
        severity_level := 'critical';
    END IF;

    -- Log the audit event
    PERFORM log_audit_event(
        COALESCE(NEW.id, OLD.id), -- Use NEW.id for INSERT, OLD.id for DELETE
        action_type,
        'users',
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        old_data,
        new_data,
        description,
        severity_level,
        'security'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for users table
DROP TRIGGER IF EXISTS users_audit_trigger ON users;
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_users_trigger();

-- Orders table audit trigger
CREATE OR REPLACE FUNCTION audit_orders_trigger() RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    old_data JSONB;
    new_data JSONB;
    description TEXT;
    severity_level VARCHAR(20);
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'INSERT';
        new_data := to_jsonb(NEW);
        description := 'Yeni sipariş oluşturuldu: #' || NEW.id;
        severity_level := 'medium';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            description := 'Sipariş durumu değiştirildi: #' || NEW.id || ' (' || OLD.status || ' -> ' || NEW.status || ')';
            severity_level := 'high';
        ELSIF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
            description := 'Sipariş tutarı güncellendi: #' || NEW.id || ' (' || OLD.total_amount || ' -> ' || NEW.total_amount || ')';
            severity_level := 'medium';
        ELSE
            description := 'Sipariş güncellendi: #' || NEW.id;
            severity_level := 'low';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        description := 'Sipariş silindi: #' || OLD.id;
        severity_level := 'critical';
    END IF;

    PERFORM log_audit_event(
        COALESCE(NEW.created_by, OLD.created_by),
        action_type,
        'orders',
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        old_data,
        new_data,
        description,
        severity_level,
        'production'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for orders table
DROP TRIGGER IF EXISTS orders_audit_trigger ON orders;
CREATE TRIGGER orders_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW EXECUTE FUNCTION audit_orders_trigger();

-- Production plans audit trigger
CREATE OR REPLACE FUNCTION audit_production_plans_trigger() RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    old_data JSONB;
    new_data JSONB;
    description TEXT;
    severity_level VARCHAR(20);
BEGIN
    IF TG_OP = 'INSERT' THEN
        action_type := 'INSERT';
        new_data := to_jsonb(NEW);
        description := 'Yeni üretim planı oluşturuldu: #' || NEW.id;
        severity_level := 'medium';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            description := 'Üretim planı durumu değiştirildi: #' || NEW.id || ' (' || OLD.status || ' -> ' || NEW.status || ')';
            severity_level := 'high';
        ELSIF OLD.assigned_operator_id IS DISTINCT FROM NEW.assigned_operator_id THEN
            description := 'Üretim planı operatör ataması değiştirildi: #' || NEW.id;
            severity_level := 'medium';
        ELSE
            description := 'Üretim planı güncellendi: #' || NEW.id;
            severity_level := 'low';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        description := 'Üretim planı silindi: #' || OLD.id;
        severity_level := 'critical';
    END IF;

    PERFORM log_audit_event(
        COALESCE(NEW.created_by, OLD.created_by),
        action_type,
        'production_plans',
        COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        old_data,
        new_data,
        description,
        severity_level,
        'production'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for production_plans table
DROP TRIGGER IF EXISTS production_plans_audit_trigger ON production_plans;
CREATE TRIGGER production_plans_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON production_plans
    FOR EACH ROW EXECUTE FUNCTION audit_production_plans_trigger();

-- Stock tables audit trigger (for raw_materials, semi_finished_products, finished_products)
CREATE OR REPLACE FUNCTION audit_stock_trigger() RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
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
        description := 'Yeni stok ürünü eklendi: ' || COALESCE(NEW.name, NEW.product_id::TEXT) || ' (' || table_name || ')';
        severity_level := 'medium';
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
            description := 'Stok miktarı değiştirildi: ' || COALESCE(NEW.name, NEW.product_id::TEXT) || 
                          ' (' || OLD.quantity || ' -> ' || NEW.quantity || ')';
            severity_level := 'high';
        ELSIF OLD.unit_cost IS DISTINCT FROM NEW.unit_cost THEN
            description := 'Birim maliyet güncellendi: ' || COALESCE(NEW.name, NEW.product_id::TEXT) || 
                          ' (' || OLD.unit_cost || ' -> ' || NEW.unit_cost || ')';
            severity_level := 'medium';
        ELSE
            description := 'Stok ürünü güncellendi: ' || COALESCE(NEW.name, NEW.product_id::TEXT);
            severity_level := 'low';
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        description := 'Stok ürünü silindi: ' || COALESCE(OLD.name, OLD.product_id::TEXT) || ' (' || table_name || ')';
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
$$ LANGUAGE plpgsql;

-- Create triggers for stock tables
DROP TRIGGER IF EXISTS raw_materials_audit_trigger ON raw_materials;
CREATE TRIGGER raw_materials_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON raw_materials
    FOR EACH ROW EXECUTE FUNCTION audit_stock_trigger();

DROP TRIGGER IF EXISTS semi_finished_products_audit_trigger ON semi_finished_products;
CREATE TRIGGER semi_finished_products_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON semi_finished_products
    FOR EACH ROW EXECUTE FUNCTION audit_stock_trigger();

DROP TRIGGER IF EXISTS finished_products_audit_trigger ON finished_products;
CREATE TRIGGER finished_products_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON finished_products
    FOR EACH ROW EXECUTE FUNCTION audit_stock_trigger();

-- Create view for audit log summary
CREATE OR REPLACE VIEW audit_log_summary AS
SELECT 
    DATE(created_at) as log_date,
    action,
    table_name,
    severity,
    category,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users
FROM audit_logs
GROUP BY DATE(created_at), action, table_name, severity, category
ORDER BY log_date DESC, event_count DESC;

-- Create function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
) RETURNS TABLE (
    action VARCHAR(50),
    table_name VARCHAR(100),
    event_count BIGINT,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.action,
        al.table_name,
        COUNT(*) as event_count,
        MAX(al.created_at) as last_activity
    FROM audit_logs al
    WHERE al.user_id = p_user_id
    AND al.created_at >= NOW() - INTERVAL '1 day' * p_days
    GROUP BY al.action, al.table_name
    ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample audit logs for testing
INSERT INTO audit_logs (user_id, action, table_name, record_id, description, severity, category) VALUES
(
    (SELECT id FROM users WHERE role = 'yonetici' LIMIT 1),
    'LOGIN',
    'users',
    NULL,
    'Sistem yöneticisi giriş yaptı',
    'medium',
    'security'
),
(
    (SELECT id FROM users WHERE role = 'planlama' LIMIT 1),
    'INSERT',
    'orders',
    '1',
    'Yeni sipariş oluşturuldu: #1',
    'medium',
    'production'
),
(
    (SELECT id FROM users WHERE role = 'yonetici' LIMIT 1),
    'UPDATE',
    'users',
    (SELECT id::TEXT FROM users WHERE role = 'operatör' LIMIT 1),
    'Operatör yetkileri güncellendi',
    'high',
    'security'
);

-- Grant necessary permissions
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON audit_log_summary TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_log_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_activity_summary TO authenticated;
GRANT EXECUTE ON FUNCTION clean_old_audit_logs TO authenticated;
