-- Check production_plans table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'production_plans'
ORDER BY ordinal_position;

