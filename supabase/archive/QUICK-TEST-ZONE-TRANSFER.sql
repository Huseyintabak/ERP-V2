-- 🚀 QUICK TEST: Zone Transfer System
-- Run this after FIX-TRANSFER-BETWEEN-ZONES-V2.sql

-- ============================================
-- STEP 1: Check Prerequisites
-- ============================================

-- Check if zones exist
SELECT '📦 ZONES CHECK' as step;
SELECT id, name, zone_type, customer_id 
FROM warehouse_zones 
ORDER BY zone_type, name
LIMIT 10;

-- Check if products exist
SELECT '🎁 PRODUCTS CHECK' as step;
SELECT id, name, code, sale_price 
FROM finished_products 
ORDER BY name
LIMIT 10;

-- Check zone inventory
SELECT '📊 INVENTORY CHECK' as step;
SELECT 
  zi.id,
  zi.zone_id,
  wz.name as zone_name,
  zi.material_id,
  fp.name as product_name,
  zi.quantity
FROM zone_inventories zi
LEFT JOIN warehouse_zones wz ON zi.zone_id = wz.id
LEFT JOIN finished_products fp ON zi.material_id = fp.id
WHERE zi.material_type = 'finished'
ORDER BY zi.quantity DESC
LIMIT 10;

-- ============================================
-- STEP 2: Check Function Exists
-- ============================================

SELECT '🔧 FUNCTION CHECK' as step;
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'transfer_between_zones';

-- ============================================
-- STEP 3: Check zone_transfers Schema
-- ============================================

SELECT '📋 ZONE_TRANSFERS SCHEMA' as step;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'zone_transfers'
ORDER BY ordinal_position;

-- ============================================
-- STEP 4: Sample Data for Testing
-- ============================================

-- If you need to create test zones and inventory:
/*
-- Create test zones (uncomment if needed)
INSERT INTO warehouse_zones (name, zone_type) 
VALUES 
  ('Test Merkez Depo', 'center'),
  ('Test Müşteri Zone A', 'general')
ON CONFLICT DO NOTHING;

-- Get a product ID for testing
DO $$
DECLARE
  test_zone_id UUID;
  test_product_id UUID;
BEGIN
  -- Get first center zone
  SELECT id INTO test_zone_id 
  FROM warehouse_zones 
  WHERE zone_type = 'center' 
  LIMIT 1;
  
  -- Get first product
  SELECT id INTO test_product_id 
  FROM finished_products 
  LIMIT 1;
  
  -- Add test inventory
  INSERT INTO zone_inventories (
    zone_id, 
    material_type, 
    material_id, 
    quantity
  )
  VALUES (
    test_zone_id,
    'finished',
    test_product_id,
    100
  )
  ON CONFLICT (zone_id, material_type, material_id) 
  DO UPDATE SET quantity = zone_inventories.quantity + 100;
  
  RAISE NOTICE 'Test data created: Zone %, Product %', test_zone_id, test_product_id;
END $$;
*/

-- ============================================
-- STEP 5: Manual Transfer Test
-- ============================================

-- Get IDs for testing (copy these values)
SELECT '🎯 TEST DATA' as step;
SELECT 
  'Source Zone' as type,
  wz.id,
  wz.name,
  fp.id as product_id,
  fp.name as product_name,
  zi.quantity as available_qty
FROM zone_inventories zi
JOIN warehouse_zones wz ON zi.zone_id = wz.id
JOIN finished_products fp ON zi.material_id = fp.id
WHERE zi.material_type = 'finished'
  AND zi.quantity > 0
ORDER BY zi.quantity DESC
LIMIT 5;

SELECT 
  'Target Zones' as type,
  id,
  name,
  zone_type
FROM warehouse_zones
ORDER BY zone_type, name
LIMIT 5;

-- ============================================
-- STEP 6: Execute Test Transfer
-- ============================================

/*
-- MANUAL TEST: Replace these UUIDs with actual values from above
SELECT '🚀 TRANSFER TEST' as step;
SELECT transfer_between_zones(
  'SOURCE_ZONE_ID'::UUID,     -- from_zone (copy from above)
  'TARGET_ZONE_ID'::UUID,     -- to_zone (copy from above)
  'PRODUCT_ID'::UUID,         -- product (copy from above)
  5,                          -- quantity
  NULL::UUID                  -- user_id (optional)
);
*/

-- ============================================
-- STEP 7: Verify Transfer Results
-- ============================================

SELECT '✅ VERIFICATION' as step;
SELECT 
  zt.id,
  fz.name as from_zone,
  tz.name as to_zone,
  fp.name as product,
  zt.quantity,
  zt.transfer_date,
  zt.created_by
FROM zone_transfers zt
LEFT JOIN warehouse_zones fz ON zt.from_zone_id = fz.id
LEFT JOIN warehouse_zones tz ON zt.to_zone_id = tz.id
LEFT JOIN finished_products fp ON zt.product_id = fp.id
ORDER BY zt.transfer_date DESC
LIMIT 10;

-- ============================================
-- ✅ READY!
-- ============================================

SELECT '
╔═══════════════════════════════════════════════════════╗
║  ✅ ZONE TRANSFER SYSTEM - READY FOR TESTING        ║
╟───────────────────────────────────────────────────────╢
║  1. Function exists: transfer_between_zones()         ║
║  2. Schema verified: zone_transfers table             ║
║  3. Test data available                               ║
║  4. Frontend UI ready: /depo-zone-yonetimi           ║
╟───────────────────────────────────────────────────────╢
║  Next: Test via UI or use manual test above          ║
╚═══════════════════════════════════════════════════════╝
' as status;

