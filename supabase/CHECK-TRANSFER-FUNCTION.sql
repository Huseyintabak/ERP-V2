-- Check if transfer_zone_inventory function exists and its definition

SELECT 
    '📋 FUNCTION INFO' as info,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'transfer_zone_inventory'
  AND n.nspname = 'public';



