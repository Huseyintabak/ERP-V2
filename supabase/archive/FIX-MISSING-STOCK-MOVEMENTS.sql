-- ============================================
-- EKSİK STOK HAREKETLERİNİ DÜZELTME SCRIPT'İ
-- ============================================
-- Bu script, üretim planı için eksik stok hareketlerini
-- retroaktif olarak oluşturur

-- Plan ID'sini buraya yazın
DO $$
DECLARE
  v_plan_id UUID := '621a05fa-fd4e-4ece-9794-950b297f50eb';
  v_plan RECORD;
  v_production_log RECORD;
  v_bom_record RECORD;
  v_product_id UUID;
  v_consumption_qty NUMERIC;
  v_before_qty NUMERIC;
  v_after_qty NUMERIC;
  v_product_name TEXT;
  v_planned_qty NUMERIC;
  v_stock_movement_count INTEGER;
BEGIN
  -- 1. Plan bilgilerini al
  SELECT * INTO v_plan
  FROM production_plans
  WHERE id = v_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan bulunamadı: %', v_plan_id;
  END IF;

  RAISE NOTICE 'Plan bulundu: % (Planlanan: %, Üretilen: %)', 
    v_plan.id, v_plan.planned_quantity, v_plan.produced_quantity;

  -- 2. Product bilgilerini al
  SELECT id, name INTO v_product_id, v_product_name
  FROM finished_products
  WHERE id = v_plan.product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ürün bulunamadı: %', v_plan.product_id;
  END IF;

  v_planned_qty := v_plan.planned_quantity;
  RAISE NOTICE 'Ürün: % (%)', v_product_name, v_product_id;

  -- 3. BOM Snapshot kontrolü
  SELECT COUNT(*) INTO v_stock_movement_count
  FROM production_plan_bom_snapshot
  WHERE plan_id = v_plan_id;

  IF v_stock_movement_count = 0 THEN
    RAISE NOTICE '⚠️ BOM Snapshot bulunamadı! Oluşturuluyor...';
    
    -- BOM Snapshot oluştur
    INSERT INTO production_plan_bom_snapshot (
      plan_id,
      material_type,
      material_id,
      material_code,
      material_name,
      quantity_needed
    )
    SELECT 
      v_plan_id,
      bom.material_type,
      bom.material_id,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.code
        ELSE sfp.code
      END as material_code,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.name
        ELSE sfp.name
      END as material_name,
      bom.quantity_needed * v_planned_qty as quantity_needed
    FROM bom
    LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
    LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
    WHERE bom.finished_product_id = v_plan.product_id;

    RAISE NOTICE '✅ BOM Snapshot oluşturuldu';
  ELSE
    RAISE NOTICE '✅ BOM Snapshot mevcut (% adet malzeme)', v_stock_movement_count;
  END IF;

  -- 4. Production logs'ları kontrol et ve eksik stok hareketlerini oluştur
  FOR v_production_log IN
    SELECT * FROM production_logs WHERE plan_id = v_plan_id
    ORDER BY timestamp ASC
  LOOP
    RAISE NOTICE '📝 Production log işleniyor: % (% adet üretildi)', 
      v_production_log.id, v_production_log.quantity_produced;

    -- 4.1. Nihai ürün stok hareketi kontrolü ve oluşturma
    SELECT COUNT(*) INTO v_stock_movement_count
    FROM stock_movements
    WHERE material_type = 'finished'
      AND material_id = v_product_id
      AND movement_type = 'uretim'
      AND description LIKE '%Plan #' || v_plan_id || '%'
      AND created_at BETWEEN v_production_log.timestamp - INTERVAL '1 minute' 
                         AND v_production_log.timestamp + INTERVAL '1 minute';

    IF v_stock_movement_count = 0 THEN
      RAISE NOTICE '  ⚠️ Nihai ürün stok hareketi eksik! Oluşturuluyor...';
      
      -- Mevcut stoku al (bu production log'dan önceki toplam üretimi hesapla)
      SELECT COALESCE(SUM(quantity_produced), 0) INTO v_before_qty
      FROM production_logs
      WHERE plan_id = v_plan_id
        AND timestamp < v_production_log.timestamp;

      v_after_qty := v_before_qty + v_production_log.quantity_produced;

      -- Stok hareketi oluştur
      INSERT INTO stock_movements (
        material_type,
        material_id,
        movement_type,
        quantity,
        before_quantity,
        after_quantity,
        user_id,
        description,
        created_at
      ) VALUES (
        'finished',
        v_product_id,
        'uretim',
        v_production_log.quantity_produced,
        v_before_qty,
        v_after_qty,
        v_production_log.operator_id,
        'Üretim kaydı: Plan #' || v_plan_id || ' (Retroaktif düzeltme)',
        v_production_log.timestamp
      );

      RAISE NOTICE '  ✅ Nihai ürün stok hareketi oluşturuldu';
    ELSE
      RAISE NOTICE '  ✅ Nihai ürün stok hareketi mevcut';
    END IF;

    -- 4.2. BOM'dan malzeme tüketim stok hareketleri kontrolü ve oluşturma
    FOR v_bom_record IN
      SELECT * FROM production_plan_bom_snapshot
      WHERE plan_id = v_plan_id
    LOOP
      -- Tüketim miktarını hesapla
      v_consumption_qty := (v_bom_record.quantity_needed / v_planned_qty) * v_production_log.quantity_produced;

      -- Bu malzeme için bu production log'a ait stok hareketi var mı kontrol et
      SELECT COUNT(*) INTO v_stock_movement_count
      FROM stock_movements
      WHERE material_type = v_bom_record.material_type
        AND material_id = v_bom_record.material_id
        AND movement_type = 'uretim'
        AND description LIKE '%Plan #' || v_plan_id || '%'
        AND description LIKE '%' || v_production_log.quantity_produced || ' adet%'
        AND created_at BETWEEN v_production_log.timestamp - INTERVAL '1 minute' 
                           AND v_production_log.timestamp + INTERVAL '1 minute';

      IF v_stock_movement_count = 0 THEN
        RAISE NOTICE '  ⚠️ Malzeme tüketim stok hareketi eksik: % (%)', 
          v_bom_record.material_name, v_bom_record.material_type;

        -- Bu production log'dan önceki tüketimi hesapla
        SELECT COALESCE(SUM(
          CASE 
            WHEN sm.movement_type = 'uretim' THEN -sm.quantity
            ELSE 0
          END
        ), 0) INTO v_before_qty
        FROM stock_movements sm
        WHERE sm.material_type = v_bom_record.material_type
          AND sm.material_id = v_bom_record.material_id
          AND sm.created_at < v_production_log.timestamp;

        -- Mevcut stoku al
        IF v_bom_record.material_type = 'raw' THEN
          SELECT quantity INTO v_before_qty
          FROM raw_materials
          WHERE id = v_bom_record.material_id;
        ELSIF v_bom_record.material_type = 'semi' THEN
          SELECT quantity INTO v_before_qty
          FROM semi_finished_products
          WHERE id = v_bom_record.material_id;
        END IF;

        -- Tüketim öncesi stok = mevcut stok + bu log'dan sonraki tüm tüketimler
        SELECT COALESCE(SUM(
          CASE 
            WHEN sm.movement_type = 'uretim' AND sm.quantity < 0 THEN ABS(sm.quantity)
            WHEN sm.movement_type = 'cikis' THEN sm.quantity
            ELSE 0
          END
        ), 0) INTO v_after_qty
        FROM stock_movements sm
        WHERE sm.material_type = v_bom_record.material_type
          AND sm.material_id = v_bom_record.material_id
          AND sm.created_at > v_production_log.timestamp;

        v_before_qty := v_before_qty + v_after_qty; -- Tüketim öncesi stok
        v_after_qty := v_before_qty - v_consumption_qty; -- Tüketim sonrası stok

        -- Stok hareketi oluştur
        INSERT INTO stock_movements (
          material_type,
          material_id,
          movement_type,
          quantity,
          before_quantity,
          after_quantity,
          user_id,
          description,
          created_at
        ) VALUES (
          v_bom_record.material_type,
          v_bom_record.material_id,
          'uretim',
          -v_consumption_qty, -- Negatif çünkü tüketim
          v_before_qty,
          v_after_qty,
          v_production_log.operator_id,
          format('Üretim tüketimi: %s adet %s için (Retroaktif düzeltme)', 
            v_production_log.quantity_produced, v_product_name),
          v_production_log.timestamp
        );

        RAISE NOTICE '  ✅ Malzeme tüketim stok hareketi oluşturuldu: %', 
          v_bom_record.material_name;
      ELSE
        RAISE NOTICE '  ✅ Malzeme tüketim stok hareketi mevcut: %', 
          v_bom_record.material_name;
      END IF;
    END LOOP;

    RAISE NOTICE '✅ Production log işlendi: %', v_production_log.id;
  END LOOP;

  RAISE NOTICE '✅ Tüm işlemler tamamlandı!';
END $$;

-- ============================================
-- SONUÇ KONTROLÜ
-- ============================================
SELECT 
  'Plan Durumu' as kontrol,
  pp.id as plan_id,
  o.order_number,
  fp.name as urun,
  pp.planned_quantity as planlanan,
  pp.produced_quantity as uretilen,
  (SELECT COUNT(*) FROM production_logs WHERE plan_id = pp.id) as log_sayisi,
  (SELECT COUNT(*) FROM stock_movements 
   WHERE material_type = 'finished' 
   AND material_id = pp.product_id 
   AND description LIKE '%Plan #' || pp.id || '%') as urun_stok_hareketi,
  (SELECT COUNT(*) FROM production_plan_bom_snapshot WHERE plan_id = pp.id) as bom_snapshot_sayisi,
  (SELECT COUNT(*) FROM stock_movements sm
   JOIN production_plan_bom_snapshot bs ON sm.material_id = bs.material_id 
   WHERE bs.plan_id = pp.id 
   AND sm.movement_type = 'uretim'
   AND sm.description LIKE '%Plan #' || pp.id || '%') as malzeme_stok_hareketi
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
JOIN finished_products fp ON fp.id = pp.product_id
WHERE pp.id = '621a05fa-fd4e-4ece-9794-950b297f50eb';

