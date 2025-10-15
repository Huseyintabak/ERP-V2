-- 🧪 TEST TRANSFER FUNCTION: Transfer fonksiyonunu test et
-- Bu dosya transfer fonksiyonunu test eder

-- 1. Transfer fonksiyonunu test et
SELECT transfer_between_zones(
  '41b496ba-0e3f-4a08-89ae-6119e3cfd0e3'::UUID,  -- from_zone
  '79107edb-2635-4f91-b3c6-d66c8db19fe1'::UUID,  -- to_zone
  'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID,  -- product
  1,                                              -- qty
  '228e0137-818f-4235-9f66-fcb694998267'::UUID   -- user_id
) as test_result;

-- 2. Transfer fonksiyonunun tanımını kontrol et
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'transfer_between_zones';

-- 3. Zone transfer tablosunun yapısını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'zone_transfers'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Zone inventories tablosunun yapısını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'zone_inventories'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Finished products tablosunun yapısını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'finished_products'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '✅ TRANSFER FUNCTION TEST COMPLETED!' as result;
