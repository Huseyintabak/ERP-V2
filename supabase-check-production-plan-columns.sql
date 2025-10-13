-- ==========================================
-- PRODUCTION_PLANS TABLOSUNU KONTROL ET
-- ==========================================

-- 1. Production_plans tablosunun sütunlarını kontrol et
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'production_plans' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Production_plans tablosundaki kayıtları kontrol et
SELECT 
  id,
  order_id,
  product_id,
  planned_quantity,
  produced_quantity,
  status,
  assigned_operator_id,
  created_at
FROM production_plans
ORDER BY created_at DESC;

