-- ================================================
-- FİYATLANDIRMA & MALİYET SİSTEMİ
-- ================================================
-- Created: 14 Ekim 2025
-- Purpose: BOM maliyet hesaplama, kar marjı takibi, müşteri özel fiyatlandırma
-- ================================================

-- 1️⃣ FINISHED_PRODUCTS tablosuna maliyet kolonları ekle
ALTER TABLE finished_products 
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5, 2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ;

-- cost_price otomatik hesaplama için comment
COMMENT ON COLUMN finished_products.cost_price IS 'BOM bazlı hesaplanan toplam maliyet';
COMMENT ON COLUMN finished_products.profit_margin IS 'Kar marjı yüzdesi (default: 20%)';
COMMENT ON COLUMN finished_products.last_price_update IS 'Son fiyat güncellenme zamanı';

-- 2️⃣ CUSTOMER_PRICING tablosu - Müşteri özel fiyatlandırma
CREATE TABLE IF NOT EXISTS customer_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE CASCADE,
  special_price NUMERIC(12, 2) NOT NULL,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  CONSTRAINT customer_pricing_unique UNIQUE(customer_id, product_id, valid_from)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_pricing_customer ON customer_pricing(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_product ON customer_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_pricing_active ON customer_pricing(is_active, valid_from, valid_until);

COMMENT ON TABLE customer_pricing IS 'Müşteri bazlı özel fiyatlandırma';

-- 3️⃣ PRICE_HISTORY tablosu - Fiyat değişiklik geçmişi
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE CASCADE,
  old_price NUMERIC(12, 2),
  new_price NUMERIC(12, 2) NOT NULL,
  old_cost NUMERIC(12, 2),
  new_cost NUMERIC(12, 2),
  old_margin NUMERIC(5, 2),
  new_margin NUMERIC(5, 2),
  change_reason TEXT,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, changed_at DESC);

COMMENT ON TABLE price_history IS 'Ürün fiyat değişiklik geçmişi';

-- 4️⃣ BOM_COST_BREAKDOWN tablosu - Detaylı maliyet analizi
CREATE TABLE IF NOT EXISTS bom_cost_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  material_code TEXT,
  material_name TEXT,
  quantity NUMERIC(12, 4) NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL,
  total_cost NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  is_current BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_bom_cost_product ON bom_cost_breakdown(product_id, is_current);

COMMENT ON TABLE bom_cost_breakdown IS 'BOM bazlı maliyet detay analizi';

-- 5️⃣ FUNCTION: BOM Maliyet Hesaplama
CREATE OR REPLACE FUNCTION calculate_bom_cost(p_product_id UUID)
RETURNS TABLE (
  total_cost NUMERIC,
  raw_material_cost NUMERIC,
  semi_finished_cost NUMERIC,
  item_count INTEGER,
  breakdown JSONB
) AS $$
DECLARE
  v_total_cost NUMERIC := 0;
  v_raw_cost NUMERIC := 0;
  v_semi_cost NUMERIC := 0;
  v_item_count INTEGER := 0;
  v_breakdown JSONB := '[]'::jsonb;
