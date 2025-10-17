-- BOM tablosuna quantity kolonu ekle (eğer yoksa)
DO $$
BEGIN
    -- quantity kolonu var mı kontrol et
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bom' 
        AND column_name = 'quantity'
        AND table_schema = 'public'
    ) THEN
        -- quantity kolonunu ekle
        ALTER TABLE bom ADD COLUMN quantity DECIMAL(10,3) NOT NULL DEFAULT 1.0;
        
        -- Constraint ekle
        ALTER TABLE bom ADD CONSTRAINT bom_quantity_positive CHECK (quantity > 0);
        
        RAISE NOTICE 'quantity kolonu eklendi';
    ELSE
        RAISE NOTICE 'quantity kolonu zaten mevcut';
    END IF;
END $$;

-- BOM tablosunun güncel yapısını kontrol et
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bom' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- BOM tablosundaki mevcut verileri kontrol et
SELECT 
    b.id,
    b.finished_product_id,
    fp.name as product_name,
    b.material_id,
    b.material_type,
    b.quantity
FROM bom b
LEFT JOIN finished_products fp ON b.finished_product_id = fp.id
ORDER BY b.finished_product_id, b.material_type
LIMIT 10;

SELECT '✅ QUANTITY COLUMN ADDED TO BOM!' as result;