-- Migration: Clean up duplicate production plans
-- Description: Removes duplicate production plans for the same order and product
-- Date: 2025-01-22

-- First, let's see what duplicates we have
CREATE OR REPLACE FUNCTION analyze_duplicate_plans()
RETURNS TABLE (
  order_id UUID,
  product_id UUID,
  plan_count BIGINT,
  plan_ids UUID[],
  statuses TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pp.order_id,
    pp.product_id,
    COUNT(*)::BIGINT as plan_count,
    ARRAY_AGG(pp.id ORDER BY pp.created_at) as plan_ids,
    ARRAY_AGG(pp.status ORDER BY pp.created_at) as statuses
  FROM production_plans pp
  GROUP BY pp.order_id, pp.product_id
  HAVING COUNT(*) > 1
  ORDER BY plan_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up duplicates, keeping the oldest plan
CREATE OR REPLACE FUNCTION cleanup_duplicate_plans()
RETURNS TABLE (
  order_id UUID,
  product_id UUID,
  kept_plan_id UUID,
  deleted_plan_ids UUID[],
  deleted_count BIGINT
) AS $$
DECLARE
  v_order_id UUID;
  v_product_id UUID;
  v_kept_plan_id UUID;
  v_deleted_ids UUID[] := ARRAY[]::UUID[];
  v_deleted_count BIGINT := 0;
BEGIN
  -- Process each group of duplicates
  FOR v_order_id, v_product_id, v_kept_plan_id IN
    -- Get the oldest plan for each order-product combination
    SELECT 
      pp.order_id,
      pp.product_id,
      MIN(pp.id) as kept_plan_id
    FROM production_plans pp
    GROUP BY pp.order_id, pp.product_id
    HAVING COUNT(*) > 1
  LOOP
    -- Delete all plans except the one we're keeping
    WITH duplicate_plans AS (
      SELECT id
      FROM production_plans
      WHERE production_plans.order_id = v_order_id
        AND production_plans.product_id = v_product_id
        AND production_plans.id != v_kept_plan_id
      ORDER BY created_at DESC
    )
    SELECT 
      ARRAY_AGG(id)::UUID[],
      COUNT(*)
    INTO v_deleted_ids, v_deleted_count
    FROM duplicate_plans;

    -- Actually delete the duplicate plans
    DELETE FROM production_plans
    WHERE production_plans.order_id = v_order_id
      AND production_plans.product_id = v_product_id
      AND production_plans.id != v_kept_plan_id;

    -- Also delete associated BOM snapshots for deleted plans
    DELETE FROM production_plan_bom_snapshot
    WHERE plan_id = ANY(v_deleted_ids);

    -- Return the result
    RETURN QUERY
    SELECT 
      v_order_id,
      v_product_id,
      v_kept_plan_id,
      v_deleted_ids,
      v_deleted_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the cleanup
DO $$
DECLARE
  v_result RECORD;
  v_total_deleted BIGINT := 0;
BEGIN
  RAISE NOTICE '🔍 Analyzing duplicate production plans...';
  
  -- First, show what we'll be cleaning
  FOR v_result IN
    SELECT 
      pp.order_id,
      pp.product_id,
      COUNT(*)::BIGINT as plan_count,
      ARRAY_AGG(pp.id ORDER BY pp.created_at) as plan_ids,
      ARRAY_AGG(pp.status ORDER BY pp.created_at) as statuses
    FROM production_plans pp
    GROUP BY pp.order_id, pp.product_id
    HAVING COUNT(*) > 1
    ORDER BY plan_count DESC
    LIMIT 10
  LOOP
    RAISE NOTICE 'Found % duplicate(s) for order % and product %', 
      v_result.plan_count, v_result.order_id, v_result.product_id;
  END LOOP;

  -- Now run the cleanup
  RAISE NOTICE '🧹 Cleaning up duplicates...';
  
  FOR v_result IN
    SELECT * FROM cleanup_duplicate_plans()
  LOOP
    v_total_deleted := v_total_deleted + (v_result.deleted_count);
    RAISE NOTICE 'Kept plan % for order % and product %, deleted % plan(s)', 
      v_result.kept_plan_id, v_result.order_id, v_result.product_id, v_result.deleted_count;
  END LOOP;

  RAISE NOTICE '✅ Cleanup complete! Total plans deleted: %', v_total_deleted;
END;
$$;

-- Verify cleanup
DO $$
DECLARE
  v_remaining_duplicates BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_remaining_duplicates
  FROM (
    SELECT order_id, product_id
    FROM production_plans
    GROUP BY order_id, product_id
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_remaining_duplicates = 0 THEN
    RAISE NOTICE '✅ No duplicate plans remaining!';
  ELSE
    RAISE WARNING '⚠️  % duplicate plan groups still remaining!', v_remaining_duplicates;
  END IF;
END;
$$;

-- Cleanup functions (optional - keep them for future use or drop them)
-- DROP FUNCTION IF EXISTS cleanup_duplicate_plans();
-- DROP FUNCTION IF EXISTS analyze_duplicate_plans();

