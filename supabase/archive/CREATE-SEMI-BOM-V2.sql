-- TRX2_Gövde_Grubu yarı mamul ürünü için BOM oluştur
DO $$
DECLARE
    product_id UUID;
    raw_material_id UUID;
BEGIN
    -- TRX2_Gövde_Grubu ürününün ID'sini al
    SELECT id INTO product_id 
    FROM semi_finished_products 
    WHERE name = 'TRX2_Gövde_Grubu' 
    LIMIT 1;
    
    IF product_id IS NULL THEN
        RAISE NOTICE 'TRX2_Gövde_Grubu ürünü bulunamadı';
        RETURN;
    END IF;
    
    RAISE NOTICE 'TRX2_Gövde_Grubu ID: %', product_id;
    
    -- Örnek hammaddeler için BOM oluştur
    -- Çelik Levha
    SELECT id INTO raw_material_id 
    FROM raw_materials 
    WHERE name = 'Çelik Levha' 
    LIMIT 1;
    
    IF raw_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, raw_material_id, 'raw', 2.5, NOW(), NOW())
        ON CONFLICT (product_id, material_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            updated_at = NOW();
        RAISE NOTICE 'Çelik Levha BOM eklendi';
    END IF;
    
    -- Alüminyum Profil
    SELECT id INTO raw_material_id 
    FROM raw_materials 
    WHERE name = 'Alüminyum Profil' 
    LIMIT 1;
    
    IF raw_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, raw_material_id, 'raw', 1.0, NOW(), NOW())
        ON CONFLICT (product_id, material_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            updated_at = NOW();
        RAISE NOTICE 'Alüminyum Profil BOM eklendi';
    END IF;
    
    -- Vidalar
    SELECT id INTO raw_material_id 
    FROM raw_materials 
    WHERE name = 'Vidalar' 
    LIMIT 1;
    
    IF raw_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, raw_material_id, 'raw', 20.0, NOW(), NOW())
        ON CONFLICT (product_id, material_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            updated_at = NOW();
        RAISE NOTICE 'Vidalar BOM eklendi';
    END IF;
    
    -- Yarı mamul ürünler için de BOM oluştur (eğer varsa)
    -- TRX1_Gövde_Grubu yarı mamul ürününü kontrol et
    SELECT id INTO raw_material_id 
    FROM semi_finished_products 
    WHERE name = 'TRX1_Gövde_Grubu' 
    LIMIT 1;
    
    IF raw_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, raw_material_id, 'semi', 1.0, NOW(), NOW())
        ON CONFLICT (product_id, material_id) DO UPDATE SET
            quantity = EXCLUDED.quantity,
            updated_at = NOW();
        RAISE NOTICE 'TRX1_Gövde_Grubu yarı mamul BOM eklendi';
    END IF;
    
    RAISE NOTICE 'TRX2_Gövde_Grubu için BOM oluşturuldu';
END $$;

-- BOM'u kontrol et
SELECT 
    b.id,
    b.product_id,
    sp.name as product_name,
    b.material_id,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.name
        WHEN b.material_type = 'semi' THEN sf.name
    END as material_name,
    b.material_type,
    b.quantity
FROM semi_bom b
JOIN semi_finished_products sp ON b.product_id = sp.id
LEFT JOIN raw_materials rm ON b.material_type = 'raw' AND b.material_id = rm.id
LEFT JOIN semi_finished_products sf ON b.material_type = 'semi' AND b.material_id = sf.id
WHERE sp.name = 'TRX2_Gövde_Grubu'
ORDER BY b.material_type, b.quantity DESC;

SELECT '✅ SEMI BOM CREATED V2!' as result;
