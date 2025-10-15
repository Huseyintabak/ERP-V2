-- 🧪 FINAL TRANSFER TEST: Transfer fonksiyonunu final test et
-- Bu dosya transfer fonksiyonunu final test eder

-- 1. Transfer fonksiyonunu test et
SELECT transfer_between_zones(
  '41b496ba-0e3f-4a08-89ae-6119e3cfd0e3'::UUID,  -- from_zone
  '79107edb-2635-4f91-b3c6-d66c8db19fe1'::UUID,  -- to_zone
  'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID,  -- product
  1,                                              -- qty
  '228e0137-818f-4235-9f66-fcb694998267'::UUID   -- user_id
) as test_result;

-- 2. Zone transfer tablosunu kontrol et
SELECT 
    from_zone_id,
    to_zone_id,
    product_id,
    quantity,
    transfer_date,
    created_by
FROM zone_transfers
ORDER BY transfer_date DESC
LIMIT 5;

-- 3. Zone inventories tablosunu kontrol et
SELECT 
    zone_id,
    material_type,
    material_id,
    quantity,
    created_at,
    updated_at
FROM zone_inventories
WHERE zone_id = '79107edb-2635-4f91-b3c6-d66c8db19fe1'::UUID
  AND material_type = 'finished'
  AND material_id = 'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID;

-- 4. Finished products tablosunu kontrol et
SELECT 
    id,
    name,
    quantity,
    updated_at
FROM finished_products
WHERE id = 'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID;

SELECT '✅ FINAL TRANSFER TEST COMPLETED!' as result;
