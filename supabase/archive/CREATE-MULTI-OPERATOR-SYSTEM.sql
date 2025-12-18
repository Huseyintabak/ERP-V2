-- Multi-Operator Production System
-- Çoklu operatör üretim sistemi

-- 1. Production plan operators tablosu
CREATE TABLE IF NOT EXISTS production_plan_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'active', 'paused', 'completed')),
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  started_by UUID REFERENCES users(id),
  paused_at TIMESTAMPTZ,
  paused_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index'ler
CREATE INDEX IF NOT EXISTS idx_production_plan_operators_plan_id ON production_plan_operators(plan_id);
CREATE INDEX IF NOT EXISTS idx_production_plan_operators_operator_id ON production_plan_operators(operator_id);
CREATE INDEX IF NOT EXISTS idx_production_plan_operators_status ON production_plan_operators(status);
CREATE INDEX IF NOT EXISTS idx_production_plan_operators_assigned_by ON production_plan_operators(assigned_by);

-- 3. Unique constraint - bir operatör aynı anda sadece bir görevde olabilir
CREATE UNIQUE INDEX IF NOT EXISTS idx_production_plan_operators_unique_active 
ON production_plan_operators(operator_id) 
WHERE status IN ('assigned', 'active', 'paused');

-- 4. Production plans tablosuna max_operators kolonu ekle
ALTER TABLE production_plans 
ADD COLUMN IF NOT EXISTS max_operators INTEGER DEFAULT 1 CHECK (max_operators > 0);

-- 5. Multi-operator production log tablosu
CREATE TABLE IF NOT EXISTS multi_operator_production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('start', 'pause', 'resume', 'complete', 'log_production')),
  quantity_produced INTEGER DEFAULT 0,
  barcode_scanned TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Index'ler
CREATE INDEX IF NOT EXISTS idx_multi_operator_logs_plan_id ON multi_operator_production_logs(plan_id);
CREATE INDEX IF NOT EXISTS idx_multi_operator_logs_operator_id ON multi_operator_production_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_multi_operator_logs_action ON multi_operator_production_logs(action);
CREATE INDEX IF NOT EXISTS idx_multi_operator_logs_created_at ON multi_operator_production_logs(created_at);

-- 7. Operatör durumu güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_operator_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Operatörün aktif görev sayısını güncelle
  UPDATE operators
  SET active_productions_count = (
    SELECT COUNT(*)
    FROM production_plan_operators
    WHERE operator_id = NEW.operator_id
      AND status IN ('assigned', 'active', 'paused')
  )
  WHERE id = NEW.operator_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger'lar
DROP TRIGGER IF EXISTS trg_update_operator_status_insert ON production_plan_operators;
CREATE TRIGGER trg_update_operator_status_insert
  AFTER INSERT ON production_plan_operators
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_status();

DROP TRIGGER IF EXISTS trg_update_operator_status_update ON production_plan_operators;
CREATE TRIGGER trg_update_operator_status_update
  AFTER UPDATE ON production_plan_operators
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_status();

DROP TRIGGER IF EXISTS trg_update_operator_status_delete ON production_plan_operators;
CREATE TRIGGER trg_update_operator_status_delete
  AFTER DELETE ON production_plan_operators
  FOR EACH ROW
  EXECUTE FUNCTION update_operator_status();

