-- BOM Snapshot Trigger Fix
-- Bu trigger production plan oluşturulduğunda BOM snapshot'ı otomatik oluşturur

-- 1. BOM Snapshot oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION create_bom_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
  v_material_code TEXT;
  v_material_name TEXT;
BEGIN
  -- Sadece yeni plan oluşturulduğunda çalış
  IF TG_OP = 'INSERT' THEN
    -- BOM kayıtlarını al
    FOR v_bom_record IN 
      SELECT 
        b.material_type,
        b.material_id,
        b.quantity_needed,
        CASE 
          WHEN b.material_type = 'raw' THEN rm.code
          WHEN b.material_type = 'semi' THEN sm.code
        END as material_code,
        CASE 
          WHEN b.material_type = 'raw' THEN rm.name
          WHEN b.material_type = 'semi' THEN sm.name
        END as material_name
      FROM bom b
      LEFT JOIN raw_materials rm ON b.material_type = 'raw' AND b.material_id = rm.id
      LEFT JOIN semi_finished_products sm ON b.material_type = 'semi' AND b.material_id = sm.id
      WHERE b.finished_product_id = NEW.product_id
    LOOP
      -- BOM snapshot kaydı oluştur
      INSERT INTO production_plan_bom_snapshot (
        plan_id,
        material_type,
        material_id,
        material_code,
        material_name,
        quantity_needed
      ) VALUES (
        NEW.id,
        v_bom_record.material_type,
        v_bom_record.material_id,
        v_bom_record.material_code,
        v_bom_record.material_name,
        v_bom_record.quantity_needed
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_create_bom_snapshot ON production_plans;
CREATE TRIGGER trigger_create_bom_snapshot
  AFTER INSERT ON production_plans
  FOR EACH ROW
  EXECUTE FUNCTION create_bom_snapshot();

-- 3. Mevcut production plan'lar için BOM snapshot oluştur
INSERT INTO production_plan_bom_snapshot (
  plan_id,
  material_type,
  material_id,
  material_code,
  material_name,
  quantity_needed
)
SELECT 
  pp.id as plan_id,
  b.material_type,
  b.material_id,
  CASE 
    WHEN b.material_type = 'raw' THEN rm.code
    WHEN b.material_type = 'semi' THEN sm.code
  END as material_code,
  CASE 
    WHEN b.material_type = 'raw' THEN rm.name
    WHEN b.material_type = 'semi' THEN sm.name
  END as material_name,
  b.quantity_needed
FROM production_plans pp
JOIN bom b ON b.finished_product_id = pp.product_id
LEFT JOIN raw_materials rm ON b.material_type = 'raw' AND b.material_id = rm.id
LEFT JOIN semi_finished_products sm ON b.material_type = 'semi' AND b.material_id = sm.id
WHERE NOT EXISTS (
  SELECT 1 FROM production_plan_bom_snapshot pbs 
  WHERE pbs.plan_id = pp.id
);
