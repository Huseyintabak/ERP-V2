-- ==========================================
-- BOM TABLOSU DOĞRU KONTROL
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- Test için user context set et
SELECT set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111'::TEXT, TRUE);

-- 1. Bu ürün için BOM kayıtları var mı kontrol et (doğru column isimleriyle)
SELECT * FROM bom WHERE finished_product_id = '47ee0a69-5920-4336-9674-7af2d40cc7b9';

-- 2. Bu ürünün BOM'unu detaylı kontrol et
SELECT 
  b.id,
  b.finished_product_id,
  b.material_type,
  b.material_id,
  b.quantity_needed,
  CASE 
    WHEN b.material_type = 'raw' THEN rm.name
    WHEN b.material_type = 'semi' THEN sf.name
  END as material_name,
  CASE 
    WHEN b.material_type = 'raw' THEN rm.quantity
    WHEN b.material_type = 'semi' THEN sf.quantity
  END as available_quantity
FROM bom b
LEFT JOIN raw_materials rm ON (b.material_type = 'raw' AND b.material_id = rm.id)
LEFT JOIN semi_finished_products sf ON (b.material_type = 'semi' AND b.material_id = sf.id)
WHERE b.finished_product_id = '47ee0a69-5920-4336-9674-7af2d40cc7b9';

-- 3. Tüm BOM kayıtlarını listele
SELECT 
  b.id,
  b.finished_product_id,
  fp.name as product_name,
  b.material_type,
  b.material_id,
  b.quantity_needed
FROM bom b
LEFT JOIN finished_products fp ON b.finished_product_id = fp.id
ORDER BY b.created_at DESC
LIMIT 10;

-- 4. Stock check function'ı test et
SELECT check_stock_availability(
  '47ee0a69-5920-4336-9674-7af2d40cc7b9'::UUID,
  1
);

