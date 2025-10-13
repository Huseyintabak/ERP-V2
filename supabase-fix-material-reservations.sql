-- ==========================================
-- MATERIAL_RESERVATIONS TABLOSUNU DÜZELT
-- ==========================================

-- 1. Material_reservations tablosunu yeniden oluştur
DROP TABLE IF EXISTS material_reservations CASCADE;

CREATE TABLE material_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  reserved_quantity NUMERIC(12, 2) NOT NULL CHECK (reserved_quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index'leri ekle
CREATE INDEX idx_reservations_order ON material_reservations(order_id);
CREATE INDEX idx_reservations_material ON material_reservations(material_type, material_id);

-- 3. Production_plan_bom_snapshot tablosunu da yeniden oluştur
DROP TABLE IF EXISTS production_plan_bom_snapshot CASCADE;

CREATE TABLE production_plan_bom_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  material_code TEXT NOT NULL,
  material_name TEXT NOT NULL,
  quantity_needed NUMERIC(12, 2) NOT NULL CHECK (quantity_needed > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Index'leri ekle
CREATE INDEX idx_bom_snapshot_plan ON production_plan_bom_snapshot(plan_id);
CREATE INDEX idx_bom_snapshot_material ON production_plan_bom_snapshot(material_type, material_id);

-- 5. Kontrol et
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('material_reservations', 'production_plan_bom_snapshot');

