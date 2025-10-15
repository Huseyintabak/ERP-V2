-- 🐛 DEBUG TRANSFER ERROR: Transfer hatasını debug et
-- Bu dosya transfer hatasını detaylı debug eder

-- 1. Transfer fonksiyonunu doğrudan test et ve hata mesajını yakala
DO $$
DECLARE
    result JSON;
BEGIN
    SELECT transfer_between_zones(
        '41b496ba-0e3f-4a08-89ae-6119e3cfd0e3'::UUID,  -- from_zone
        '79107edb-2635-4f91-b3c6-d66c8db19fe1'::UUID,  -- to_zone
        'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID,  -- product
        1,                                              -- qty
        '228e0137-818f-4235-9f66-fcb694998267'::UUID   -- user_id
    ) INTO result;
    
    RAISE NOTICE 'Transfer result: %', result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Transfer error: %', SQLERRM;
END $$;

-- 2. Zone transfer tablosuna manuel insert test et
INSERT INTO zone_transfers (
    from_zone_id, 
    to_zone_id, 
    product_id,
    quantity, 
    transfer_date,
    created_by
) VALUES (
    '41b496ba-0e3f-4a08-89ae-6119e3cfd0e3'::UUID,  -- from_zone
    '79107edb-2635-4f91-b3c6-d66c8db19fe1'::UUID,  -- to_zone
    'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID,  -- product
    1,                                              -- qty
    NOW(),                                          -- transfer_date
    '228e0137-818f-4235-9f66-fcb694998267'::UUID   -- user_id
);

-- 3. Zone inventories tablosuna manuel insert test et
INSERT INTO zone_inventories (
    zone_id, 
    material_type,
    material_id, 
    quantity,
    created_at,
    updated_at
) VALUES (
    '79107edb-2635-4f91-b3c6-d66c8db19fe1'::UUID,  -- zone_id
    'finished',                                     -- material_type
    'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID,  -- material_id
    1,                                              -- quantity
    NOW(),                                          -- created_at
    NOW()                                           -- updated_at
);

-- 4. Finished products tablosunu güncelle test et
UPDATE finished_products
SET 
    quantity = quantity - 1,
    updated_at = NOW()
WHERE id = 'c15dc53e-f926-4aa5-a30c-c3150de16928'::UUID;

SELECT '✅ DEBUG TRANSFER ERROR COMPLETED!' as result;
