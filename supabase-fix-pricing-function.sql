-- Pricing System için BOM maliyet hesaplama fonksiyonunu düzelt
-- Tablo adı: bom_items → bom
-- Kolon adları: product_id → finished_product_id, quantity → quantity_needed

-- Eski fonksiyonu sil
DROP FUNCTION IF EXISTS calculate_bom_cost(UUID);

-- Yeni fonksiyonu oluştur
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
    COALESCE(SUM(b.quantity_needed * rm.unit_price), 0),
    COUNT(*),
    jsonb_agg(jsonb_build_object(
      'type', 'raw',
      'id', rm.id,
      'code', rm.code,
      'name', rm.name,
      'quantity', b.quantity_needed,
      'unit', rm.unit,
      'unit_cost', rm.unit_price,
      'total_cost', b.quantity_needed * rm.unit_price
    ))
  INTO v_raw_cost, v_item_count, v_breakdown
  FROM bom b
  JOIN raw_materials rm ON rm.id = b.material_id
  WHERE b.finished_product_id = p_product_id
    AND b.material_type = 'raw';

  -- Yarı mamul maliyetleri
  DECLARE
    v_semi_count INTEGER := 0;
    v_semi_breakdown JSONB;
  BEGIN
    SELECT 
      COALESCE(SUM(b.quantity_needed * sp.unit_cost), 0),
      COUNT(*),
      jsonb_agg(jsonb_build_object(
        'type', 'semi',
        'id', sp.id,
        'code', sp.code,
        'name', sp.name,
        'quantity', b.quantity_needed,
        'unit', sp.unit,
        'unit_cost', sp.unit_cost,
        'total_cost', b.quantity_needed * sp.unit_cost
      ))
    INTO v_semi_cost, v_semi_count, v_semi_breakdown
    FROM bom b
    JOIN semi_finished_products sp ON sp.id = b.material_id
    WHERE b.finished_product_id = p_product_id
      AND b.material_type = 'semi';

    -- Breakdown'ları birleştir
    IF v_semi_breakdown IS NOT NULL THEN
      v_breakdown := COALESCE(v_breakdown, '[]'::jsonb) || v_semi_breakdown;
      v_item_count := v_item_count + v_semi_count;
    END IF;
  END;

  v_total_cost := COALESCE(v_raw_cost, 0) + COALESCE(v_semi_cost, 0);

  RETURN QUERY SELECT 
    v_total_cost,
    COALESCE(v_raw_cost, 0),
    COALESCE(v_semi_cost, 0),
    v_item_count,
    COALESCE(v_breakdown, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_bom_cost IS 'BOM bazlı ürün maliyeti hesaplar (hem finished hem semi ürünler için)';

