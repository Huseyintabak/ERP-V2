-- Check raw_materials table schema to see available columns

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'raw_materials'
ORDER BY ordinal_position;

