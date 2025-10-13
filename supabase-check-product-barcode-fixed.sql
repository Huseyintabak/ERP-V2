-- ==========================================
-- ÜRÜN BARKODUNU KONTROL ET (DÜZELTILMIŞ)
-- ==========================================

-- 1. Thunder Ürün X Model A'nın barkodunu bul
SELECT 
  id,
  name,
  code,
  barcode,
  stock_quantity
FROM finished_products 
WHERE name = 'Thunder Ürün X Model A'
ORDER BY created_at DESC;

