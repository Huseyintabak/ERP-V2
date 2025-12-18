-- Check zone_transfers table schema

SELECT 
    '📋 ZONE_TRANSFERS SCHEMA' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'zone_transfers'
ORDER BY ordinal_position;

