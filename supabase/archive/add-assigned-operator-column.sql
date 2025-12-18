-- Add assigned_operator_id column to orders table
ALTER TABLE orders ADD COLUMN assigned_operator_id UUID REFERENCES operators(id);

-- Add index for better performance
CREATE INDEX idx_orders_operator ON orders(assigned_operator_id);

