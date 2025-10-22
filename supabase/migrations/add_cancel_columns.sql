-- Add missing columns for production plan cancellation
-- Üretim planı iptal işlemi için eksik kolonları ekle

-- Add cancellation columns to production_plans table
ALTER TABLE production_plans 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Add cancellation columns to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_production_plans_cancelled_at ON production_plans(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_production_plans_cancelled_by ON production_plans(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_at ON orders(cancelled_at);
CREATE INDEX IF NOT EXISTS idx_orders_cancelled_by ON orders(cancelled_by);
