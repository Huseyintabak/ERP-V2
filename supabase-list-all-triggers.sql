-- ==========================================
-- TÜM TRIGGER'LARI LİSTELE
-- ==========================================

-- 1. TÜM TRIGGER'LARI GÖSTER
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  trigger_schema,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 2. TÜM FUNCTION'LARI GÖSTER
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 3. SADECE AUDIT OLMAYAN TRIGGER'LARI GÖSTER
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name NOT LIKE '%audit%'
ORDER BY event_object_table, trigger_name;

