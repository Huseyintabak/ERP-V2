-- ==========================================
-- BOM TABLOSU YAPISI KONTROL
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. BOM tablosunun yapısını kontrol et
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bom'
ORDER BY ordinal_position;

-- 2. BOM tablosundaki tüm kayıtları listele
SELECT * FROM bom LIMIT 10;

-- 3. Bu ürün için BOM kayıtları var mı kontrol et
SELECT * FROM bom WHERE product_id = '47ee0a69-5920-4336-9674-7af2d40cc7b9';

-- 4. Tüm BOM kayıtlarını say
SELECT COUNT(*) as total_bom_records FROM bom;

-- 5. Finished products tablosundaki tüm ürünleri listele
SELECT id, code, name FROM finished_products;
