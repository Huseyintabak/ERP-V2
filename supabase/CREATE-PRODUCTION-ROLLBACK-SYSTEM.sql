-- Production Log Rollback System
-- Hatalı üretim kaydı geri alma sistemi

-- 1. Rollback fonksiyonu
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

-- 2. Rollback izinleri kontrol fonksiyonu
CREATE OR REPLACE FUNCTION can_rollback_production_log(
  p_log_id UUID,
  p_user_id UUID,
  p_user_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  log_record RECORD;
  time_diff_minutes INTEGER;
BEGIN
  -- Production log kaydını al
  SELECT 
    pl.*,
    pp.status as plan_status
  INTO log_record
  FROM production_logs pl
  JOIN production_plans pp ON pl.plan_id = pp.id
  WHERE pl.id = p_log_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Admin ve planlama rolleri her zaman rollback yapabilir
  IF p_user_role IN ('yonetici', 'planlama') THEN
    RETURN TRUE;
  END IF;

  -- Operatörler sadece kendi kayıtlarını ve son 5 dakika içindeki kayıtları geri alabilir
  IF p_user_role = 'operator' THEN
    -- Kendi kaydı mı kontrol et
    IF log_record.operator_id != p_user_id THEN
      RETURN FALSE;
    END IF;

    -- Zaman kontrolü (5 dakika)
    time_diff_minutes := EXTRACT(EPOCH FROM (NOW() - log_record.created_at)) / 60;
    IF time_diff_minutes > 5 THEN
      RETURN FALSE;
    END IF;

    -- Plan durumu kontrolü
    IF log_record.plan_status = 'tamamlandi' THEN
      RETURN FALSE;
    END IF;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 3. Production log rollback geçmişi tablosu
CREATE TABLE IF NOT EXISTS production_log_rollbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  quantity_rolled_back INTEGER NOT NULL,
  reason TEXT,
  rolled_back_by UUID REFERENCES users(id),
  rolled_back_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index'ler
CREATE INDEX IF NOT EXISTS idx_production_log_rollbacks_log_id ON production_log_rollbacks(log_id);
CREATE INDEX IF NOT EXISTS idx_production_log_rollbacks_plan_id ON production_log_rollbacks(plan_id);
CREATE INDEX IF NOT EXISTS idx_production_log_rollbacks_rolled_back_by ON production_log_rollbacks(rolled_back_by);

-- 5. Rollback geçmişi trigger'ı
CREATE OR REPLACE FUNCTION log_rollback_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Production log silindiğinde rollback geçmişine kaydet
  IF TG_OP = 'DELETE' THEN
    INSERT INTO production_log_rollbacks (
      log_id,
      plan_id,
      quantity_rolled_back,
      reason,
      rolled_back_by
    ) VALUES (
      OLD.id,
      OLD.plan_id,
      OLD.quantity_produced,
      'Production log rollback',
      current_setting('app.current_user_id', true)::UUID
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger'ı oluştur
DROP TRIGGER IF EXISTS trg_log_rollback_history ON production_logs;
CREATE TRIGGER trg_log_rollback_history
  AFTER DELETE ON production_logs
  FOR EACH ROW
  EXECUTE FUNCTION log_rollback_history();

-- 7. Rollback istatistikleri fonksiyonu
CREATE OR REPLACE FUNCTION get_rollback_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_rollbacks', COUNT(*),
    'total_quantity_rolled_back', COALESCE(SUM(quantity_rolled_back), 0),
    'rollbacks_by_user', (
      SELECT json_agg(
        json_build_object(
          'user_id', u.id,
          'user_name', u.name,
          'rollback_count', COUNT(plr.id),
          'total_quantity', COALESCE(SUM(plr.quantity_rolled_back), 0)
        )
      )
      FROM production_log_rollbacks plr
      JOIN users u ON plr.rolled_back_by = u.id
      WHERE (p_start_date IS NULL OR plr.rolled_back_at >= p_start_date)
        AND (p_end_date IS NULL OR plr.rolled_back_at <= p_end_date)
      GROUP BY u.id, u.name
    ),
    'recent_rollbacks', (
      SELECT json_agg(
        json_build_object(
          'id', plr.id,
          'log_id', plr.log_id,
          'plan_id', plr.plan_id,
          'quantity_rolled_back', plr.quantity_rolled_back,
          'reason', plr.reason,
          'rolled_back_by', u.name,
          'rolled_back_at', plr.rolled_back_at
        )
      )
      FROM production_log_rollbacks plr
      JOIN users u ON plr.rolled_back_by = u.id
      WHERE (p_start_date IS NULL OR plr.rolled_back_at >= p_start_date)
        AND (p_end_date IS NULL OR plr.rolled_back_at <= p_end_date)
      ORDER BY plr.rolled_back_at DESC
      LIMIT 10
    )
  ) INTO result
  FROM production_log_rollbacks plr
  WHERE (p_start_date IS NULL OR plr.rolled_back_at >= p_start_date)
    AND (p_end_date IS NULL OR plr.rolled_back_at <= p_end_date);

  RETURN result;
END;
$$ LANGUAGE plpgsql;
