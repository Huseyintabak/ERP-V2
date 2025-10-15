-- Price History System - Fiyat Geçmişi Sistemi
-- Bu dosya fiyat geçmişi tablosunu ve trigger'ları oluşturur

-- 1. Price History Tablosu
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  old_price NUMERIC(12, 2) NOT NULL,
  new_price NUMERIC(12, 2) NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Index'ler
CREATE INDEX IF NOT EXISTS idx_price_history_material ON price_history(material_type, material_id);
CREATE INDEX IF NOT EXISTS idx_price_history_date ON price_history(effective_date);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_by ON price_history(changed_by);

-- 3. Raw Materials için Fiyat Değişikliği Trigger'ı
CREATE OR REPLACE FUNCTION log_raw_material_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece unit_price değiştiğinde log oluştur
  IF OLD.unit_price IS DISTINCT FROM NEW.unit_price THEN
    INSERT INTO price_history (
      material_type,
      material_id,
      old_price,
      new_price,
      effective_date,
      changed_by,
      change_reason
    ) VALUES (
      'raw',
      NEW.id,
      COALESCE(OLD.unit_price, 0),
      COALESCE(NEW.unit_price, 0),
      NOW(),
      current_setting('app.current_user_id', true)::UUID,
      'Raw material price updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Semi-Finished Products için Fiyat Değişikliği Trigger'ı
CREATE OR REPLACE FUNCTION log_semi_finished_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece unit_cost değiştiğinde log oluştur
  IF OLD.unit_cost IS DISTINCT FROM NEW.unit_cost THEN
    INSERT INTO price_history (
      material_type,
      material_id,
      old_price,
      new_price,
      effective_date,
      changed_by,
      change_reason
    ) VALUES (
      'semi',
      NEW.id,
      COALESCE(OLD.unit_cost, 0),
      COALESCE(NEW.unit_cost, 0),
      NOW(),
      current_setting('app.current_user_id', true)::UUID,
      'Semi-finished product cost updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Finished Products için Fiyat Değişikliği Trigger'ı
CREATE OR REPLACE FUNCTION log_finished_product_price_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Sadece sale_price değiştiğinde log oluştur
  IF OLD.sale_price IS DISTINCT FROM NEW.sale_price THEN
    INSERT INTO price_history (
      material_type,
      material_id,
      old_price,
      new_price,
      effective_date,
      changed_by,
      change_reason
    ) VALUES (
      'finished',
      NEW.id,
      COALESCE(OLD.sale_price, 0),
      COALESCE(NEW.sale_price, 0),
      NOW(),
      current_setting('app.current_user_id', true)::UUID,
      'Finished product price updated'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger'ları Oluştur
DROP TRIGGER IF EXISTS trigger_raw_material_price_change ON raw_materials;
CREATE TRIGGER trigger_raw_material_price_change
  AFTER UPDATE ON raw_materials
  FOR EACH ROW EXECUTE FUNCTION log_raw_material_price_change();

DROP TRIGGER IF EXISTS trigger_semi_finished_price_change ON semi_finished_products;
CREATE TRIGGER trigger_semi_finished_price_change
  AFTER UPDATE ON semi_finished_products
  FOR EACH ROW EXECUTE FUNCTION log_semi_finished_price_change();

DROP TRIGGER IF EXISTS trigger_finished_product_price_change ON finished_products;
CREATE TRIGGER trigger_finished_product_price_change
  AFTER UPDATE ON finished_products
  FOR EACH ROW EXECUTE FUNCTION log_finished_product_price_change();

-- 7. Yıllık Ortalama Fiyat Hesaplama Fonksiyonu
CREATE OR REPLACE FUNCTION get_yearly_average_price(
  p_material_type TEXT,
  p_material_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS NUMERIC(12, 2) AS $$
DECLARE
  v_average_price NUMERIC(12, 2);
BEGIN
  SELECT AVG(new_price) INTO v_average_price
  FROM price_history
  WHERE material_type = p_material_type
    AND material_id = p_material_id
    AND EXTRACT(YEAR FROM effective_date) = p_year;
  
  RETURN COALESCE(v_average_price, 0);
END;
$$ LANGUAGE plpgsql;

-- 8. Fiyat Trend Analizi Fonksiyonu
CREATE OR REPLACE FUNCTION get_price_trend(
  p_material_type TEXT,
  p_material_id UUID,
  p_months INTEGER DEFAULT 12
)
RETURNS TABLE (
  month_year TEXT,
  average_price NUMERIC(12, 2),
  price_change NUMERIC(12, 2),
  change_percentage NUMERIC(5, 2)
) AS $$
BEGIN
  RETURN QUERY
  WITH monthly_prices AS (
    SELECT 
      TO_CHAR(effective_date, 'YYYY-MM') as month_year,
      AVG(new_price) as avg_price
    FROM price_history
    WHERE material_type = p_material_type
      AND material_id = p_material_id
      AND effective_date >= CURRENT_DATE - INTERVAL '1 month' * p_months
    GROUP BY TO_CHAR(effective_date, 'YYYY-MM')
    ORDER BY month_year
  ),
  price_changes AS (
    SELECT 
      month_year,
      avg_price,
      LAG(avg_price) OVER (ORDER BY month_year) as prev_price
    FROM monthly_prices
  )
  SELECT 
    pc.month_year,
    pc.avg_price,
    (pc.avg_price - COALESCE(pc.prev_price, pc.avg_price)) as price_change,
    CASE 
      WHEN COALESCE(pc.prev_price, pc.avg_price) = 0 THEN 0
      ELSE ROUND(((pc.avg_price - COALESCE(pc.prev_price, pc.avg_price)) / COALESCE(pc.prev_price, pc.avg_price)) * 100, 2)
    END as change_percentage
  FROM price_changes pc;
END;
$$ LANGUAGE plpgsql;

-- 9. Mevcut fiyatları price_history'ye aktar (initial data)
-- Önce tabloyu oluşturduktan sonra veri ekle
DO $$
BEGIN
  -- Raw materials için
  INSERT INTO price_history (material_type, material_id, old_price, new_price, effective_date, change_reason)
  SELECT 
    'raw',
    id,
    0,
    unit_price,
    created_at,
    'Initial price import'
  FROM raw_materials
  WHERE unit_price > 0
  ON CONFLICT DO NOTHING;

  -- Semi-finished products için
  INSERT INTO price_history (material_type, material_id, old_price, new_price, effective_date, change_reason)
  SELECT 
    'semi',
    id,
    0,
    unit_cost,
    created_at,
    'Initial price import'
  FROM semi_finished_products
  WHERE unit_cost > 0
  ON CONFLICT DO NOTHING;

  -- Finished products için
  INSERT INTO price_history (material_type, material_id, old_price, new_price, effective_date, change_reason)
  SELECT 
    'finished',
    id,
    0,
    sale_price,
    created_at,
    'Initial price import'
  FROM finished_products
  WHERE sale_price > 0
  ON CONFLICT DO NOTHING;
END $$;
