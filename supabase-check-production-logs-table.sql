-- ==========================================
-- PRODUCTION_LOGS TABLOSUNU KONTROL ET
-- ==========================================

-- 1. Production_logs tablosunu kontrol et
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'production_logs' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Production_logs tablosunda kayıt var mı?
SELECT COUNT(*) as log_count FROM production_logs;

