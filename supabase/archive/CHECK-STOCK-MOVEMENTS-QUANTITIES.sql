-- Check stock movements before/after quantities

SELECT 
  id,
  material_type,
  movement_type,
  quantity,
  before_quantity,
  after_quantity,
  created_at,
  CASE 
    WHEN before_quantity IS NULL THEN '❌ NULL'
    ELSE '✅ OK'
  END as before_status,
  CASE 
    WHEN after_quantity IS NULL THEN '❌ NULL'
    ELSE '✅ OK'
  END as after_status
FROM stock_movements
ORDER BY created_at DESC
LIMIT 10;

-- Check if the columns exist and their data types
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'stock_movements'
  AND column_name IN ('before_quantity', 'after_quantity')
ORDER BY column_name;

