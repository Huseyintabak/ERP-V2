-- BOM tablosunun yapısını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bom' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- BOM tablosundaki mevcut verileri kontrol et (sadece mevcut kolonları kullan)
SELECT 
    b.id,
    b.finished_product_id as product_id,
    fp.name as product_name,
    b.material_id,
    CASE 
        WHEN b.material_type = 'raw' THEN rm.name
        WHEN b.material_type = 'semi' THEN sf.name
        WHEN b.material_type = 'finished' THEN fp2.name
    END as material_name,
    b.material_type
    -- quantity kolonu yok, sadece mevcut kolonları göster
FROM bom b
LEFT JOIN finished_products fp ON b.finished_product_id = fp.id
LEFT JOIN raw_materials rm ON b.material_type = 'raw' AND b.material_id = rm.id
LEFT JOIN semi_finished_products sf ON b.material_type = 'semi' AND b.material_id = sf.id
LEFT JOIN finished_products fp2 ON b.material_type = 'finished' AND b.material_id = fp2.id
ORDER BY b.finished_product_id, b.material_type;

-- Yarı mamul ürünleri kontrol et
SELECT id, name, code, quantity FROM semi_finished_products ORDER BY name;

-- Hammaddeleri kontrol et
SELECT id, name, code, quantity FROM raw_materials ORDER BY name;
