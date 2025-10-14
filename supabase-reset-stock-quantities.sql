-- ================================================
-- STOK MİKTARLARINI SIFIRLAMA
-- ================================================
-- Yarı Mamul ve Nihai Ürün stoklarını 0 yap
-- ================================================

-- 1️⃣ Yarı Mamul stoklarını sıfırla
UPDATE semi_finished_products
SET quantity = 0
WHERE quantity > 0;

-- 2️⃣ Nihai Ürün stoklarını sıfırla  
UPDATE finished_products
SET quantity = 0
WHERE quantity > 0;

-- ================================================
-- KONTROL SORGUSU
-- ================================================

-- Yarı Mamul stok durumu
SELECT 
  'Yarı Mamul' as kategori,
  COUNT(*) as toplam_urun,
  SUM(quantity) as toplam_stok,
  COUNT(*) FILTER (WHERE quantity = 0) as sifir_stoklu,
  COUNT(*) FILTER (WHERE quantity > 0) as pozitif_stoklu
FROM semi_finished_products
WHERE is_active = true

UNION ALL

-- Nihai Ürün stok durumu
SELECT 
  'Nihai Ürün' as kategori,
  COUNT(*) as toplam_urun,
  SUM(quantity) as toplam_stok,
  COUNT(*) FILTER (WHERE quantity = 0) as sifir_stoklu,
  COUNT(*) FILTER (WHERE quantity > 0) as pozitif_stoklu
FROM finished_products
WHERE is_active = true;

-- ================================================
-- BEKLENEN SONUÇ
-- ================================================
-- kategori     | toplam_urun | toplam_stok | sifir_stoklu | pozitif_stoklu
-- -------------|-------------|-------------|--------------|---------------
-- Yarı Mamul   | 50          | 0           | 50           | 0
-- Nihai Ürün   | 50          | 0           | 50           | 0
-- ================================================

