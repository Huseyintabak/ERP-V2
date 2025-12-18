-- Check if transfer_between_zones function exists and its definition

SELECT 
    '📋 FUNCTION INFO' as info,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'transfer_between_zones'
  AND n.nspname = 'public';



