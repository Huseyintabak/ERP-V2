-- Sync material_reservations.consumed_quantity after production logs
CREATE OR REPLACE FUNCTION update_reservations_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_row RECORD;
BEGIN
  -- Get order_id from plan
  SELECT order_id INTO v_order_id
  FROM production_plans
  WHERE id = NEW.plan_id;

  IF v_order_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Iterate snapshot rows for this plan
  FOR v_row IN
    SELECT material_id, material_type, quantity_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = NEW.plan_id
  LOOP
    UPDATE material_reservations mr
    SET 
      consumed_quantity = LEAST(
        mr.reserved_quantity,
        COALESCE(mr.consumed_quantity, 0) + (v_row.quantity_needed * NEW.quantity_produced)
      ),
      status = CASE 
        WHEN LEAST(
          mr.reserved_quantity,
          COALESCE(mr.consumed_quantity, 0) + (v_row.quantity_needed * NEW.quantity_produced)
        ) >= mr.reserved_quantity THEN 'completed'
        ELSE 'active'
      END
    WHERE mr.order_id = v_order_id
      AND mr.material_id = v_row.material_id
      AND mr.material_type = v_row.material_type;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_reservations_on_production ON production_logs;
CREATE TRIGGER trigger_sync_reservations_on_production
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION update_reservations_on_production();


