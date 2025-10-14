-- ================================================
-- NİHAİ ÜRÜN STOKLARINI 1 YAP
-- ================================================

-- RLS'i kapat (güvenli update için)
ALTER TABLE finished_products DISABLE ROW LEVEL SECURITY;

-- Tüm nihai ürünlerin stoğunu 1 yap
UPDATE finished_products
SET quantity = 1;

-- RLS'i aç
ALTER TABLE finished_products ENABLE ROW LEVEL SECURITY;

-- Kontrol
SELECT 
  'Nihai Ürün' as kategori,
  COUNT(*) as toplam_kayit,
  COUNT(*) FILTER (WHERE quantity = 0) as stok_sifir,
  COUNT(*) FILTER (WHERE quantity = 1) as stok_bir,
  COUNT(*) FILTER (WHERE quantity > 1) as stok_fazla,
  SUM(quantity) as toplam_stok
FROM finished_products;

-- ================================================
-- BEKLENEN SONUÇ:
-- toplam_kayit = 244
-- stok_bir = 244
-- toplam_stok = 244
-- ================================================

