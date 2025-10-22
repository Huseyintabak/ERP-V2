-- Fix for "invalid transaction termination" error in cancel and rollback functions
-- This migration removes explicit ROLLBACK statements from functions
-- PostgreSQL automatically handles rollback in function exception handlers
-- 
-- Issue: PostgreSQL functions cannot use explicit ROLLBACK/COMMIT statements
-- because they run within a transaction context managed by the caller.
-- When an exception occurs, PostgreSQL automatically rolls back the transaction.

-- 1. Fix cancel_order_with_plans function
CREATE OR REPLACE FUNCTION cancel_order_with_plans(
  p_order_id UUID,
  p_reason TEXT DEFAULT 'Order cancelled',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  order_record RECORD;
  plan_record RECORD;
  cancel_result JSON;
BEGIN
  -- Order kaydını al
  SELECT * INTO order_record
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order not found');
  END IF;

  -- Order durumu kontrolü
  IF order_record.status = 'tamamlandi' THEN
    RETURN json_build_object('success', false, 'error', 'Completed orders cannot be cancelled');
  END IF;

  IF order_record.status = 'iptal' THEN
    RETURN json_build_object('success', false, 'error', 'Order already cancelled');
  END IF;

  -- Transaction başlat
  BEGIN
    -- 1. Tüm production planlarını iptal et
    FOR plan_record IN 
      SELECT * FROM production_plans 
      WHERE order_id = p_order_id AND status != 'iptal'
    LOOP
      -- Plan'ı iptal et
      UPDATE production_plans
      SET 
        status = 'iptal',
        cancelled_at = NOW(),
        cancelled_by = p_user_id,
        cancel_reason = p_reason
      WHERE id = plan_record.id;

      -- Rezervasyonları serbest bırak
      PERFORM release_reservations_on_plan_cancel(plan_record.id);
    END LOOP;

    -- 2. Order'ı iptal et
    UPDATE orders
    SET 
      status = 'iptal',
      cancelled_at = NOW(),
      cancelled_by = p_user_id,
      cancel_reason = p_reason
    WHERE id = p_order_id;

    -- 3. Audit log kaydet
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      description
    ) VALUES (
      p_user_id,
      'UPDATE',
      'orders',
      p_order_id,
      json_build_object('status', order_record.status),
      json_build_object('status', 'iptal'),
      'Order cancelled: ' || p_reason
    );

    -- Başarılı sonuç
    cancel_result := json_build_object(
      'success', true,
      'order_id', p_order_id,
      'reason', p_reason,
      'cancelled_at', NOW()
    );

    RETURN cancel_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Hata durumunda otomatik rollback yapılır
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- 2. Fix cancel_production_plan function
CREATE OR REPLACE FUNCTION cancel_production_plan(
  p_plan_id UUID,
  p_reason TEXT DEFAULT 'Production plan cancelled',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  plan_record RECORD;
  order_record RECORD;
  cancel_result JSON;
BEGIN
  -- Plan kaydını al
  SELECT 
    pp.*,
    o.status as order_status,
    o.created_by as order_owner
  INTO plan_record
  FROM production_plans pp
  JOIN orders o ON pp.order_id = o.id
  WHERE pp.id = p_plan_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Production plan not found');
  END IF;

  -- Plan durumu kontrolü
  IF plan_record.status = 'tamamlandi' THEN
    RETURN json_build_object('success', false, 'error', 'Completed plans cannot be cancelled');
  END IF;

  IF plan_record.status = 'iptal' THEN
    RETURN json_build_object('success', false, 'error', 'Plan already cancelled');
  END IF;

  -- Order durumu kontrolü
  IF plan_record.order_status = 'tamamlandi' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot cancel plans of completed orders');
  END IF;

  -- Transaction başlat
  BEGIN
    -- 1. Plan'ı iptal et
    UPDATE production_plans
    SET 
      status = 'iptal',
      cancelled_at = NOW(),
      cancelled_by = p_user_id,
      cancel_reason = p_reason
    WHERE id = p_plan_id;

    -- 2. Rezervasyonları serbest bırak
    PERFORM release_reservations_on_plan_cancel(p_plan_id);

    -- 3. Audit log kaydet
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      description
    ) VALUES (
      p_user_id,
      'UPDATE',
      'production_plans',
      p_plan_id,
      json_build_object('status', plan_record.status),
      json_build_object('status', 'iptal'),
      'Production plan cancelled: ' || p_reason
    );

    -- 4. Order durumunu kontrol et ve güncelle
    -- Eğer tüm planlar iptal edildiyse order'ı da iptal et
    IF NOT EXISTS (
      SELECT 1 FROM production_plans 
      WHERE order_id = plan_record.order_id 
        AND status NOT IN ('iptal', 'tamamlandi')
    ) THEN
      UPDATE orders
      SET 
        status = 'iptal',
        cancelled_at = NOW(),
        cancelled_by = p_user_id,
        cancel_reason = 'All production plans cancelled'
      WHERE id = plan_record.order_id;

      -- Order iptal audit log
      INSERT INTO audit_logs (
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values,
        description
      ) VALUES (
        p_user_id,
        'UPDATE',
        'orders',
        plan_record.order_id,
        json_build_object('status', plan_record.order_status),
        json_build_object('status', 'iptal'),
        'Order auto-cancelled: All plans cancelled'
      );
    END IF;

    -- Başarılı sonuç
    cancel_result := json_build_object(
      'success', true,
      'plan_id', p_plan_id,
      'order_id', plan_record.order_id,
      'reason', p_reason,
      'cancelled_at', NOW()
    );

    RETURN cancel_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Hata durumunda otomatik rollback yapılır
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql;

