-- ================================================
-- PERFORMANCE INDEX OPTIMIZATIONS
-- ================================================
-- Created: 27 Ocak 2025
-- Purpose: Query performance iyileştirmeleri için eksik index'leri ekle
-- ================================================

-- 1. Orders table - Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_status ON orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date ON orders(delivery_date) WHERE delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number) WHERE order_number IS NOT NULL;

-- 2. Order items - Composite indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_product ON order_items(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 3. Production plans - Composite indexes
CREATE INDEX IF NOT EXISTS idx_production_plans_order_status ON production_plans(order_id, status);
CREATE INDEX IF NOT EXISTS idx_production_plans_operator_status ON production_plans(assigned_operator_id, status) WHERE assigned_operator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_plans_product_status ON production_plans(product_id, status);
CREATE INDEX IF NOT EXISTS idx_production_plans_status_created ON production_plans(status, created_at DESC);

-- 4. Production logs - Composite indexes (uses timestamp, not created_at)
CREATE INDEX IF NOT EXISTS idx_production_logs_plan_timestamp ON production_logs(plan_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_production_logs_operator_timestamp ON production_logs(operator_id, timestamp DESC) WHERE operator_id IS NOT NULL;

-- 5. Stock movements - Composite indexes (uses material_id, not product_id, and movement_type, not type)
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_movement ON stock_movements(material_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_movement_created ON stock_movements(movement_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_material_type_created ON stock_movements(material_type, material_id, created_at DESC);

-- 6. Material reservations - Composite indexes
CREATE INDEX IF NOT EXISTS idx_material_reservations_order_status ON material_reservations(order_id, status) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_material_reservations_material_status ON material_reservations(material_type, material_id, status);
CREATE INDEX IF NOT EXISTS idx_material_reservations_status ON material_reservations(status, created_at DESC);

-- 7. BOM - Composite indexes
CREATE INDEX IF NOT EXISTS idx_bom_finished_material ON bom(finished_product_id, material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_bom_material ON bom(material_type, material_id);

-- 8. Production plan BOM snapshot - Composite indexes
CREATE INDEX IF NOT EXISTS idx_bom_snapshot_plan_material ON production_plan_bom_snapshot(plan_id, material_type, material_id);

-- 9. Raw materials - Additional indexes
CREATE INDEX IF NOT EXISTS idx_raw_materials_code ON raw_materials(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_materials_barcode ON raw_materials(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_raw_materials_quantity ON raw_materials(quantity) WHERE quantity > 0;

-- 10. Semi-finished products - Additional indexes
CREATE INDEX IF NOT EXISTS idx_semi_finished_code ON semi_finished_products(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_semi_finished_barcode ON semi_finished_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_semi_finished_quantity ON semi_finished_products(quantity) WHERE quantity > 0;

-- 11. Finished products - Additional indexes
CREATE INDEX IF NOT EXISTS idx_finished_products_code ON finished_products(code) WHERE code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finished_products_barcode ON finished_products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finished_products_quantity ON finished_products(quantity) WHERE quantity > 0;

-- 12. Inventory counts - Additional indexes
CREATE INDEX IF NOT EXISTS idx_inventory_counts_material_status ON inventory_counts(material_type, material_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_created ON inventory_counts(created_at DESC);

-- 13. Agent logs - Additional indexes (if not already exists)
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_level_created ON agent_logs(agent, level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_action_created ON agent_logs(action, created_at DESC);

-- 14. Agent costs - Additional indexes
CREATE INDEX IF NOT EXISTS idx_agent_costs_agent_created ON agent_costs(agent, created_at DESC);

-- 15. Human approvals - Additional indexes
CREATE INDEX IF NOT EXISTS idx_human_approvals_status_created ON human_approvals(status, created_at DESC);

-- 16. Customers - Additional indexes
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name) WHERE name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE email IS NOT NULL;

-- 17. Users - Additional indexes
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- 18. Operators - Additional indexes
CREATE INDEX IF NOT EXISTS idx_operators_status ON operators(current_status) WHERE current_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_operators_series ON operators(series) WHERE series IS NOT NULL;

-- Comments
COMMENT ON INDEX idx_orders_status_created IS 'Orders by status and creation date (for dashboard queries)';
COMMENT ON INDEX idx_production_plans_order_status IS 'Production plans by order and status (for order detail pages)';
COMMENT ON INDEX idx_production_logs_plan_created IS 'Production logs by plan and date (for plan history)';
COMMENT ON INDEX idx_stock_movements_product_type IS 'Stock movements by product and type (for stock history)';
COMMENT ON INDEX idx_material_reservations_order_status IS 'Material reservations by order and status (for order approval)';

