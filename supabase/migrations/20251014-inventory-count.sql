-- ================================================
-- ENVANTER SAYIM SİSTEMİ
-- ================================================
-- Created: 14 Ekim 2025
-- Purpose: Fiziki envanter sayımı ve stok düzeltme
-- ================================================

-- 1️⃣ INVENTORY_COUNTS tablosu
CREATE TABLE IF NOT EXISTS inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  material_code TEXT,
  material_name TEXT,
  system_quantity NUMERIC(12, 2) NOT NULL,
  physical_quantity NUMERIC(12, 2) NOT NULL,
  difference NUMERIC(12, 2) GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,
  variance_percentage NUMERIC(5, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN system_quantity > 0 THEN ((physical_quantity - system_quantity) / system_quantity) * 100
      ELSE NULL
    END
  ) STORED,
  counted_by UUID REFERENCES users(id),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  -- Audit fields
  stock_adjusted BOOLEAN DEFAULT false,
  adjusted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_counts_material ON inventory_counts(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_status ON inventory_counts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_counted_by ON inventory_counts(counted_by);

-- Comments
COMMENT ON TABLE inventory_counts IS 'Fiziki envanter sayım kayıtları';
COMMENT ON COLUMN inventory_counts.difference IS 'Fark (Fiziki - Sistem)';
COMMENT ON COLUMN inventory_counts.variance_percentage IS 'Sapma yüzdesi';
COMMENT ON COLUMN inventory_counts.status IS 'pending: Onay bekliyor, approved: Onaylandı, rejected: Reddedildi';

-- 2️⃣ INVENTORY_COUNT_BATCHES tablosu (toplu sayımlar için)
CREATE TABLE IF NOT EXISTS inventory_count_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name TEXT NOT NULL,
  description TEXT,
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_by UUID REFERENCES users(id),
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Link counts to batches
ALTER TABLE inventory_counts ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES inventory_count_batches(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_counts_batch ON inventory_counts(batch_id);

COMMENT ON TABLE inventory_count_batches IS 'Toplu envanter sayım oturumları';

-- 3️⃣ VIEW: Aktif envanter sayımları
CREATE OR REPLACE VIEW v_pending_inventory_counts AS
SELECT 
  ic.id,
  ic.material_type,
  ic.material_id,
  ic.material_code,
  ic.material_name,
  ic.system_quantity,
  ic.physical_quantity,
  ic.difference,
  ic.variance_percentage,
  ic.notes,
  ic.created_at,
  u.name as counted_by_name,
  u.email as counted_by_email,
  b.batch_name,
  CASE 
    WHEN ABS(ic.variance_percentage) > 10 THEN 'high'
    WHEN ABS(ic.variance_percentage) > 5 THEN 'medium'
    ELSE 'low'
  END as variance_severity
FROM inventory_counts ic
LEFT JOIN users u ON u.id = ic.counted_by
LEFT JOIN inventory_count_batches b ON b.id = ic.batch_id
WHERE ic.status = 'pending'
ORDER BY ic.created_at DESC;

COMMENT ON VIEW v_pending_inventory_counts IS 'Onay bekleyen envanter sayımları';

-- 4️⃣ VIEW: Envanter sayım özeti
CREATE OR REPLACE VIEW v_inventory_count_summary AS
SELECT 
  material_type,
  status,
  COUNT(*) as count,
  SUM(ABS(difference)) as total_difference,
  AVG(ABS(variance_percentage)) as avg_variance,
  COUNT(*) FILTER (WHERE ABS(variance_percentage) > 10) as high_variance_count
FROM inventory_counts
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY material_type, status;

COMMENT ON VIEW v_inventory_count_summary IS '30 günlük envanter sayım özeti';

-- 5️⃣ FUNCTION: Envanter sayımı onaylama ve stok güncelleme
CREATE OR REPLACE FUNCTION approve_inventory_count(
  p_count_id UUID,
  p_approved_by UUID,
  p_auto_adjust BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
DECLARE
  v_count RECORD;
  v_result JSONB;
BEGIN
  -- Sayım kaydını al
  SELECT * INTO v_count
  FROM inventory_counts
  WHERE id = p_count_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Envanter sayım kaydı bulunamadı veya zaten işleme alınmış'
    );
  END IF;

  -- Sayımı onayla
  UPDATE inventory_counts
  SET 
    status = 'approved',
    approved_at = NOW(),
    approved_by = p_approved_by,
    stock_adjusted = p_auto_adjust,
    adjusted_at = CASE WHEN p_auto_adjust THEN NOW() ELSE NULL END
  WHERE id = p_count_id;

  -- Otomatik stok düzeltme
  IF p_auto_adjust AND v_count.difference != 0 THEN
    CASE v_count.material_type
      WHEN 'raw' THEN
        UPDATE raw_materials
        SET quantity = v_count.physical_quantity
        WHERE id = v_count.material_id;

        -- Stok hareketi kaydı
        INSERT INTO stock_movements (
          material_type,
          material_id,
          movement_type,
          quantity,
          unit,
          reference_type,
          reference_id,
          notes,
          created_by
        )
        SELECT 
          'raw',
          v_count.material_id,
          CASE WHEN v_count.difference > 0 THEN 'in' ELSE 'out' END,
          ABS(v_count.difference),
          rm.unit,
          'inventory_count',
          p_count_id,
          'Envanter sayımı düzeltmesi: ' || COALESCE(v_count.notes, ''),
          p_approved_by
        FROM raw_materials rm
        WHERE rm.id = v_count.material_id;

      WHEN 'semi' THEN
        UPDATE semi_finished_products
        SET quantity = v_count.physical_quantity
        WHERE id = v_count.material_id;

        INSERT INTO stock_movements (
          material_type,
          material_id,
          movement_type,
          quantity,
          unit,
          reference_type,
          reference_id,
          notes,
          created_by
        )
        SELECT 
          'semi',
          v_count.material_id,
          CASE WHEN v_count.difference > 0 THEN 'in' ELSE 'out' END,
          ABS(v_count.difference),
          sp.unit,
          'inventory_count',
          p_count_id,
          'Envanter sayımı düzeltmesi: ' || COALESCE(v_count.notes, ''),
          p_approved_by
        FROM semi_finished_products sp
        WHERE sp.id = v_count.material_id;

      WHEN 'finished' THEN
        UPDATE finished_products
        SET quantity = v_count.physical_quantity
        WHERE id = v_count.material_id;

        INSERT INTO stock_movements (
          material_type,
          material_id,
          movement_type,
          quantity,
          unit,
          reference_type,
          reference_id,
          notes,
          created_by
        )
        SELECT 
          'finished',
          v_count.material_id,
          CASE WHEN v_count.difference > 0 THEN 'in' ELSE 'out' END,
          ABS(v_count.difference),
          fp.unit,
          'inventory_count',
          p_count_id,
          'Envanter sayımı düzeltmesi: ' || COALESCE(v_count.notes, ''),
          p_approved_by
        FROM finished_products fp
        WHERE fp.id = v_count.material_id;
    END CASE;
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'count_id', p_count_id,
    'material_type', v_count.material_type,
    'difference', v_count.difference,
    'stock_adjusted', p_auto_adjust
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_inventory_count IS 'Envanter sayımını onayla ve isteğe bağlı stok güncelle';

-- 6️⃣ FUNCTION: Envanter sayımı reddetme
CREATE OR REPLACE FUNCTION reject_inventory_count(
  p_count_id UUID,
  p_rejected_by UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  UPDATE inventory_counts
  SET 
    status = 'rejected',
    approved_at = NOW(),
    approved_by = p_rejected_by,
    rejection_reason = p_reason
  WHERE id = p_count_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Envanter sayım kaydı bulunamadı veya zaten işleme alınmış'
    );
  END IF;

  v_result := jsonb_build_object(
    'success', true,
    'count_id', p_count_id,
    'status', 'rejected'
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 7️⃣ RLS Policies (disabled for now)
ALTER TABLE inventory_counts DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_batches DISABLE ROW LEVEL SECURITY;

-- ================================================
-- VERIFICATION
-- ================================================
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('inventory_counts', 'inventory_count_batches')
ORDER BY table_name;

-- ================================================
-- SAMPLE USAGE (commented out)
-- ================================================
-- Envanter sayımı oluştur
-- INSERT INTO inventory_counts (
--   material_type, material_id, material_code, material_name,
--   system_quantity, physical_quantity, counted_by, notes
-- )
-- SELECT 
--   'raw',
--   id,
--   code,
--   name,
--   quantity,
--   95.5, -- fiziki sayım
--   'user-uuid',
--   'Aylık envanter sayımı'
-- FROM raw_materials
-- WHERE id = 'material-uuid';

-- Onayla ve stok güncelle
-- SELECT approve_inventory_count('count-uuid', 'approver-uuid', true);

-- Reddet
-- SELECT reject_inventory_count('count-uuid', 'rejector-uuid', 'Yanlış sayım');

-- ================================================
-- ROLLBACK (if needed)
-- ================================================
-- DROP FUNCTION IF EXISTS approve_inventory_count CASCADE;
-- DROP FUNCTION IF EXISTS reject_inventory_count CASCADE;
-- DROP VIEW IF EXISTS v_pending_inventory_counts CASCADE;
-- DROP VIEW IF EXISTS v_inventory_count_summary CASCADE;
-- DROP TABLE IF EXISTS inventory_counts CASCADE;
-- DROP TABLE IF EXISTS inventory_count_batches CASCADE;
-- ================================================

