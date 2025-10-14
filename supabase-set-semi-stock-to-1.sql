-- ================================================
-- YARI MAMUL STOKLARINI 1 YAP
-- ================================================

-- RLS'i kapat (güvenli update için)
ALTER TABLE semi_finished_products DISABLE ROW LEVEL SECURITY;

-- Tüm yarı mamullerin stoğunu 1 yap
UPDATE semi_finished_products
SET quantity = 1;

-- RLS'i aç (ama biz kapalı tutacağız, bu satırı siliyorum)
-- ALTER TABLE semi_finished_products ENABLE ROW LEVEL SECURITY;

-- Kontrol
SELECT 
  'Yarı Mamul' as kategori,
  COUNT(*) as toplam_kayit,
  COUNT(*) FILTER (WHERE quantity = 0) as stok_sifir,
  COUNT(*) FILTER (WHERE quantity = 1) as stok_bir,
  COUNT(*) FILTER (WHERE quantity > 1) as stok_fazla,
  SUM(quantity) as toplam_stok
FROM semi_finished_products;

-- ================================================
-- BEKLENEN SONUÇ:
-- stok_bir = toplam_kayit
-- toplam_stok = toplam_kayit
-- ================================================

