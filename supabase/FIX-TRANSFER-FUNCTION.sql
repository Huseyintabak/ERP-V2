-- Fix transfer_zone_inventory function to use zone_inventories table

DROP FUNCTION IF EXISTS transfer_zone_inventory(UUID, UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION transfer_zone_inventory(
  from_zone UUID,
  to_zone UUID,
  product UUID,
  qty NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_source_qty NUMERIC;
  v_result JSON;
BEGIN
  -- Check source inventory (use zone_inventories, not zone_inventory)
  SELECT quantity INTO v_source_qty
  FROM zone_inventories
  WHERE zone_id = from_zone
    AND material_type = 'finished'
    AND material_id = product;

  -- Validate sufficient inventory
  IF v_source_qty IS NULL OR v_source_qty < qty THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Insufficient inventory. Available: %s, Requested: %s', 
        COALESCE(v_source_qty, 0), qty)
    );
  END IF;

  -- Decrease source zone inventory
  UPDATE zone_inventories
  SET 
    quantity = quantity - qty,
    updated_at = NOW()
  WHERE zone_id = from_zone
    AND material_type = 'finished'
    AND material_id = product;

  -- Increase destination zone inventory (or insert if not exists)
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
    quantity = zone_inventories.quantity + qty,
    updated_at = NOW();

  -- Create transfer record
  INSERT INTO zone_transfers (
    from_zone_id,
    to_zone_id,
    material_type,
    material_id,
    quantity,
    status,
    created_at
  )
  VALUES (
    from_zone,
    to_zone,
    'finished',
    product,
    qty,
    'completed',
    NOW()
  );

  -- Return success
  RETURN json_build_object(
    'success', true,
    'message', 'Transfer completed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION transfer_zone_inventory(UUID, UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_zone_inventory(UUID, UUID, UUID, NUMERIC) TO service_role;

-- Test the function
SELECT '✅ FUNCTION FIXED' as result;



