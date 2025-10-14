-- ================================================
-- STOKLARI ZORLA SIFIRLAMA (RLS Bypass)
-- ================================================
-- RLS politikalarını bypass ederek stokları sıfırla
-- ================================================

-- ⚠️ DİKKAT: Bu SQL'i "Service Role" modunda çalıştırın!
-- Supabase SQL Editor'da sağ üst köşede "RLS Disabled" seçeneğini işaretleyin

-- 1️⃣ RLS'i geçici olarak kapat (eğer açıksa)
ALTER TABLE semi_finished_products DISABLE ROW LEVEL SECURITY;
ALTER TABLE finished_products DISABLE ROW LEVEL SECURITY;

-- 2️⃣ Yarı Mamul stoklarını sıfırla
UPDATE semi_finished_products
SET quantity = 0;

-- 3️⃣ Nihai Ürün stoklarını sıfırla
UPDATE finished_products
SET quantity = 0;

-- 4️⃣ RLS'i tekrar aç (güvenlik için)
ALTER TABLE semi_finished_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_products ENABLE ROW LEVEL SECURITY;

-- 5️⃣ Kontrol
SELECT 
  'Yarı Mamul' as kategori,
  COUNT(*) as toplam_urun,
  SUM(quantity) as toplam_stok,
  MIN(quantity) as min,
  MAX(quantity) as max
FROM semi_finished_products

UNION ALL

SELECT 
  'Nihai Ürün' as kategori,
  COUNT(*) as toplam_urun,
  SUM(quantity) as toplam_stok,
  MIN(quantity) as min,
  MAX(quantity) as max
FROM finished_products;

-- ================================================
-- BEKLENEN SONUÇ:
-- kategori     | toplam_urun | toplam_stok | min | max
-- -------------|-------------|-------------|-----|----
-- Yarı Mamul   | 50          | 0           | 0   | 0
-- Nihai Ürün   | 50          | 0           | 0   | 0
-- ================================================

