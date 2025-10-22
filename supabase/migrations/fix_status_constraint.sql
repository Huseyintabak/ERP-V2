-- Fix production_plans status check constraint to include 'iptal'
-- production_plans status check constraint'ini 'iptal' değerini içerecek şekilde düzelt

-- Drop existing constraint
ALTER TABLE production_plans DROP CONSTRAINT IF EXISTS production_plans_status_check;

-- Add new constraint with 'iptal' status
ALTER TABLE production_plans ADD CONSTRAINT production_plans_status_check 
CHECK (status IN ('planlandi', 'devam_ediyor', 'duraklatildi', 'tamamlandi', 'iptal'));

-- Also fix orders status constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new constraint for orders with 'iptal' status
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('beklemede', 'onaylandi', 'uretimde', 'tamamlandi', 'iptal'));
