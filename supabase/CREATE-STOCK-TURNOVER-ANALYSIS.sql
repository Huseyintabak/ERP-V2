-- Create function for stock turnover analysis
-- Analyzes how frequently materials move (high/medium/low turnover)

-- ============================================
-- 1. Get Stock Turnover Analysis
-- ============================================

CREATE OR REPLACE FUNCTION get_stock_turnover_analysis()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  high_turnover INTEGER;
  medium_turnover INTEGER;
  low_turnover INTEGER;
  date_30_days_ago TIMESTAMPTZ;
BEGIN
  -- Calculate date 30 days ago
  date_30_days_ago := NOW() - INTERVAL '30 days';
  
  -- High turnover: Materials with 5+ movements in last 30 days
  WITH material_movement_counts AS (
    SELECT 
      material_id,
      COUNT(*) as movement_count
    FROM stock_movements
    WHERE created_at >= date_30_days_ago
    GROUP BY material_id
  )
  SELECT COUNT(*) INTO high_turnover
  FROM material_movement_counts
  WHERE movement_count >= 5;
  
  -- Medium turnover: Materials with 2-4 movements in last 30 days
  WITH material_movement_counts AS (
    SELECT 
      material_id,
      COUNT(*) as movement_count
    FROM stock_movements
    WHERE created_at >= date_30_days_ago
    GROUP BY material_id
  )
  SELECT COUNT(*) INTO medium_turnover
  FROM material_movement_counts
  WHERE movement_count >= 2 AND movement_count < 5;
  
  -- Low turnover: Materials with 0-1 movements in last 30 days
  -- This includes all materials that haven't moved or moved once
  WITH all_materials AS (
    SELECT id FROM raw_materials
    UNION
    SELECT id FROM semi_finished_products
    UNION
    SELECT id FROM finished_products
  ),
  material_movement_counts AS (
    SELECT 
      am.id as material_id,
      COUNT(sm.id) as movement_count
    FROM all_materials am
    LEFT JOIN stock_movements sm 
      ON sm.material_id = am.id 
      AND sm.created_at >= date_30_days_ago
    GROUP BY am.id
  )
  SELECT COUNT(*) INTO low_turnover
  FROM material_movement_counts
  WHERE movement_count < 2;
  
  RETURN json_build_object(
    'high', COALESCE(high_turnover, 0),
    'medium', COALESCE(medium_turnover, 0),
    'low', COALESCE(low_turnover, 0)
  );
END;
$$;

-- ============================================
-- 2. Grant Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION get_stock_turnover_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION get_stock_turnover_analysis() TO service_role;

-- ============================================
-- 3. Test Function
-- ============================================

SELECT '✅ STOCK TURNOVER ANALYSIS FUNCTION CREATED!' as result;

-- Test the function
SELECT 
  'Stock Turnover Analysis' as metric,
  get_stock_turnover_analysis() as analysis;

-- ============================================
-- 4. Show Detailed Breakdown
-- ============================================

SELECT '📊 STOCK TURNOVER DETAILS (Last 30 Days)' as info;

WITH material_movement_counts AS (
  SELECT 
    sm.material_id,
    sm.material_type,
    COUNT(*) as movement_count,
    MAX(sm.created_at) as last_movement,
    CASE 
      WHEN sm.material_type = 'raw' THEN rm.name
      WHEN sm.material_type = 'semi' THEN sfp.name
      WHEN sm.material_type = 'finished' THEN fp.name
    END as material_name
  FROM stock_movements sm
  LEFT JOIN raw_materials rm ON sm.material_type = 'raw' AND sm.material_id = rm.id
  LEFT JOIN semi_finished_products sfp ON sm.material_type = 'semi' AND sm.material_id = sfp.id
  LEFT JOIN finished_products fp ON sm.material_type = 'finished' AND sm.material_id = fp.id
  WHERE sm.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY sm.material_id, sm.material_type, rm.name, sfp.name, fp.name
)
SELECT 
  material_name,
  material_type,
  movement_count,
  CASE 
    WHEN movement_count >= 5 THEN '🔥 HIGH'
    WHEN movement_count >= 2 THEN '📊 MEDIUM'
    ELSE '🐌 LOW'
  END as turnover_category,
  last_movement
FROM material_movement_counts
ORDER BY movement_count DESC
LIMIT 20;

-- ============================================
-- 5. Materials with NO movement (Dormant Stock)
-- ============================================

SELECT '💤 DORMANT STOCK (No Movement in 30 Days)' as info;

WITH all_materials_with_names AS (
  SELECT id, name, 'raw' as material_type FROM raw_materials
  UNION ALL
  SELECT id, name, 'semi' as material_type FROM semi_finished_products
  UNION ALL
  SELECT id, name, 'finished' as material_type FROM finished_products
),
materials_with_no_movement AS (
  SELECT am.*
  FROM all_materials_with_names am
  WHERE NOT EXISTS (
    SELECT 1 FROM stock_movements sm
    WHERE sm.material_id = am.id
      AND sm.created_at >= NOW() - INTERVAL '30 days'
  )
)
SELECT 
  name,
  material_type,
  '💤 NO MOVEMENT' as status
FROM materials_with_no_movement
ORDER BY name
LIMIT 10;



