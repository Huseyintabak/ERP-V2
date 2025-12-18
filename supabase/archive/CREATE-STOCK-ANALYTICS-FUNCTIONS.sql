-- Create functions for stock analytics

-- ============================================
-- 1. Get Critical Stock Count
-- ============================================

CREATE OR REPLACE FUNCTION get_critical_stock_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  critical_count INTEGER;
BEGIN
  -- Count items at or below critical_level
  SELECT COUNT(*) INTO critical_count
  FROM raw_materials
  WHERE quantity <= COALESCE(critical_level, 10);
  
  RETURN COALESCE(critical_count, 0);
END;
$$;

-- ============================================
-- 2. Get Low Stock Count
-- ============================================

CREATE OR REPLACE FUNCTION get_low_stock_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  low_count INTEGER;
BEGIN
  -- Count items between critical_level and 2x critical_level
  -- (Low stock but not critical yet)
  SELECT COUNT(*) INTO low_count
  FROM raw_materials
  WHERE quantity > COALESCE(critical_level, 10)
    AND quantity <= (COALESCE(critical_level, 10) * 2);
  
  RETURN COALESCE(low_count, 0);
END;
$$;

-- ============================================
-- 3. Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_critical_stock_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_critical_stock_count() TO service_role;

GRANT EXECUTE ON FUNCTION get_low_stock_count() TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_count() TO service_role;

-- ============================================
-- 4. Test Functions
-- ============================================

SELECT '✅ STOCK ANALYTICS FUNCTIONS CREATED!' as result;

-- Test critical stock count
SELECT 
  'Critical Stock Count' as metric,
  get_critical_stock_count() as count;

-- Test low stock count
SELECT 
  'Low Stock Count' as metric,
  get_low_stock_count() as count;

-- Show some examples of critical/low stock items
SELECT '📋 EXAMPLE CRITICAL/LOW STOCK ITEMS' as info;
SELECT 
  id,
  name,
  code,
  quantity,
  critical_level,
  CASE 
    WHEN quantity <= COALESCE(critical_level, 10) THEN '🔴 CRITICAL'
    WHEN quantity <= (COALESCE(critical_level, 10) * 2) THEN '🟡 LOW'
    ELSE '✅ OK'
  END as stock_status
FROM raw_materials
WHERE quantity <= (COALESCE(critical_level, 10) * 2)
ORDER BY quantity ASC
LIMIT 10;

