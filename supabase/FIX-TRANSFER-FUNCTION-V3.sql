-- 🔧 FIX: Transfer Function V3 - With Enhanced Logging and Error Handling
-- This version adds detailed logging to diagnose why inventory isn't updating

DROP FUNCTION IF EXISTS transfer_between_zones(UUID, UUID, UUID, INTEGER, UUID);

CREATE OR REPLACE FUNCTION transfer_between_zones(
  from_zone UUID,
  to_zone UUID,
  product UUID,
  qty INTEGER,
  user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  current_qty NUMERIC;
  source_record_exists BOOLEAN;
  rows_updated INTEGER;
  rows_inserted INTEGER;
BEGIN
  -- Log input parameters
  RAISE NOTICE '=== TRANSFER START ===';
  RAISE NOTICE 'From Zone: %', from_zone;
  RAISE NOTICE 'To Zone: %', to_zone;
  RAISE NOTICE 'Product: %', product;
  RAISE NOTICE 'Quantity: %', qty;
  
  -- Check if source zone has enough quantity
  SELECT quantity, TRUE INTO current_qty, source_record_exists
  FROM zone_inventories 
  WHERE zone_id = from_zone 
    AND material_type = 'finished'
    AND material_id = product;
  
  RAISE NOTICE 'Current Source Qty: %', COALESCE(current_qty, 0);
  RAISE NOTICE 'Source Record Exists: %', COALESCE(source_record_exists, FALSE);
  
  IF current_qty IS NULL OR current_qty < qty THEN
    RAISE NOTICE '❌ INSUFFICIENT INVENTORY';
    RETURN json_build_object(
      'success', false, 
      'error', format('Insufficient inventory. Available: %s, Requested: %s', 
        COALESCE(current_qty, 0), qty)
    );
  END IF;

  -- Update source zone
  RAISE NOTICE 'Updating source zone...';
  UPDATE zone_inventories
  SET 
    quantity = quantity - qty,
    updated_at = NOW()
  WHERE zone_id = from_zone 
    AND material_type = 'finished'
    AND material_id = product;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RAISE NOTICE 'Source zone rows updated: %', rows_updated;
  
  IF rows_updated = 0 THEN
    RAISE NOTICE '❌ SOURCE UPDATE FAILED - NO ROWS AFFECTED';
    RETURN json_build_object(
      'success', false,
      'error', 'Failed to update source zone inventory'
    );
  END IF;

  -- Insert or update destination zone
  RAISE NOTICE 'Upserting destination zone...';
  INSERT INTO zone_inventories (
    zone_id, 
    material_type,
    material_id, 
    quantity,
    created_at,
    updated_at
  )
  VALUES (
    to_zone, 
    'finished',
    product, 
    qty,
    NOW(),
    NOW()
  )
  ON CONFLICT (zone_id, material_type, material_id)
  DO UPDATE SET 
    quantity = zone_inventories.quantity + EXCLUDED.quantity,
    updated_at = NOW();
  
  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RAISE NOTICE 'Destination zone rows affected: %', rows_inserted;
  
  IF rows_inserted = 0 THEN
    RAISE NOTICE '❌ DESTINATION UPSERT FAILED - NO ROWS AFFECTED';
    -- Rollback source update
    RAISE EXCEPTION 'Failed to update destination zone inventory';
  END IF;

  -- Record transfer
  RAISE NOTICE 'Recording transfer...';
  INSERT INTO zone_transfers (
    from_zone_id, 
    to_zone_id, 
    product_id,
    quantity, 
    transfer_date,
    created_by
  )
  VALUES (
    from_zone, 
    to_zone, 
    product,
    qty, 
    NOW(),
    user_id
  );
  
  RAISE NOTICE '✅ TRANSFER COMPLETED SUCCESSFULLY';
  RAISE NOTICE '=== TRANSFER END ===';

  RETURN json_build_object(
    'success', true,
    'message', 'Transfer completed successfully',
    'debug', json_build_object(
      'rows_updated', rows_updated,
      'rows_inserted', rows_inserted
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ TRANSFER EXCEPTION: %', SQLERRM;
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION transfer_between_zones(UUID, UUID, UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_between_zones(UUID, UUID, UUID, INTEGER, UUID) TO service_role;

-- Test the function
SELECT '✅ TRANSFER_BETWEEN_ZONES V3 CREATED WITH LOGGING!' as result;

-- Show how to view logs in Supabase
SELECT '💡 To view logs in Supabase: Dashboard > Logs > Postgres Logs' as tip;

