-- 🔍 DEBUG: Zone Transfer Issue
-- Diagnose why transfers succeed but inventory doesn't change

-- ============================================
-- STEP 1: Check Last Transfer Records
-- ============================================

SELECT '📋 LAST TRANSFERS' as step;
SELECT 
  zt.id,
  zt.from_zone_id,
  zt.to_zone_id,
  zt.product_id,
  zt.quantity,
  zt.transfer_date,
  fz.name as from_zone_name,
  tz.name as to_zone_name,
  fp.name as product_name
FROM zone_transfers zt
LEFT JOIN warehouse_zones fz ON zt.from_zone_id = fz.id
LEFT JOIN warehouse_zones tz ON zt.to_zone_id = tz.id
LEFT JOIN finished_products fp ON zt.product_id = fp.id
ORDER BY zt.transfer_date DESC
LIMIT 5;

-- ============================================
-- STEP 2: Check Current Zone Inventories
-- ============================================

SELECT '📊 CURRENT INVENTORIES' as step;
SELECT 
  zi.id,
  zi.zone_id,
  wz.name as zone_name,
  zi.material_type,
  zi.material_id,
  fp.name as product_name,
  zi.quantity,
  zi.updated_at
FROM zone_inventories zi
LEFT JOIN warehouse_zones wz ON zi.zone_id = wz.id
LEFT JOIN finished_products fp ON zi.material_id = fp.id
WHERE zi.material_type = 'finished'
ORDER BY zi.updated_at DESC
LIMIT 10;

-- ============================================
-- STEP 3: Check if Inventory Exists for Transfer Zones
-- ============================================

SELECT '🔍 INVENTORY FOR LAST TRANSFER ZONES' as step;

WITH last_transfer AS (
  SELECT * FROM zone_transfers 
  ORDER BY transfer_date DESC 
  LIMIT 1
)
SELECT 
  'SOURCE ZONE' as check_type,
  lt.from_zone_id as zone_id,
  wz.name as zone_name,
  lt.product_id,
  fp.name as product_name,
  zi.quantity as current_quantity,
  lt.quantity as transferred_quantity,
  CASE 
    WHEN zi.id IS NULL THEN '❌ NO INVENTORY RECORD'
    ELSE '✅ HAS INVENTORY'
  END as status
FROM last_transfer lt
LEFT JOIN warehouse_zones wz ON lt.from_zone_id = wz.id
LEFT JOIN finished_products fp ON lt.product_id = fp.id
LEFT JOIN zone_inventories zi ON 
  zi.zone_id = lt.from_zone_id 
  AND zi.material_id = lt.product_id
  AND zi.material_type = 'finished'

UNION ALL

SELECT 
  'TARGET ZONE' as check_type,
  lt.to_zone_id as zone_id,
  wz.name as zone_name,
  lt.product_id,
  fp.name as product_name,
  zi.quantity as current_quantity,
  lt.quantity as transferred_quantity,
  CASE 
    WHEN zi.id IS NULL THEN '❌ NO INVENTORY RECORD'
    ELSE '✅ HAS INVENTORY'
  END as status
FROM last_transfer lt
LEFT JOIN warehouse_zones wz ON lt.to_zone_id = wz.id
LEFT JOIN finished_products fp ON lt.product_id = fp.id
LEFT JOIN zone_inventories zi ON 
  zi.zone_id = lt.to_zone_id 
  AND zi.material_id = lt.product_id
  AND zi.material_type = 'finished';

-- ============================================
-- STEP 4: Check RLS Policies on zone_inventories
-- ============================================

SELECT '🔒 RLS POLICIES - zone_inventories' as step;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'zone_inventories';

-- ============================================
-- STEP 5: Manual Transfer Test with Logging
-- ============================================

-- Get test data
DO $$
DECLARE
  test_from_zone UUID;
  test_to_zone UUID;
  test_product UUID;
  test_quantity INTEGER := 1;
  initial_source_qty NUMERIC;
  initial_target_qty NUMERIC;
  result JSON;
  final_source_qty NUMERIC;
  final_target_qty NUMERIC;
BEGIN
  -- Get two zones
  SELECT id INTO test_from_zone 
  FROM warehouse_zones 
  WHERE zone_type = 'center' 
  LIMIT 1;
  
  SELECT id INTO test_to_zone 
  FROM warehouse_zones 
  WHERE id != test_from_zone 
  LIMIT 1;
  
  -- Get a product that has inventory in source zone
  SELECT zi.material_id INTO test_product
  FROM zone_inventories zi
  WHERE zi.zone_id = test_from_zone
    AND zi.material_type = 'finished'
    AND zi.quantity > 0
  LIMIT 1;
  
  IF test_from_zone IS NULL OR test_to_zone IS NULL OR test_product IS NULL THEN
    RAISE NOTICE '❌ TEST DATA NOT AVAILABLE';
    RETURN;
  END IF;
  
  -- Get initial quantities
  SELECT quantity INTO initial_source_qty
  FROM zone_inventories
  WHERE zone_id = test_from_zone 
    AND material_id = test_product
    AND material_type = 'finished';
  
  SELECT quantity INTO initial_target_qty
  FROM zone_inventories
  WHERE zone_id = test_to_zone 
    AND material_id = test_product
    AND material_type = 'finished';
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE '🧪 MANUAL TRANSFER TEST';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'From Zone: %', test_from_zone;
  RAISE NOTICE 'To Zone: %', test_to_zone;
  RAISE NOTICE 'Product: %', test_product;
  RAISE NOTICE 'Quantity: %', test_quantity;
  RAISE NOTICE 'Initial Source Qty: %', COALESCE(initial_source_qty, 0);
  RAISE NOTICE 'Initial Target Qty: %', COALESCE(initial_target_qty, 0);
  
  -- Execute transfer
  SELECT transfer_between_zones(
    test_from_zone,
    test_to_zone,
    test_product,
    test_quantity,
    NULL::UUID
  ) INTO result;
  
  RAISE NOTICE 'Transfer Result: %', result;
  
  -- Get final quantities
  SELECT quantity INTO final_source_qty
  FROM zone_inventories
  WHERE zone_id = test_from_zone 
    AND material_id = test_product
    AND material_type = 'finished';
  
  SELECT quantity INTO final_target_qty
  FROM zone_inventories
  WHERE zone_id = test_to_zone 
    AND material_id = test_product
    AND material_type = 'finished';
  
  RAISE NOTICE 'Final Source Qty: %', COALESCE(final_source_qty, 0);
  RAISE NOTICE 'Final Target Qty: %', COALESCE(final_target_qty, 0);
  RAISE NOTICE '===========================================';
  
  -- Verify
  IF final_source_qty = initial_source_qty - test_quantity THEN
    RAISE NOTICE '✅ SOURCE UPDATED CORRECTLY';
  ELSE
    RAISE NOTICE '❌ SOURCE NOT UPDATED! Expected: %, Got: %', 
      initial_source_qty - test_quantity, final_source_qty;
  END IF;
  
  IF final_target_qty = COALESCE(initial_target_qty, 0) + test_quantity THEN
    RAISE NOTICE '✅ TARGET UPDATED CORRECTLY';
  ELSE
    RAISE NOTICE '❌ TARGET NOT UPDATED! Expected: %, Got: %', 
      COALESCE(initial_target_qty, 0) + test_quantity, final_target_qty;
  END IF;
  
END $$;

-- ============================================
-- STEP 6: Check for Triggers that might interfere
-- ============================================

SELECT '⚡ TRIGGERS on zone_inventories' as step;
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'zone_inventories';

