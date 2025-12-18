-- Create enhanced view for stock movements with material and user details
-- This view joins stock_movements with material tables and users to provide complete information

DROP VIEW IF EXISTS stock_movements_detailed;

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
  
  -- User details
  COALESCE(u.email, 'Bilinmeyen Kullanıcı') AS user_name,
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

-- Join with users
LEFT JOIN auth.users u 
  ON sm.user_id = u.id;

-- Grant permissions
GRANT SELECT ON stock_movements_detailed TO authenticated;
GRANT SELECT ON stock_movements_detailed TO service_role;

SELECT '✅ STOCK_MOVEMENTS_DETAILED VIEW CREATED!' as result;

-- Test the view
SELECT 
  material_name,
  material_type,
  movement_type,
  quantity,
  user_name,
  created_at
FROM stock_movements_detailed
ORDER BY created_at DESC
LIMIT 5;

