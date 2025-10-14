-- ================================================
-- HIZLI KONTROL
-- ================================================

-- 1️⃣ Kaç adet ürün var?
SELECT 
  'Nihai Ürün' as kategori,
  COUNT(*) as toplam_kayit,
  COUNT(*) FILTER (WHERE quantity = 0) as stok_sifir,
  COUNT(*) FILTER (WHERE quantity > 0) as stok_dolu,
  SUM(quantity) as toplam_stok_miktari
FROM finished_products;

-- 2️⃣ İlk 10 kaydı göster
SELECT 
  id,
  code,
  name,
  quantity,
  sale_price,
  is_active,
  created_at
FROM finished_products
ORDER BY code
LIMIT 10;

-- ================================================
-- BEKLENEN SONUÇ:
-- 
-- Eğer "toplam_kayit = 0" ise → Hiç ürün yok!
-- Eğer "stok_sifir = 0" ise → Stoklar sıfırlanmamış!
-- Eğer "toplam_stok_miktari > 0" ise → SQL çalışmamış!
-- ================================================

