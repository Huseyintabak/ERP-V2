-- ============================================
-- MIGRATION'ı ÇALIŞTIRAN FUNCTION
-- Bu function migration SQL'ini execute eder
-- ============================================

CREATE OR REPLACE FUNCTION execute_stock_movements_migration()
RETURNS TEXT AS $$
DECLARE
  result_msg TEXT := '';
BEGIN
  -- before_quantity INTEGER ise NUMERIC'e çevir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name = 'before_quantity'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN before_quantity TYPE NUMERIC(12, 2) USING before_quantity::NUMERIC(12, 2);
    
    result_msg := result_msg || '✅ before_quantity INTEGER → NUMERIC(12,2) çevrildi. ';
  ELSE
    result_msg := result_msg || 'ℹ️  before_quantity zaten NUMERIC veya mevcut değil. ';
  END IF;

  -- after_quantity INTEGER ise NUMERIC'e çevir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name = 'after_quantity'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN after_quantity TYPE NUMERIC(12, 2) USING after_quantity::NUMERIC(12, 2);
    
    result_msg := result_msg || '✅ after_quantity INTEGER → NUMERIC(12,2) çevrildi.';
  ELSE
    result_msg := result_msg || 'ℹ️  after_quantity zaten NUMERIC veya mevcut değil.';
  END IF;

  RETURN result_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function'ı public olarak expose et
GRANT EXECUTE ON FUNCTION execute_stock_movements_migration() TO authenticated;
GRANT EXECUTE ON FUNCTION execute_stock_movements_migration() TO anon;

SELECT '✅ Migration function oluşturuldu! Çalıştırmak için: SELECT execute_stock_movements_migration();' as result;

