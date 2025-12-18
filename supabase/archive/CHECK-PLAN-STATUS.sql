-- ============================================
-- PLAN DURUMU KONTROLÜ
-- Plan ID: 621a05fa-fd4e-4ece-9794-950b297f50eb
-- ============================================

-- 1. Plan Bilgileri
SELECT 
  '📋 Plan Bilgileri' as kontrol_tipi,
  pp.id as plan_id,
  o.order_number as siparis_no,
  fp.code as urun_kodu,
  fp.name as urun_adi,
  pp.planned_quantity as planlanan_miktar,
  pp.produced_quantity as uretilen_miktar,
  pp.status as plan_durumu,
  pp.created_at as olusturulma_tarihi,
  pp.started_at as baslangic_tarihi,
  pp.completed_at as tamamlanma_tarihi
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
JOIN finished_products fp ON fp.id = pp.product_id
WHERE pp.id = '621a05fa-fd4e-4ece-9794-950b297f50eb';

-- 2. Production Logs (Üretim Kayıtları)
SELECT 
  '📝 Production Logs' as kontrol_tipi,
  pl.id as log_id,
  pl.operator_id,
  pl.quantity_produced as uretilen_miktar,
  pl.barcode_scanned as okunan_barkod,
  pl.timestamp as kayit_tarihi,
  u.name as operator_adi
FROM production_logs pl
LEFT JOIN users u ON u.id = pl.operator_id
WHERE pl.plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
ORDER BY pl.timestamp DESC;

-- 3. BOM Snapshot (Malzeme Listesi)
SELECT 
  '📦 BOM Snapshot' as kontrol_tipi,
  bs.plan_id,
  bs.material_type as malzeme_tipi,
  bs.material_code as malzeme_kodu,
  bs.material_name as malzeme_adi,
  bs.quantity_needed as gerekli_miktar,
  CASE 
    WHEN bs.material_type = 'raw' THEN rm.quantity
    WHEN bs.material_type = 'semi' THEN sm.quantity
  END as mevcut_stok
FROM production_plan_bom_snapshot bs
LEFT JOIN raw_materials rm ON bs.material_type = 'raw' AND bs.material_id = rm.id
LEFT JOIN semi_finished_products sm ON bs.material_type = 'semi' AND bs.material_id = sm.id
WHERE bs.plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
ORDER BY bs.material_type, bs.material_name;

-- 4. Stok Hareketleri - Nihai Ürün (Finished Product)
SELECT 
  '✅ Nihai Ürün Stok Hareketleri' as kontrol_tipi,
  sm.id as hareket_id,
  sm.material_type,
  sm.movement_type,
  sm.quantity,
  sm.before_quantity as onceki_stok,
  sm.after_quantity as sonraki_stok,
  sm.description as aciklama,
  sm.created_at as tarih,
  u.name as kullanici
FROM stock_movements sm
LEFT JOIN users u ON u.id = sm.user_id
WHERE sm.material_type = 'finished'
  AND sm.material_id = (
    SELECT product_id FROM production_plans WHERE id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
  )
  AND (
    sm.description LIKE '%Plan #621a05fa-fd4e-4ece-9794-950b297f50eb%'
    OR sm.description LIKE '%plan #621a05fa-fd4e-4ece-9794-950b297f50eb%'
  )
ORDER BY sm.created_at DESC;

-- 5. Stok Hareketleri - Hammadde ve Yarı Mamul Tüketimleri
SELECT 
  '🔧 Malzeme Tüketim Stok Hareketleri' as kontrol_tipi,
  sm.id as hareket_id,
  sm.material_type,
  bs.material_code,
  bs.material_name,
  sm.movement_type,
  sm.quantity,
  sm.before_quantity as onceki_stok,
  sm.after_quantity as sonraki_stok,
  sm.description as aciklama,
  sm.created_at as tarih,
  u.name as kullanici
FROM stock_movements sm
JOIN production_plan_bom_snapshot bs ON sm.material_id = bs.material_id 
  AND sm.material_type = bs.material_type
LEFT JOIN users u ON u.id = sm.user_id
WHERE bs.plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
  AND sm.movement_type = 'uretim'
  AND (
    sm.description LIKE '%Plan #621a05fa-fd4e-4ece-9794-950b297f50eb%'
    OR sm.description LIKE '%plan #621a05fa-fd4e-4ece-9794-950b297f50eb%'
  )
ORDER BY sm.created_at DESC;

-- 6. ÖZET: Eksik Stok Hareketleri Kontrolü
SELECT 
  '📊 ÖZET' as kontrol_tipi,
  (SELECT COUNT(*) FROM production_logs WHERE plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb') as production_log_sayisi,
  (SELECT COUNT(*) FROM production_plan_bom_snapshot WHERE plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb') as bom_snapshot_sayisi,
  (SELECT COUNT(*) FROM stock_movements sm
   JOIN production_plans pp ON pp.product_id = sm.material_id
   WHERE pp.id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
   AND sm.material_type = 'finished'
   AND sm.movement_type = 'uretim'
   AND sm.description LIKE '%Plan #621a05fa-fd4e-4ece-9794-950b297f50eb%') as nihai_urun_hareket_sayisi,
  (SELECT COUNT(*) FROM stock_movements sm
   JOIN production_plan_bom_snapshot bs ON sm.material_id = bs.material_id
   WHERE bs.plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
   AND sm.movement_type = 'uretim') as malzeme_tuketim_hareket_sayisi,
  CASE 
    WHEN (SELECT COUNT(*) FROM production_logs WHERE plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb') > 0
      AND (SELECT COUNT(*) FROM stock_movements sm
           JOIN production_plans pp ON pp.product_id = sm.material_id
           WHERE pp.id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
           AND sm.material_type = 'finished'
           AND sm.movement_type = 'uretim') = 0
    THEN '❌ EKSİK: Nihai ürün stok hareketleri yok!'
    ELSE '✅ OK'
  END as nihai_urun_durumu,
  CASE 
    WHEN (SELECT COUNT(*) FROM production_plan_bom_snapshot WHERE plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb') > 0
      AND (SELECT COUNT(*) FROM stock_movements sm
           JOIN production_plan_bom_snapshot bs ON sm.material_id = bs.material_id
           WHERE bs.plan_id = '621a05fa-fd4e-4ece-9794-950b297f50eb'
           AND sm.movement_type = 'uretim') = 0
    THEN '❌ EKSİK: Malzeme tüketim stok hareketleri yok!'
    ELSE '✅ OK'
  END as malzeme_tuketim_durumu;

