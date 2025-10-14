-- ================================================
-- STOK TABLOSU YAPISINI KONTROL ET
-- ================================================

-- 1️⃣ Tablo yapısını kontrol et
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('semi_finished_products', 'finished_products')
  AND column_name IN ('id', 'quantity', 'is_active')
ORDER BY table_name, ordinal_position;

-- 2️⃣ RLS durumunu kontrol et
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('semi_finished_products', 'finished_products');

-- 3️⃣ Mevcut stok miktarlarını kontrol et
SELECT 
  'semi_finished_products' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE quantity = 0) as sifir,
  COUNT(*) FILTER (WHERE quantity > 0) as pozitif,
  SUM(quantity) as toplam_miktar,
  MIN(quantity) as min_miktar,
  MAX(quantity) as max_miktar
FROM semi_finished_products

UNION ALL

SELECT 
  'finished_products' as tablo,
  COUNT(*) as toplam,
  COUNT(*) FILTER (WHERE quantity = 0) as sifir,
  COUNT(*) FILTER (WHERE quantity > 0) as pozitif,
  SUM(quantity) as toplam_miktar,
  MIN(quantity) as min_miktar,
  MAX(quantity) as max_miktar
FROM finished_products;

-- 4️⃣ İlk 5 kayıdı göster (debug için)
SELECT 
  'semi_finished' as tip,
  id,
  code,
  name,
  quantity
FROM semi_finished_products
LIMIT 5;

SELECT 
  'finished' as tip,
  id,
  code,
  name,
  quantity
FROM finished_products
LIMIT 5;

