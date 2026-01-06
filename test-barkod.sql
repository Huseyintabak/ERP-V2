-- Test için bazı ürünlerin barkodlarını göster
SELECT 
  'Ham Madde' as tip,
  code as kod,
  name as urun_adi,
  COALESCE(barcode, code) as barkod,
  quantity as miktar
FROM raw_materials
WHERE barcode IS NOT NULL AND barcode != ''
LIMIT 3

UNION ALL

SELECT 
  'Yarı Mamul' as tip,
  code as kod,
  name as urun_adi,
  COALESCE(barcode, code) as barkod,
  quantity as miktar
FROM semi_finished_products
WHERE barcode IS NOT NULL AND barcode != ''
LIMIT 3

UNION ALL

SELECT 
  'Nihai Ürün' as tip,
  code as kod,
  name as urun_adi,
  COALESCE(barcode, code) as barkod,
  quantity as miktar
FROM finished_products
WHERE barcode IS NOT NULL AND barcode != ''
LIMIT 3;
