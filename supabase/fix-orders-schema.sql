-- Fix orders schema to support multiple products per order
-- 1. Create order_items table for multiple products per order
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES finished_products(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- 3. Check if columns exist before dropping them
DO $$
BEGIN
  -- Remove product_id and quantity from orders table if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'product_id') THEN
    -- Backup existing data first
    CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders;
    
    -- Migrate existing data from orders to order_items
    INSERT INTO order_items (order_id, product_id, quantity)
    SELECT id, product_id, quantity FROM orders_backup
    ON CONFLICT DO NOTHING;
    
    -- Drop the old columns from orders table
    ALTER TABLE orders DROP COLUMN product_id;
    ALTER TABLE orders DROP COLUMN quantity;
    
    -- Drop the backup table
    DROP TABLE IF EXISTS orders_backup;
  END IF;
END $$;

-- 4. Add total_quantity to orders table if it doesn't exist
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_quantity NUMERIC(12, 2) DEFAULT 0;

-- 5. Update total_quantity in orders based on order_items
UPDATE orders SET total_quantity = (
  SELECT COALESCE(SUM(quantity), 0) FROM order_items WHERE order_items.order_id = orders.id
);
