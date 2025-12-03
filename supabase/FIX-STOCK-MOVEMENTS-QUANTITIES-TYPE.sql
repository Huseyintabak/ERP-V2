-- ============================================
-- STOCK_MOVEMENTS QUANTITY TİPLERİNİ DÜZELT
-- before_quantity ve after_quantity INTEGER'dan NUMERIC'e çevir
-- NOT: View'ları geçici olarak drop etmemiz gerekiyor
-- ============================================

-- 1. Mevcut tipi kontrol et
SELECT 
  'Mevcut Tipler' as kontrol,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_name = 'stock_movements'
  AND column_name IN ('before_quantity', 'after_quantity', 'quantity')
ORDER BY column_name;

-- 2. View'ları geçici olarak drop et (CASCADE ile bağımlı view'ları da drop eder)
DROP VIEW IF EXISTS stock_movements_detailed CASCADE;
DROP VIEW IF EXISTS detailed_stock_movements CASCADE;

-- 3. Eğer INTEGER ise NUMERIC'e çevir
DO $$
BEGIN
  -- before_quantity
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name = 'before_quantity'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN before_quantity TYPE NUMERIC(12, 2) USING before_quantity::NUMERIC(12, 2);
    
    RAISE NOTICE '✅ before_quantity INTEGER → NUMERIC(12,2) çevrildi';
  ELSE
    RAISE NOTICE 'ℹ️  before_quantity zaten NUMERIC veya mevcut değil';
  END IF;

  -- after_quantity
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name = 'after_quantity'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN after_quantity TYPE NUMERIC(12, 2) USING after_quantity::NUMERIC(12, 2);
    
    RAISE NOTICE '✅ after_quantity INTEGER → NUMERIC(12,2) çevrildi';
  ELSE
    RAISE NOTICE 'ℹ️  after_quantity zaten NUMERIC veya mevcut değil';
  END IF;
END $$;

-- 4. View'ı yeniden oluştur
CREATE OR REPLACE VIEW stock_movements_detailed AS
SELECT 
  sm.id,
  sm.material_type,
  sm.material_id,
  sm.movement_type,
  sm.quantity,
  sm.movement_source,
  sm.user_id,
  sm.before_quantity,
  sm.after_quantity,
  sm.description,
  sm.created_at,
  
  -- Material name based on material_type
  CASE 
    WHEN sm.material_type = 'raw' THEN rm.name
    WHEN sm.material_type = 'semi' THEN sfp.name
    WHEN sm.material_type = 'finished' THEN fp.name
    ELSE 'Bilinmeyen'
  END AS material_name,
  
  -- Material code based on material_type
  CASE 
    WHEN sm.material_type = 'raw' THEN rm.code
    WHEN sm.material_type = 'semi' THEN sfp.code
    WHEN sm.material_type = 'finished' THEN fp.code
    ELSE NULL
  END AS material_code,
  
  -- User details (users tablosundan, auth.users değil)
  COALESCE(u.name, u.email, 'Bilinmeyen Kullanıcı') AS user_name,
  u.role AS user_role

FROM stock_movements sm

-- Join with raw_materials
LEFT JOIN raw_materials rm 
  ON sm.material_type = 'raw' AND sm.material_id = rm.id

-- Join with semi_finished_products
LEFT JOIN semi_finished_products sfp 
  ON sm.material_type = 'semi' AND sm.material_id = sfp.id

-- Join with finished_products
LEFT JOIN finished_products fp 
  ON sm.material_type = 'finished' AND sm.material_id = fp.id

-- Join with users (public.users tablosu)
LEFT JOIN users u 
  ON sm.user_id = u.id;

-- Grant permissions
GRANT SELECT ON stock_movements_detailed TO authenticated;
GRANT SELECT ON stock_movements_detailed TO service_role;

-- 5. Sonucu kontrol et
SELECT 
  'Güncel Tipler' as kontrol,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_name = 'stock_movements'
  AND column_name IN ('before_quantity', 'after_quantity', 'quantity')
ORDER BY column_name;

SELECT '✅ Migration tamamlandı! View yeniden oluşturuldu.' as result;