-- 9. Çoklu operatör üretim log fonksiyonu
CREATE OR REPLACE FUNCTION log_multi_operator_production(
  p_plan_id UUID,
  p_operator_id UUID,
  p_action TEXT,
  p_quantity_produced INTEGER DEFAULT 0,
  p_barcode_scanned TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  log_id UUID;
  plan_record RECORD;
  operator_record RECORD;
  result JSON;
BEGIN
  -- Plan bilgilerini al
  SELECT * INTO plan_record
  FROM production_plans
  WHERE id = p_plan_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Production plan not found');
  END IF;

  -- Operatör bilgilerini al
  SELECT * INTO operator_record
  FROM operators
  WHERE id = p_operator_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Operator not found');
  END IF;

  -- Log kaydı oluştur
  INSERT INTO multi_operator_production_logs (
    plan_id,
    operator_id,
    action,
    quantity_produced,
    barcode_scanned,
    notes,
    created_by
  ) VALUES (
    p_plan_id,
    p_operator_id,
    p_action,
    p_quantity_produced,
    p_barcode_scanned,
    p_notes,
    p_created_by
  ) RETURNING id INTO log_id;

  -- Eğer üretim log'u ise, plan'ın produced_quantity'sini güncelle
  IF p_action = 'log_production' AND p_quantity_produced > 0 THEN
    UPDATE production_plans
    SET produced_quantity = produced_quantity + p_quantity_produced
    WHERE id = p_plan_id;

    -- Hedef tamamlandı mı kontrol et
    IF plan_record.produced_quantity + p_quantity_produced >= plan_record.target_quantity THEN
      UPDATE production_plans
      SET status = 'tamamlandi',
          completed_at = NOW()
      WHERE id = p_plan_id;

      -- Tüm operatörleri tamamlandı olarak işaretle
      UPDATE production_plan_operators
      SET status = 'completed',
          completed_at = NOW()
      WHERE plan_id = p_plan_id
        AND status IN ('assigned', 'active', 'paused');
    END IF;
  END IF;

  result := json_build_object(
    'success', true,
    'log_id', log_id,
    'plan_id', p_plan_id,
    'operator_id', p_operator_id,
    'action', p_action,
    'quantity_produced', p_quantity_produced
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 10. Operatör performans analizi fonksiyonu
CREATE OR REPLACE FUNCTION get_operator_performance(
  p_operator_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_date TIMESTAMPTZ;
  end_date TIMESTAMPTZ;
BEGIN
  -- Tarih aralığını belirle
  start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  end_date := COALESCE(p_end_date, NOW());

  SELECT json_build_object(
    'operator_id', p_operator_id,
    'period', json_build_object(
      'start_date', start_date,
      'end_date', end_date
    ),
    'total_tasks', (
      SELECT COUNT(*)
      FROM production_plan_operators
      WHERE operator_id = p_operator_id
        AND assigned_at >= start_date
        AND assigned_at <= end_date
    ),
    'completed_tasks', (
      SELECT COUNT(*)
      FROM production_plan_operators
      WHERE operator_id = p_operator_id
        AND status = 'completed'
        AND completed_at >= start_date
        AND completed_at <= end_date
    ),
    'total_production', (
      SELECT COALESCE(SUM(quantity_produced), 0)
      FROM multi_operator_production_logs
      WHERE operator_id = p_operator_id
        AND action = 'log_production'
        AND created_at >= start_date
        AND created_at <= end_date
    ),
    'average_efficiency', (
      SELECT COALESCE(AVG(
        CASE 
          WHEN pp.target_quantity > 0 THEN 
            (pp.produced_quantity::FLOAT / pp.target_quantity::FLOAT) * 100
          ELSE 0
        END
      ), 0)
      FROM production_plan_operators ppo
      JOIN production_plans pp ON ppo.plan_id = pp.id
      WHERE ppo.operator_id = p_operator_id
        AND ppo.status = 'completed'
        AND ppo.completed_at >= start_date
        AND ppo.completed_at <= end_date
    ),
    'active_tasks', (
      SELECT COUNT(*)
      FROM production_plan_operators
      WHERE operator_id = p_operator_id
        AND status IN ('assigned', 'active', 'paused')
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 11. Çoklu operatör istatistikleri fonksiyonu
CREATE OR REPLACE FUNCTION get_multi_operator_statistics(
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_date TIMESTAMPTZ;
  end_date TIMESTAMPTZ;
BEGIN
  -- Tarih aralığını belirle
  start_date := COALESCE(p_start_date, NOW() - INTERVAL '30 days');
  end_date := COALESCE(p_end_date, NOW());

  SELECT json_build_object(
    'period', json_build_object(
      'start_date', start_date,
      'end_date', end_date
    ),
    'total_operators', (
      SELECT COUNT(*)
      FROM operators
      WHERE is_active = true
    ),
    'active_operators', (
      SELECT COUNT(DISTINCT operator_id)
      FROM production_plan_operators
      WHERE status IN ('assigned', 'active', 'paused')
        AND assigned_at >= start_date
    ),
    'total_tasks', (
      SELECT COUNT(*)
      FROM production_plans
      WHERE created_at >= start_date
        AND created_at <= end_date
    ),
    'multi_operator_tasks', (
      SELECT COUNT(*)
      FROM production_plans
      WHERE max_operators > 1
        AND created_at >= start_date
        AND created_at <= end_date
    ),
    'total_production', (
      SELECT COALESCE(SUM(quantity_produced), 0)
      FROM multi_operator_production_logs
      WHERE action = 'log_production'
        AND created_at >= start_date
        AND created_at <= end_date
    ),
    'average_operators_per_task', (
      SELECT COALESCE(AVG(operator_count), 0)
      FROM (
        SELECT plan_id, COUNT(*) as operator_count
        FROM production_plan_operators
        WHERE assigned_at >= start_date
          AND assigned_at <= end_date
        GROUP BY plan_id
      ) task_operators
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
