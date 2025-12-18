-- Price History Functions Fix
-- Bu dosya sadece eksik function'ları ekler

-- 1. Yıllık Ortalama Fiyat Hesaplama Fonksiyonu
CREATE OR REPLACE FUNCTION get_yearly_average_price(
  p_material_type TEXT,
  p_material_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
)
RETURNS NUMERIC(12, 2) AS $$
DECLARE
  v_average_price NUMERIC(12, 2);
BEGIN
  SELECT AVG(price) INTO v_average_price
  FROM price_history
  WHERE material_type = p_material_type
    AND material_id = p_material_id
    AND EXTRACT(YEAR FROM effective_date) = p_year;
  
  RETURN COALESCE(v_average_price, 0);
END;
$$ LANGUAGE plpgsql;

-- 2. Fiyat Trend Analizi Fonksiyonu
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
      AVG(price) as avg_price
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

