-- Tüm audit trigger'larını kontrol et ve log_audit_event fonksiyonunu test et

-- 1. Mevcut trigger'ları listele
SELECT 
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.tgname LIKE '%audit%'
ORDER BY c.relname, t.tgname;

-- 2. log_audit_event fonksiyonunu test et
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE proname = 'log_audit_event';

-- 3. Audit logs tablosunu kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Mevcut audit log verilerini kontrol et
SELECT COUNT(*) as audit_log_count FROM audit_logs;

SELECT '✅ AUDIT TRIGGER CHECK COMPLETED!' as result;
