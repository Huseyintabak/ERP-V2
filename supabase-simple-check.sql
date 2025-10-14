-- ================================================
-- BASİTLEŞTİRİLMİŞ KONTROL
-- ================================================

-- 1️⃣ Nihai Ürünlerin stok durumu
SELECT 
  'Nihai Ürün' as kategori,
  COUNT(*) as toplam_kayit,
  COUNT(*) FILTER (WHERE quantity = 0) as stok_sifir,
  COUNT(*) FILTER (WHERE quantity > 0) as stok_dolu,
  SUM(quantity) as toplam_stok_miktari,
  MIN(quantity) as min_stok,
  MAX(quantity) as max_stok
FROM finished_products;

-- 2️⃣ Yarı Mamullerin stok durumu
SELECT 
  'Yarı Mamul' as kategori,
  COUNT(*) as toplam_kayit,
  COUNT(*) FILTER (WHERE quantity = 0) as stok_sifir,
  COUNT(*) FILTER (WHERE quantity > 0) as stok_dolu,
  SUM(quantity) as toplam_stok_miktari,
  MIN(quantity) as min_stok,
  MAX(quantity) as max_stok
FROM semi_finished_products;

-- 3️⃣ İlk 5 Nihai Ürünü göster
SELECT 
  code,
  name,
  quantity,
  sale_price
FROM finished_products
ORDER BY code
LIMIT 5;

-- ================================================
-- SONUÇ YORUMLAMA:
-- 
-- stok_sifir = 0 → Hiç 0 stoklu ürün yok (SQL çalışmadı)
-- stok_sifir > 0 → ✅ 0 stoklu ürünler var
-- toplam_kayit = 0 → Hiç ürün yok
-- ================================================

