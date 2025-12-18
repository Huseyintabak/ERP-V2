-- ============================================
-- MIGRATION RPC FUNCTION OLUŞTUR
-- Bu function migration SQL'ini çalıştırır
-- ============================================

-- Migration RPC function oluştur
CREATE OR REPLACE FUNCTION migrate_stock_movements_quantities()
RETURNS JSON AS $$
DECLARE
  result JSON;
  before_type TEXT;
  after_type TEXT;
BEGIN
  -- Mevcut tipleri kontrol et
  SELECT data_type INTO before_type
  FROM information_schema.columns
  WHERE table_name = 'stock_movements'
    AND column_name = 'before_quantity';

  SELECT data_type INTO after_type
  FROM information_schema.columns
  WHERE table_name = 'stock_movements'
    AND column_name = 'after_quantity';

  -- before_quantity INTEGER ise NUMERIC'e çevir
  IF before_type = 'integer' THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN before_quantity TYPE NUMERIC(12, 2) USING before_quantity::NUMERIC(12, 2);
    
    result := json_build_object(
      'success', true,
      'before_quantity', 'INTEGER → NUMERIC(12,2) çevrildi'
    );
  ELSE
    result := json_build_object(
      'success', true,
      'before_quantity', format('Zaten %s tipinde', COALESCE(before_type, 'mevcut değil'))
    );
  END IF;

  -- after_quantity INTEGER ise NUMERIC'e çevir
  IF after_type = 'integer' THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN after_quantity TYPE NUMERIC(12, 2) USING after_quantity::NUMERIC(12, 2);
    
    result := result || json_build_object(
      'after_quantity', 'INTEGER → NUMERIC(12,2) çevrildi'
    );
  ELSE
    result := result || json_build_object(
      'after_quantity', format('Zaten %s tipinde', COALESCE(after_type, 'mevcut değil'))
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'ı public olarak expose et
GRANT EXECUTE ON FUNCTION migrate_stock_movements_quantities() TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_stock_movements_quantities() TO anon;

SELECT '✅ Migration RPC function oluşturuldu!' as result;

