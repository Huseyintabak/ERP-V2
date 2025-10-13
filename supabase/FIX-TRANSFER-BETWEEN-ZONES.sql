-- Fix transfer_between_zones function to use zone_inventories table

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
BEGIN
  -- Check if source zone has enough quantity (use zone_inventories, not zone_inventory)
  SELECT quantity INTO current_qty 
  FROM zone_inventories 
  WHERE zone_id = from_zone 
    AND material_type = 'finished'
    AND material_id = product;
  
  IF current_qty IS NULL OR current_qty < qty THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('Insufficient inventory. Available: %s, Requested: %s', 
        COALESCE(current_qty, 0), qty)
    );
  END IF;

  -- Update source zone
  UPDATE zone_inventories
  SET 
    quantity = quantity - qty,
    updated_at = NOW()
  WHERE zone_id = from_zone 
    AND material_type = 'finished'
    AND material_id = product;

  -- Insert or update destination zone
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

  -- Record transfer
  INSERT INTO zone_transfers (
    from_zone_id, 
    to_zone_id, 
    material_type,
    material_id, 
    quantity, 
    created_by,
    status,
    created_at
  )
  VALUES (
    from_zone, 
    to_zone, 
    'finished',
    product, 
    qty, 
    user_id,
    'completed',
    NOW()
  );

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
GRANT EXECUTE ON FUNCTION transfer_between_zones(UUID, UUID, UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION transfer_between_zones(UUID, UUID, UUID, INTEGER, UUID) TO service_role;

SELECT '✅ TRANSFER_BETWEEN_ZONES FIXED!' as result;



