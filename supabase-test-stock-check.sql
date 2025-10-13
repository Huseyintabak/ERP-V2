-- ==========================================
-- STOCK CHECK FUNCTION TEST
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- Test için user context set et
SELECT set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111'::TEXT, TRUE);

-- Ürün ID'si
-- Thunder Ürün X Model A: 47ee0a69-5920-4336-9674-7af2d40cc7b9

-- 1. Stock check function'ı test et
SELECT check_stock_availability(
  '47ee0a69-5920-4336-9674-7af2d40cc7b9'::UUID,
  1
);

-- 2. Bu ürünün BOM'unu kontrol et
SELECT 
  b.id,
  b.material_type,
  b.material_id,
  b.quantity_required,
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
WHERE b.product_id = '47ee0a69-5920-4336-9674-7af2d40cc7b9';

-- 3. Raw materials stok durumu
SELECT id, code, name, quantity FROM raw_materials;

-- 4. Semi-finished products stok durumu  
SELECT id, code, name, quantity FROM semi_finished_products;

