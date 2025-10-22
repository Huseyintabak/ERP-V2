-- Order and Production Plan Cancel System
-- Sipariş ve üretim planı iptal sistemi

-- 1. Order iptal fonksiyonu
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

-- 2. Production plan iptal fonksiyonu
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

-- 3. İptal izinleri kontrol fonksiyonu
CREATE OR REPLACE FUNCTION can_cancel_order(
  p_order_id UUID,
  p_user_id UUID,
  p_user_role TEXT
)
RETURNS JSON AS $$
DECLARE
  order_record RECORD;
  plan_count INTEGER;
  completed_plans INTEGER;
  production_plans INTEGER;
  result JSON;
BEGIN
  -- Order kaydını al
  SELECT 
    o.*,
    COUNT(pp.id) as total_plans,
    COUNT(CASE WHEN pp.status = 'tamamlandi' THEN 1 END) as completed_plans,
    COUNT(CASE WHEN pp.produced_quantity > 0 THEN 1 END) as production_plans
  INTO order_record
  FROM orders o
  LEFT JOIN production_plans pp ON o.id = pp.order_id
  WHERE o.id = p_order_id
  GROUP BY o.id, o.status, o.created_by;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', false, 'reason', 'Order not found');
  END IF;

  -- Admin ve planlama rolleri her zaman iptal edebilir
  IF p_user_role IN ('yonetici', 'planlama') THEN
    RETURN json_build_object('allowed', true, 'reason', '');
  END IF;

  -- Order sahibi kontrolü
  IF order_record.created_by != p_user_id THEN
    RETURN json_build_object('allowed', false, 'reason', 'Sadece kendi siparişlerinizi iptal edebilirsiniz');
  END IF;

  -- Order durumu kontrolü
  IF order_record.status = 'tamamlandi' THEN
    RETURN json_build_object('allowed', false, 'reason', 'Tamamlanan siparişler iptal edilemez');
  END IF;

  IF order_record.status = 'iptal' THEN
    RETURN json_build_object('allowed', false, 'reason', 'Sipariş zaten iptal edilmiş');
  END IF;

  -- Tamamlanan plan kontrolü
  IF order_record.completed_plans > 0 THEN
    RETURN json_build_object('allowed', false, 'reason', 'Tamamlanan planları olan siparişler iptal edilemez');
  END IF;

  -- Üretim başlamış kontrolü
  IF order_record.production_plans > 0 THEN
    RETURN json_build_object('allowed', false, 'reason', 'Üretim başlamış siparişler sadece yöneticiler tarafından iptal edilebilir');
  END IF;

  RETURN json_build_object('allowed', true, 'reason', '');
END;
$$ LANGUAGE plpgsql;

-- 4. Plan iptal izinleri kontrol fonksiyonu
CREATE OR REPLACE FUNCTION can_cancel_plan(
  p_plan_id UUID,
  p_user_id UUID,
  p_user_role TEXT
)
RETURNS JSON AS $$
DECLARE
  plan_record RECORD;
  order_record RECORD;
  result JSON;
BEGIN
  -- Plan ve order kaydını al
  SELECT 
    pp.*,
    o.status as order_status,
    o.created_by as order_owner
  INTO plan_record
  FROM production_plans pp
  JOIN orders o ON pp.order_id = o.id
  WHERE pp.id = p_plan_id;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', false, 'reason', 'Production plan not found');
  END IF;

  -- Admin ve planlama rolleri her zaman iptal edebilir
  IF p_user_role IN ('yonetici', 'planlama') THEN
    RETURN json_build_object('allowed', true, 'reason', '');
  END IF;

  -- Order sahibi kontrolü
  IF plan_record.order_owner != p_user_id THEN
    RETURN json_build_object('allowed', false, 'reason', 'Sadece kendi siparişlerinizin planlarını iptal edebilirsiniz');
  END IF;

  -- Plan durumu kontrolü
  IF plan_record.status = 'tamamlandi' THEN
    RETURN json_build_object('allowed', false, 'reason', 'Tamamlanan planlar iptal edilemez');
  END IF;

  IF plan_record.status = 'iptal' THEN
    RETURN json_build_object('allowed', false, 'reason', 'Plan zaten iptal edilmiş');
  END IF;

  -- Order durumu kontrolü
  IF plan_record.order_status = 'tamamlandi' THEN
    RETURN json_build_object('allowed', false, 'reason', 'Tamamlanan siparişlerin planları iptal edilemez');
  END IF;

  -- Üretim başlamış kontrolü
  IF plan_record.produced_quantity > 0 THEN
    RETURN json_build_object('allowed', false, 'reason', 'Üretim başlamış planlar sadece yöneticiler tarafından iptal edilebilir');
  END IF;

  RETURN json_build_object('allowed', true, 'reason', '');
END;
$$ LANGUAGE plpgsql;

-- 5. İptal geçmişi tablosu
CREATE TABLE IF NOT EXISTS cancellation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  plan_id UUID REFERENCES production_plans(id),
  cancelled_by UUID REFERENCES users(id),
  reason TEXT,
  cancelled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Index'ler
CREATE INDEX IF NOT EXISTS idx_cancellation_history_order_id ON cancellation_history(order_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_history_plan_id ON cancellation_history(plan_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_history_cancelled_by ON cancellation_history(cancelled_by);

-- 7. İptal istatistikleri fonksiyonu
CREATE OR REPLACE FUNCTION get_cancellation_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_cancellations', COUNT(*),
    'order_cancellations', COUNT(CASE WHEN order_id IS NOT NULL THEN 1 END),
    'plan_cancellations', COUNT(CASE WHEN plan_id IS NOT NULL THEN 1 END),
    'cancellations_by_user', (
      SELECT json_agg(
        json_build_object(
          'user_id', u.id,
          'user_name', u.name,
          'cancellation_count', COUNT(ch.id)
        )
      )
      FROM cancellation_history ch
      JOIN users u ON ch.cancelled_by = u.id
      WHERE (p_start_date IS NULL OR ch.cancelled_at >= p_start_date)
        AND (p_end_date IS NULL OR ch.cancelled_at <= p_end_date)
      GROUP BY u.id, u.name
    ),
    'recent_cancellations', (
      SELECT json_agg(
        json_build_object(
          'id', ch.id,
          'order_id', ch.order_id,
          'plan_id', ch.plan_id,
          'reason', ch.reason,
          'cancelled_by', u.name,
          'cancelled_at', ch.cancelled_at
        )
      )
      FROM cancellation_history ch
      JOIN users u ON ch.cancelled_by = u.id
      WHERE (p_start_date IS NULL OR ch.cancelled_at >= p_start_date)
        AND (p_end_date IS NULL OR ch.cancelled_at <= p_end_date)
      ORDER BY ch.cancelled_at DESC
      LIMIT 10
    )
  ) INTO result
  FROM cancellation_history ch
  WHERE (p_start_date IS NULL OR ch.cancelled_at >= p_start_date)
    AND (p_end_date IS NULL OR ch.cancelled_at <= p_end_date);

  RETURN result;
END;
$$ LANGUAGE plpgsql;
