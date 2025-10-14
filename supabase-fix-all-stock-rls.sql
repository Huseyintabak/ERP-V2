-- ================================================
-- TÜM STOK TABLOLARI RLS FIX
-- ================================================
-- Tüm stok tablolarının RLS'ini kapat
-- ================================================

-- 1️⃣ Hammaddeler
ALTER TABLE raw_materials DISABLE ROW LEVEL SECURITY;

-- 2️⃣ Yarı Mamüller
ALTER TABLE semi_finished_products DISABLE ROW LEVEL SECURITY;

-- 3️⃣ Nihai Ürünler
ALTER TABLE finished_products DISABLE ROW LEVEL SECURITY;

-- 4️⃣ Stok Hareketleri
ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;

-- 5️⃣ Kontrol
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN (
  'raw_materials', 
  'semi_finished_products', 
  'finished_products', 
  'stock_movements'
)
ORDER BY tablename;

-- ================================================
-- BEKLENEN SONUÇ:
-- Tüm tabloların rls_enabled = false olmalı ✅
-- ================================================