-- 3. Fix rollback_production_log function
CREATE OR REPLACE FUNCTION rollback_production_log(
  p_log_id UUID,
  p_reason TEXT DEFAULT 'Production log rollback',
  p_user_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  log_record RECORD;
  plan_record RECORD;
  bom_record RECORD;
  rollback_result JSON;
BEGIN
  -- Production log kaydını al
  SELECT * INTO log_record
  FROM production_logs
  WHERE id = p_log_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Production log not found');
  END IF;

  -- Production plan kaydını al
  SELECT * INTO plan_record
  FROM production_plans
  WHERE id = log_record.plan_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Production plan not found');
  END IF;

  -- BOM snapshot kaydını al
  SELECT * INTO bom_record
  FROM bom_snapshots
  WHERE plan_id = plan_record.id;

  -- Transaction başlat
  BEGIN
    -- 1. Finished product stokunu azalt
    UPDATE finished_products
    SET quantity = quantity - log_record.quantity_produced
    WHERE id = plan_record.product_id;

    -- 2. BOM'a göre hammadde/yarı mamul stoklarını geri ekle
    IF bom_record IS NOT NULL THEN
      -- Raw materials geri ekle
      UPDATE raw_materials
      SET quantity = quantity + (bom_record.raw_materials_consumed->>'quantity')::NUMERIC
      WHERE id = (bom_record.raw_materials_consumed->>'material_id')::UUID;

      -- Semi-finished products geri ekle
      UPDATE semi_finished_products
      SET quantity = quantity + (bom_record.semi_finished_consumed->>'quantity')::NUMERIC
      WHERE id = (bom_record.semi_finished_consumed->>'material_id')::UUID;
    END IF;

    -- 3. Plan produced_quantity'yi düşür
    UPDATE production_plans
    SET produced_quantity = produced_quantity - log_record.quantity_produced
    WHERE id = plan_record.id;

    -- 4. Tersine stock movement kaydet
    INSERT INTO stock_movements (
      material_type,
      material_id,
      movement_type,
      quantity,
      description,
      user_id,
      created_at
    ) VALUES (
      'finished',
      plan_record.product_id,
      'geri_alma',
      -log_record.quantity_produced,
      'Geri alma - Log ID: ' || p_log_id,
      p_user_id,
      NOW()
    );

    -- 5. Production log'u sil
    DELETE FROM production_logs WHERE id = p_log_id;

    -- 6. Audit log kaydet
    INSERT INTO audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      description
    ) VALUES (
      p_user_id,
      'DELETE',
      'production_logs',
      p_log_id,
      json_build_object(
        'plan_id', log_record.plan_id,
        'quantity_produced', log_record.quantity_produced,
        'barcode_scanned', log_record.barcode_scanned
      ),
      NULL,
      'Production log rollback: ' || p_reason
    );

    -- Başarılı sonuç
    rollback_result := json_build_object(
      'success', true,
      'log_id', p_log_id,
      'plan_id', plan_record.id,
      'quantity_rolled_back', log_record.quantity_produced,
      'reason', p_reason
    );

    RETURN rollback_result;

  EXCEPTION
    WHEN OTHERS THEN
      -- Hata durumunda otomatik rollback yapılır
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM
      );
  END;
END;
$$ LANGUAGE plpgsql;
