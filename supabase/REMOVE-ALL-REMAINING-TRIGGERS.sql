-- 🔧 REMOVE ALL REMAINING TRIGGERS: Kalan tüm trigger'ları kaldır
-- Bu dosya kalan tüm trigger'ları kaldırır

-- 1. Tüm trigger'ları listele (sadece isimler)
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 2. Tüm trigger'ları kaldır (bilinen isimlerle)
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_transfers;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON zone_inventories;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON semi_finished_products;
DROP TRIGGER IF EXISTS audit_trigger_stock_changes ON raw_materials;

DROP TRIGGER IF EXISTS raw_materials_audit_trigger ON raw_materials;
DROP TRIGGER IF EXISTS semi_finished_products_audit_trigger ON semi_finished_products;
DROP TRIGGER IF EXISTS finished_products_audit_trigger ON finished_products;

-- 3. Tüm audit fonksiyonlarını kaldır
DROP FUNCTION IF EXISTS audit_stock_trigger() CASCADE;
DROP FUNCTION IF EXISTS audit_stock_changes() CASCADE;
DROP FUNCTION IF EXISTS log_audit_event(UUID, VARCHAR, VARCHAR, TEXT, JSONB, JSONB, TEXT, VARCHAR, VARCHAR) CASCADE;

-- 4. Transfer fonksiyonunu yeniden oluştur
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
  source_zone_type TEXT;
  dest_zone_type TEXT;
BEGIN
  -- Check if source zone has enough quantity
  SELECT zone_type INTO source_zone_type
  FROM warehouse_zones 
  WHERE id = from_zone;
  
  IF source_zone_type = 'center' THEN
    -- For center zone, check finished_products table
    SELECT quantity INTO current_qty
    FROM finished_products 
    WHERE id = product;
  ELSE
    -- For other zones, check zone_inventories table
    SELECT quantity INTO current_qty
    FROM zone_inventories 
    WHERE zone_id = from_zone 
      AND material_type = 'finished'
      AND material_id = product;
  END IF;
  
  IF current_qty IS NULL OR current_qty < qty THEN
    RETURN json_build_object(
      'success', false, 
      'error', format('Insufficient inventory. Available: %s, Requested: %s', 
        COALESCE(current_qty, 0), qty)
    );
  END IF;

  -- Update source zone
  IF source_zone_type = 'center' THEN
    -- For center zone, update finished_products table
    UPDATE finished_products
    SET 
      quantity = quantity - qty,
      updated_at = NOW()
    WHERE id = product;
  ELSE
    -- For other zones, update zone_inventories table
    UPDATE zone_inventories
    SET 
      quantity = quantity - qty,
      updated_at = NOW()
    WHERE zone_id = from_zone 
      AND material_type = 'finished'
      AND material_id = product;
  END IF;

  -- Insert or update destination zone
  SELECT zone_type INTO dest_zone_type
  FROM warehouse_zones 
  WHERE id = to_zone;
  
  IF dest_zone_type = 'center' THEN
    -- For center zone, update finished_products table
    UPDATE finished_products
    SET 
      quantity = quantity + qty,
      updated_at = NOW()
    WHERE id = product;
  ELSE
    -- For other zones, insert/update zone_inventories table
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
  END IF;

  -- Record transfer
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

-- 5. Kalan trigger'ları tekrar kontrol et
SELECT 
    c.relname as table_name,
    t.tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

SELECT '✅ ALL REMAINING TRIGGERS REMOVED!' as result;
