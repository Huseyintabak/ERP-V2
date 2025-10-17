-- BOM tablosunun tüm kolonlarını listele
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bom' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- BOM tablosundaki ilk 5 kaydı göster (tüm kolonlar)
SELECT * FROM bom LIMIT 5;

-- BOM tablosundaki kayıt sayısını kontrol et
SELECT COUNT(*) as total_records FROM bom;

-- BOM tablosundaki mevcut verileri kontrol et (quantity kolonu yok)
SELECT 
    b.id,
    b.finished_product_id,
    fp.name as product_name,
    b.material_id,
    b.material_type
    -- quantity kolonu yok, sadece mevcut kolonları göster
FROM bom b
LEFT JOIN finished_products fp ON b.finished_product_id = fp.id
ORDER BY b.finished_product_id, b.material_type
LIMIT 10;

-- Quantity kolonu var mı kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bom' 
AND column_name = 'quantity'
AND table_schema = 'public';

-- Yarı mamul ürünlerin BOM'larını kontrol et (finished_products tablosunda)
SELECT 
    b.id,
    b.finished_product_id,
    fp.name as product_name,
    b.material_id,
    b.material_type,
    b.quantity
FROM bom b
JOIN finished_products fp ON b.finished_product_id = fp.id
WHERE fp.name LIKE '%TRX%' -- Yarı mamul ürünler TRX ile başlıyor
ORDER BY b.finished_product_id, b.material_type
LIMIT 10;
