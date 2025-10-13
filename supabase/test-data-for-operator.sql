-- =====================================================
-- TEST DATA FOR OPERATOR PRODUCTION WORKFLOW
-- =====================================================
-- Bu script operatör üretim testleri için gerekli tüm test verisini oluşturur

-- =====================================================
-- 1. TEST HAMMADDELERİ
-- =====================================================

-- Hammadde 1: Çelik Levha
INSERT INTO raw_materials (
  id, code, name, quantity, unit, unit_price, 
  critical_level, max_level, created_by
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'HM-CELIK-001',
  'Çelik Levha 5mm',
  10000,  -- 10,000 kg stok
  'kg',
  15.50,
  1000,   -- Kritik seviye: 1000 kg
  15000,
  '228e0137-818f-4235-9f66-fcb694998267'  -- Admin user
) ON CONFLICT (id) DO UPDATE SET
  quantity = 10000,
  critical_level = 1000;

-- Hammadde 2: Boya
INSERT INTO raw_materials (
  id, code, name, quantity, unit, unit_price, 
  critical_level, max_level, created_by
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'HM-BOYA-001',
  'Endüstriyel Boya (Kırmızı)',
  500,    -- 500 lt stok
  'lt',
  45.00,
  100,    -- Kritik seviye: 100 lt
  1000,
  '228e0137-818f-4235-9f66-fcb694998267'
) ON CONFLICT (id) DO UPDATE SET
  quantity = 500,
  critical_level = 100;

-- =====================================================
-- 2. TEST NİHAİ ÜRÜN
-- =====================================================

INSERT INTO finished_products (
  id, code, name, barcode, quantity, unit, unit_price,
  critical_level, max_level, created_by
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'NM-KAPI-001',
  'Endüstriyel Kapı Model A',
  '8690123456789',  -- Barkod
  50,     -- Başlangıç stok: 50 adet
  'adet',
  2500.00,
  10,     -- Kritik seviye: 10 adet
  200,
  '228e0137-818f-4235-9f66-fcb694998267'
) ON CONFLICT (id) DO UPDATE SET
  quantity = 50,
  barcode = '8690123456789';

-- =====================================================
-- 3. BOM (Bill of Materials) - Reçete
-- =====================================================

-- Çelik Levha: 50 kg/birim
INSERT INTO bom (
  id, finished_product_id, material_type, material_id, quantity_needed, unit
) VALUES (
  'bbbbbbbb-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Kapı
  'raw',
  '11111111-1111-1111-1111-111111111111',  -- Çelik
  50,
  'kg'
) ON CONFLICT (id) DO NOTHING;

-- Boya: 2 lt/birim
INSERT INTO bom (
  id, finished_product_id, material_type, material_id, quantity_needed, unit
) VALUES (
  'bbbbbbbb-2222-2222-2222-222222222222',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Kapı
  'raw',
  '22222222-2222-2222-2222-222222222222',  -- Boya
  2,
  'lt'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. TEST SİPARİŞ
-- =====================================================

INSERT INTO orders (
  id, order_number, customer_id, customer_name, 
  total_quantity, priority, status, delivery_date, created_by
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'ORD-TEST-001',
  '92dfe38a-04f2-4b45-83a2-ee96d268c3fb',  -- LTSAUTO
  'LTSAUTO',
  10,     -- 10 adet kapı siparişi
  'yuksek',
  'onaylandi',  -- Onaylandı durumunda
  '2025-02-15',
  '228e0137-818f-4235-9f66-fcb694998267'
) ON CONFLICT (id) DO UPDATE SET
  status = 'onaylandi',
  total_quantity = 10;

-- =====================================================
-- 5. SİPARİŞ KALEMLERI
-- =====================================================

INSERT INTO order_items (
  id, order_id, product_id, quantity, unit_price
) VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',  -- Sipariş
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Kapı
  10,
  2500.00
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. ÜRETİM PLANI (Operatöre Atanmış)
-- =====================================================

INSERT INTO production_plans (
  id, order_id, product_id, planned_quantity, 
  produced_quantity, status, assigned_operator_id, created_by
) VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',  -- Sipariş
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',  -- Kapı
  10,     -- 10 adet üretilecek
  0,      -- Henüz üretilmedi
  'planlandi',  -- Planlandi - Operatör kabul edecek
  '11111111-1111-1111-1111-111111111111',  -- Thunder Operatör
  '228e0137-818f-4235-9f66-fcb694998267'
) ON CONFLICT (id) DO UPDATE SET
  status = 'planlandi',
  produced_quantity = 0,
  assigned_operator_id = '11111111-1111-1111-1111-111111111111';

-- =====================================================
-- 7. Trigger Kontrolü - BOM Snapshot Oluşacak mı?
-- =====================================================
-- Not: production_plans INSERT edildiğinde trigger_create_bom_snapshot
-- otomatik olarak production_plan_bom_snapshot tablosuna veri ekleyecek

-- Snapshot kontrolü için:
SELECT 
  plan_id,
  material_type,
  material_code,
  material_name,
  quantity_needed
FROM production_plan_bom_snapshot
WHERE plan_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

-- Eğer yukarıdaki sorgu boş dönerse, manuel ekle:
INSERT INTO production_plan_bom_snapshot (
  plan_id, material_type, material_id, material_code, material_name, quantity_needed
)
SELECT 
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  bom.material_type,
  bom.material_id,
  CASE 
    WHEN bom.material_type = 'raw' THEN rm.code
    ELSE NULL
  END,
  CASE 
    WHEN bom.material_type = 'raw' THEN rm.name
    ELSE NULL
  END,
  bom.quantity_needed * 10  -- 10 adet için toplam ihtiyaç
FROM bom
LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
WHERE bom.finished_product_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
ON CONFLICT (plan_id, material_id) DO NOTHING;

-- =====================================================
-- ÖZET
-- =====================================================
-- 
-- TEST VERİSİ:
-- ✓ 2 Hammadde (Çelik: 10000 kg, Boya: 500 lt)
-- ✓ 1 Nihai Ürün (Kapı, barkod: 8690123456789)
-- ✓ BOM: 50 kg çelik + 2 lt boya / birim
-- ✓ 1 Sipariş (10 adet, LTSAUTO müşterisi)
-- ✓ 1 Production Plan (status: planlandi, Thunder Operatör'e atanmış)
--
-- BEKLENEN SONUÇ:
-- - Operatör dashboard'da "Atanan Siparişler" listesinde 1 sipariş görecek
-- - "Kabul Et" butonuna basabilecek
-- - Barkod okutarak üretim kaydedebilecek (8690123456789)
-- - Her üretim kaydında: 50 kg çelik + 2 lt boya düşecek
-- - 10 adet üretim tamamlandığında plan "tamamlandi" olacak
--
-- =====================================================