BEGIN
  -- Hammadde maliyetleri
  SELECT 
    COALESCE(SUM(bi.quantity * rm.unit_price), 0),
    COUNT(*),
    jsonb_agg(jsonb_build_object(
      'type', 'raw',
      'id', rm.id,
      'code', rm.code,
      'name', rm.name,
      'quantity', bi.quantity,
      'unit', bi.unit,
      'unit_cost', rm.unit_price,
      'total_cost', bi.quantity * rm.unit_price
    ))
  INTO v_raw_cost, v_item_count, v_breakdown
  FROM bom_items bi
  JOIN raw_materials rm ON rm.id = bi.material_id::uuid
  WHERE bi.product_id = p_product_id
    AND bi.material_type = 'raw';

  -- Yarı mamul maliyetleri
  SELECT 
    COALESCE(SUM(bi.quantity * sp.unit_cost), 0),
    COUNT(*),
    COALESCE(v_breakdown, '[]'::jsonb) || jsonb_agg(jsonb_build_object(
      'type', 'semi',
      'id', sp.id,
      'code', sp.code,
      'name', sp.name,
      'quantity', bi.quantity,
      'unit', bi.unit,
      'unit_cost', sp.unit_cost,
      'total_cost', bi.quantity * sp.unit_cost
    ))
  INTO v_semi_cost, v_item_count, v_breakdown
  FROM bom_items bi
  JOIN semi_finished_products sp ON sp.id = bi.material_id::uuid
  WHERE bi.product_id = p_product_id
    AND bi.material_type = 'semi';

  v_total_cost := COALESCE(v_raw_cost, 0) + COALESCE(v_semi_cost, 0);

  RETURN QUERY SELECT 
    v_total_cost,
    COALESCE(v_raw_cost, 0),
    COALESCE(v_semi_cost, 0),
    v_item_count,
    COALESCE(v_breakdown, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_bom_cost IS 'BOM bazlı ürün maliyeti hesaplar';

-- 6️⃣ TRIGGER: Otomatik fiyat geçmişi kaydı
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece fiyat/maliyet değiştiyse kaydet
  IF (OLD.sale_price IS DISTINCT FROM NEW.sale_price) OR
     (OLD.cost_price IS DISTINCT FROM NEW.cost_price) OR
     (OLD.profit_margin IS DISTINCT FROM NEW.profit_margin) THEN
    
    INSERT INTO price_history (
      product_id,
      old_price,
      new_price,
      old_cost,
      new_cost,
      old_margin,
      new_margin,
      change_reason,
      changed_by
    )
    VALUES (
      NEW.id,
      OLD.sale_price,
      NEW.sale_price,
      OLD.cost_price,
      NEW.cost_price,
      OLD.profit_margin,
      NEW.profit_margin,
      'Auto-logged price change',
      NULL -- API'den gelirse user_id eklenecek
    );
    
    -- last_price_update güncelle
    NEW.last_price_update := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_price_change ON finished_products;
CREATE TRIGGER trigger_log_price_change
  BEFORE UPDATE ON finished_products
  FOR EACH ROW
  EXECUTE FUNCTION log_price_change();

-- 7️⃣ VIEW: Aktif müşteri fiyatları
CREATE OR REPLACE VIEW v_active_customer_pricing AS
SELECT 
  cp.id,
  cp.customer_id,
  c.name as customer_name,
  cp.product_id,
  fp.code as product_code,
  fp.name as product_name,
  fp.sale_price as standard_price,
  cp.special_price,
  cp.special_price - fp.sale_price as price_difference,
  ROUND(((cp.special_price - fp.sale_price) / fp.sale_price) * 100, 2) as discount_percentage,
  cp.valid_from,
  cp.valid_until,
  cp.notes
FROM customer_pricing cp
JOIN customers c ON c.id = cp.customer_id
JOIN finished_products fp ON fp.id = cp.product_id
WHERE cp.is_active = true
  AND cp.valid_from <= CURRENT_DATE
  AND (cp.valid_until IS NULL OR cp.valid_until >= CURRENT_DATE);

COMMENT ON VIEW v_active_customer_pricing IS 'Aktif müşteri özel fiyatları';

-- 8️⃣ VIEW: Ürün karlılık analizi
CREATE OR REPLACE VIEW v_product_profitability AS
SELECT 
  fp.id,
  fp.code,
  fp.name,
  fp.cost_price,
  fp.sale_price,
  fp.profit_margin,
  fp.sale_price - fp.cost_price as profit_amount,
  CASE 
    WHEN fp.cost_price > 0 THEN 
      ROUND(((fp.sale_price - fp.cost_price) / fp.cost_price) * 100, 2)
    ELSE NULL
  END as actual_margin_percentage,
  CASE
    WHEN fp.sale_price - fp.cost_price < 0 THEN 'loss'
    WHEN fp.sale_price - fp.cost_price = 0 THEN 'break_even'
    WHEN ((fp.sale_price - fp.cost_price) / fp.cost_price) * 100 < 10 THEN 'low_margin'
    WHEN ((fp.sale_price - fp.cost_price) / fp.cost_price) * 100 < 25 THEN 'medium_margin'
    ELSE 'high_margin'
  END as profitability_status,
  fp.quantity as stock_quantity,
  (fp.sale_price - fp.cost_price) * fp.quantity as total_potential_profit,
  fp.last_price_update
FROM finished_products fp
WHERE fp.cost_price IS NOT NULL AND fp.cost_price > 0;

COMMENT ON VIEW v_product_profitability IS 'Ürün karlılık analizi';

-- 9️⃣ RLS Policies (disabled for now, can enable later)
ALTER TABLE customer_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_cost_breakdown DISABLE ROW LEVEL SECURITY;

-- 🔟 Sample Data (Optional - for testing)
-- Müşteri özel fiyat örneği (commented out)
-- INSERT INTO customer_pricing (customer_id, product_id, special_price, notes)
-- SELECT 
--   (SELECT id FROM customers LIMIT 1),
--   (SELECT id FROM finished_products LIMIT 1),
--   1500.00,
--   'Launch promotion - 10% discount';

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Yeni kolonları kontrol et
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'finished_products'
  AND column_name IN ('cost_price', 'profit_margin', 'last_price_update');

-- Yeni tabloları kontrol et
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('customer_pricing', 'price_history', 'bom_cost_breakdown')
ORDER BY table_name;

-- Function'ı test et (örnek)
-- SELECT * FROM calculate_bom_cost('product-uuid-here');

-- ================================================
-- ROLLBACK (if needed)
-- ================================================
-- ALTER TABLE finished_products DROP COLUMN IF EXISTS cost_price;
-- ALTER TABLE finished_products DROP COLUMN IF EXISTS profit_margin;
-- ALTER TABLE finished_products DROP COLUMN IF EXISTS last_price_update;
-- DROP TABLE IF EXISTS customer_pricing CASCADE;
-- DROP TABLE IF EXISTS price_history CASCADE;
-- DROP TABLE IF EXISTS bom_cost_breakdown CASCADE;
-- DROP FUNCTION IF EXISTS calculate_bom_cost CASCADE;
-- DROP FUNCTION IF EXISTS log_price_change CASCADE;
-- DROP VIEW IF EXISTS v_active_customer_pricing CASCADE;
-- DROP VIEW IF EXISTS v_product_profitability CASCADE;
-- ================================================

