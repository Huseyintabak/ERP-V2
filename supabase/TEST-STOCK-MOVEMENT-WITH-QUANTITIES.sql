-- Test stock movement with before/after quantities
-- Fixed: Get actual user_id from users table (not auth.users)

-- First, check if we have users
SELECT '👥 AVAILABLE USERS' as step;
SELECT id, email, role 
FROM users 
LIMIT 5;

-- Test: Create a manual stock movement with quantities
DO $$
DECLARE
  test_material_id UUID;
  test_user_id UUID;
  current_qty NUMERIC;
  new_qty NUMERIC;
BEGIN
  -- Get a raw material
  SELECT id, quantity INTO test_material_id, current_qty
  FROM raw_materials
  WHERE quantity > 0
  LIMIT 1;
  
  -- Get a user (from users table, not auth.users)
  SELECT id INTO test_user_id
  FROM users
  WHERE role = 'depo'
  LIMIT 1;
  
  -- If no user found, use any user
  IF test_user_id IS NULL THEN
    SELECT id INTO test_user_id
    FROM users
    LIMIT 1;
  END IF;
  
  -- Calculate new quantity (add 50)
  new_qty := current_qty + 50;
  
  RAISE NOTICE 'Test Material: %', test_material_id;
  RAISE NOTICE 'Test User: %', test_user_id;
  RAISE NOTICE 'Before Qty: %', current_qty;
  RAISE NOTICE 'After Qty: %', new_qty;
  
  -- Update stock
  UPDATE raw_materials
  SET quantity = new_qty
  WHERE id = test_material_id;
  
  -- Create stock movement with before/after
  INSERT INTO stock_movements (
    material_type,
    material_id,
    movement_type,
    quantity,
    before_quantity,
    after_quantity,
    user_id,
    movement_source,
    description
  ) VALUES (
    'raw',
    test_material_id,
    'giris',
    50,
    current_qty,
    new_qty,
    test_user_id,  -- ✅ Fixed: Use users table
    'manual',
    'Test girişi - before/after quantities TEST'
  );
  
  RAISE NOTICE '✅ Test movement created successfully!';
END $$;

-- Check the result
SELECT '📊 TEST RESULT' as step;
SELECT 
  material_name,
  movement_type,
  quantity,
  before_quantity,
  after_quantity,
  user_name,
  description,
  created_at
FROM stock_movements_detailed
WHERE description LIKE '%TEST%'
ORDER BY created_at DESC
LIMIT 1;

-- Also check raw movements table
SELECT '🔍 LATEST MOVEMENTS (All)' as step;
SELECT 
  material_name,
  movement_type,
  quantity,
  before_quantity,
  after_quantity,
  CASE 
    WHEN before_quantity IS NOT NULL AND after_quantity IS NOT NULL 
    THEN '✅ HAS QUANTITIES'
    ELSE '❌ NULL QUANTITIES'
  END as status,
  created_at
FROM stock_movements_detailed
ORDER BY created_at DESC
LIMIT 5;

