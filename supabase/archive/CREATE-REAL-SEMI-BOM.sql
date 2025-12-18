-- TRX2_Gövde_Grubu yarı mamul ürünü için gerçek BOM oluştur
DO $$
DECLARE
    product_id UUID;
    raw_material_id UUID;
    semi_material_id UUID;
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
    
    -- Mevcut BOM verilerini temizle (eğer varsa)
    DELETE FROM semi_bom WHERE semi_product_id = product_id;
    
    -- Hammaddeler için BOM oluştur
    -- Çelik Levha
    SELECT id INTO raw_material_id 
    FROM raw_materials 
    WHERE name = 'Çelik Levha' 
    LIMIT 1;
    
    IF raw_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, raw_material_id, 'raw', 2.5, NOW(), NOW());
        RAISE NOTICE 'Çelik Levha BOM eklendi: %', raw_material_id;
    END IF;
    
    -- Alüminyum Profil
    SELECT id INTO raw_material_id 
    FROM raw_materials 
    WHERE name = 'Alüminyum Profil' 
    LIMIT 1;
    
    IF raw_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, raw_material_id, 'raw', 1.0, NOW(), NOW());
        RAISE NOTICE 'Alüminyum Profil BOM eklendi: %', raw_material_id;
    END IF;
    
    -- Vidalar
    SELECT id INTO raw_material_id 
    FROM raw_materials 
    WHERE name = 'Vidalar' 
    LIMIT 1;
    
    IF raw_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, raw_material_id, 'raw', 20.0, NOW(), NOW());
        RAISE NOTICE 'Vidalar BOM eklendi: %', raw_material_id;
    END IF;
    
    -- Yarı mamul ürünler için de BOM oluştur (eğer varsa)
    -- TRX1_Gövde_Grubu yarı mamul ürününü kontrol et
    SELECT id INTO semi_material_id 
    FROM semi_finished_products 
    WHERE name = 'TRX1_Gövde_Grubu' 
    LIMIT 1;
    
    IF semi_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, semi_material_id, 'semi', 1.0, NOW(), NOW());
        RAISE NOTICE 'TRX1_Gövde_Grubu yarı mamul BOM eklendi: %', semi_material_id;
    END IF;
    
    -- Diğer yarı mamul ürünler için de BOM oluştur
    -- TRX3_Montaj_Parçası
    SELECT id INTO semi_material_id 
    FROM semi_finished_products 
    WHERE name = 'TRX3_Montaj_Parçası' 
    LIMIT 1;
    
    IF semi_material_id IS NOT NULL THEN
        INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, created_at, updated_at)
        VALUES (product_id, semi_material_id, 'semi', 2.0, NOW(), NOW());
        RAISE NOTICE 'TRX3_Montaj_Parçası yarı mamul BOM eklendi: %', semi_material_id;
    END IF;
    
    RAISE NOTICE 'TRX2_Gövde_Grubu için gerçek BOM oluşturuldu';
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
        WHEN b.material_type = 'finished' THEN fp.name
    END as material_name,
    b.material_type,
    b.quantity,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.code
        WHEN b.material_type = 'semi' THEN sf.code
        WHEN b.material_type = 'finished' THEN fp.code
    END as material_code,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.quantity
        WHEN b.material_type = 'semi' THEN sf.quantity
        WHEN b.material_type = 'finished' THEN fp.quantity
    END as current_stock
FROM bom b
JOIN semi_finished_products sp ON b.product_id = sp.id
LEFT JOIN raw_materials rm ON b.material_type = 'raw' AND b.material_id = rm.id
LEFT JOIN semi_finished_products sf ON b.material_type = 'semi' AND b.material_id = sf.id
LEFT JOIN finished_products fp ON b.material_type = 'finished' AND b.material_id = fp.id
WHERE sp.name = 'TRX2_Gövde_Grubu'
ORDER BY b.material_type, b.quantity DESC;

SELECT '✅ REAL SEMI BOM CREATED!' as result;
