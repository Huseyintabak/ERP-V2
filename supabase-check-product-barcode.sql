-- ==========================================
-- ÜRÜN BARKODUNU KONTROL ET
-- ==========================================

-- 1. Thunder Ürün X Model A'nın barkodunu bul
SELECT 
  id,
  name,
  code,
  barcode,
  unit_price,
  stock_quantity
FROM finished_products 
WHERE name = 'Thunder Ürün X Model A'
ORDER BY created_at DESC;

