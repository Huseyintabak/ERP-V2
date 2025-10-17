-- ============================================
-- Thunder ERP v2 - Seed Data
-- ============================================
-- Migration.sql çalıştırıldıktan sonra bunu çalıştırın
-- ============================================

-- ============================================
-- 1. SYSTEM SETTINGS
-- ============================================

INSERT INTO system_settings (key, value, description) VALUES
  ('default_operator_password', '123456', 'Yeni operatörler için varsayılan şifre'),
  ('order_number_prefix', 'ORD', 'Sipariş numarası öneki'),
  ('default_critical_level_raw', '10', 'Hammadde varsayılan kritik seviye'),
  ('default_critical_level_semi', '5', 'Yarı mamul varsayılan kritik seviye'),
  ('default_critical_level_finished', '5', 'Nihai ürün varsayılan kritik seviye'),
  ('enable_auto_operator_assign', 'false', 'Otomatik operatör ataması aktif mi'),
  ('pagination_default_limit', '50', 'Varsayılan sayfa başı kayıt sayısı'),
  ('company_name', 'Thunder ERP', 'Şirket adı'),
  ('max_file_upload_size_mb', '10', 'Maksimum dosya yükleme boyutu (MB)');

-- ============================================
-- 2. USERS (Bcrypt hash'lenmiş şifreler)
-- ============================================
-- Tüm kullanıcılar için şifre: 123456
-- Hash: $2a$10$4ZCXIk.OUfI2/18EaQn1PuqZSd6s09d6XhbA52vhhEZfY4uabI3oa

INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
  (gen_random_uuid(), 'admin@thunder.com', '$2a$10$4ZCXIk.OUfI2/18EaQn1PuqZSd6s09d6XhbA52vhhEZfY4uabI3oa', 'Admin Kullanıcı', 'yonetici', TRUE),
  (gen_random_uuid(), 'planlama@thunder.com', '$2a$10$4ZCXIk.OUfI2/18EaQn1PuqZSd6s09d6XhbA52vhhEZfY4uabI3oa', 'Planlama Kullanıcı', 'planlama', TRUE),
  (gen_random_uuid(), 'depo@thunder.com', '$2a$10$4ZCXIk.OUfI2/18EaQn1PuqZSd6s09d6XhbA52vhhEZfY4uabI3oa', 'Depo Kullanıcı', 'depo', TRUE),
  ('11111111-1111-1111-1111-111111111111', 'operator1@thunder.com', '$2a$10$4ZCXIk.OUfI2/18EaQn1PuqZSd6s09d6XhbA52vhhEZfY4uabI3oa', 'Thunder Operatör', 'operator', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'operator2@thunder.com', '$2a$10$4ZCXIk.OUfI2/18EaQn1PuqZSd6s09d6XhbA52vhhEZfY4uabI3oa', 'ThunderPro Operatör', 'operator', TRUE);

-- ============================================
-- 3. OPERATORS
-- ============================================

INSERT INTO operators (id, series, experience_years, daily_capacity, location, hourly_rate, active_productions_count) VALUES
  ('11111111-1111-1111-1111-111111111111', 'thunder', 5, 46, 'Üretim Salonu A', 25, 0),
  ('22222222-2222-2222-2222-222222222222', 'thunder_pro', 5, 46, 'Üretim Salonu B', 25, 0);

-- ============================================
-- 4. ÖRNEK HAMMADDELER
-- ============================================

INSERT INTO raw_materials (code, name, barcode, quantity, unit, unit_price, critical_level, description) VALUES
  ('HM-001', 'Çelik Sac 2mm', '1234567890001', 500, 'kg', 50.00, 100, 'Galvaniz çelik sac 2mm'),
  ('HM-002', 'Alüminyum Profil', '1234567890002', 200, 'metre', 75.00, 50, 'Alüminyum profil 40x40'),
  ('HM-003', 'Vida M8', '1234567890003', 10000, 'adet', 0.50, 1000, 'Paslanmaz çelik vida M8'),
  ('HM-004', 'Boya Siyah', '1234567890004', 50, 'litre', 120.00, 10, 'Mat siyah sprey boya'),
  ('HM-005', 'Elektrik Kablosu', '1234567890005', 300, 'metre', 15.00, 50, '2x1.5mm elektrik kablosu');

-- ============================================
-- 5. ÖRNEK YARI MAMULLER
-- ============================================

INSERT INTO semi_finished_products (code, name, barcode, quantity, unit, unit_cost, critical_level, description) VALUES
  ('YM-001', 'Plaka A', '2234567890001', 100, 'adet', 120.00, 20, 'İşlenmiş çelik plaka'),
  ('YM-002', 'Gövde B', '2234567890002', 50, 'adet', 200.00, 10, 'Kaynaklı gövde parçası'),
  ('YM-003', 'Kapak C', '2234567890003', 75, 'adet', 80.00, 15, 'Alüminyum kapak parçası');

-- ============================================
-- 6. ÖRNEK NİHAİ ÜRÜNLER
-- ============================================

INSERT INTO finished_products (code, name, barcode, quantity, unit, sale_price, critical_level, description) VALUES
  ('NU-001', 'Thunder Ürün X Model A', '3234567890001', 25, 'adet', 500.00, 5, 'Thunder ERP Ürün X'),
  ('NU-002', 'ThunderPro Ürün Y Model B', '3234567890002', 15, 'adet', 750.00, 3, 'ThunderPro Ürün Y'),
  ('NU-003', 'Thunder Ürün Z Standart', '3234567890003', 30, 'adet', 350.00, 8, 'Thunder Standart Ürün Z');

-- ============================================
-- 7. ÖRNEK BOM (Ürün Ağacı)
-- ============================================

-- NU-001 için: 10 kg HM-001 (Çelik Sac) + 2 adet YM-001 (Plaka A) + 50 adet HM-003 (Vida)
INSERT INTO bom (finished_product_id, material_type, material_id, quantity_needed)
SELECT 
  fp.id,
  'raw',
  rm.id,
  10
FROM finished_products fp, raw_materials rm
WHERE fp.code = 'NU-001' AND rm.code = 'HM-001';

INSERT INTO bom (finished_product_id, material_type, material_id, quantity_needed)
SELECT 
  fp.id,
  'semi',
  sfp.id,
  2
FROM finished_products fp, semi_finished_products sfp
WHERE fp.code = 'NU-001' AND sfp.code = 'YM-001';

INSERT INTO bom (finished_product_id, material_type, material_id, quantity_needed)
SELECT 
  fp.id,
  'raw',
  rm.id,
  50
FROM finished_products fp, raw_materials rm
WHERE fp.code = 'NU-001' AND rm.code = 'HM-003';

-- NU-002 için: 5 metre HM-002 (Alüminyum) + 1 adet YM-002 (Gövde B)
INSERT INTO bom (finished_product_id, material_type, material_id, quantity_needed)
SELECT 
  fp.id,
  'raw',
  rm.id,
  5
FROM finished_products fp, raw_materials rm
WHERE fp.code = 'NU-002' AND rm.code = 'HM-002';

INSERT INTO bom (finished_product_id, material_type, material_id, quantity_needed)
SELECT 
  fp.id,
  'semi',
  sfp.id,
  1
FROM finished_products fp, semi_finished_products sfp
WHERE fp.code = 'NU-002' AND sfp.code = 'YM-002';

-- ============================================
-- 8. ÖRNEK YARI MAMUL BOM (Semi-BOM)
-- ============================================

-- YM-001 (Plaka A) için BOM: 5 kg HM-001 (Çelik Sac) + 10 adet HM-003 (Vida)
INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, unit)
SELECT 
  sfp.id,
  rm.id,
  'raw',
  5.0,
  'kg'
FROM semi_finished_products sfp, raw_materials rm
WHERE sfp.code = 'YM-001' AND rm.code = 'HM-001';

INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, unit)
SELECT 
  sfp.id,
  rm.id,
  'raw',
  10.0,
  'adet'
FROM semi_finished_products sfp, raw_materials rm
WHERE sfp.code = 'YM-001' AND rm.code = 'HM-003';

-- YM-002 (Gövde B) için BOM: 3 metre HM-002 (Alüminyum) + 1 adet YM-001 (Plaka A)
INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, unit)
SELECT 
  sfp.id,
  rm.id,
  'raw',
  3.0,
  'metre'
FROM semi_finished_products sfp, raw_materials rm
WHERE sfp.code = 'YM-002' AND rm.code = 'HM-002';

INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, unit)
SELECT 
  sfp1.id,
  sfp2.id,
  'semi',
  1.0,
  'adet'
FROM semi_finished_products sfp1, semi_finished_products sfp2
WHERE sfp1.code = 'YM-002' AND sfp2.code = 'YM-001';

-- YM-003 (Kapak C) için BOM: 2 litre HM-004 (Boya) + 0.5 metre HM-005 (Elektrik Kablosu)
INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, unit)
SELECT 
  sfp.id,
  rm.id,
  'raw',
  2.0,
  'litre'
FROM semi_finished_products sfp, raw_materials rm
WHERE sfp.code = 'YM-003' AND rm.code = 'HM-004';

INSERT INTO semi_bom (semi_product_id, material_id, material_type, quantity, unit)
SELECT 
  sfp.id,
  rm.id,
  'raw',
  0.5,
  'metre'
FROM semi_finished_products sfp, raw_materials rm
WHERE sfp.code = 'YM-003' AND rm.code = 'HM-005';

-- ============================================
-- Seed Data Complete!
-- ============================================
-- Varsayılan kullanıcılar:
-- - admin@thunder.com / Admin123! (ŞİFRE: 123456 - bcrypt hash'i kullanıldı)
-- - planlama@thunder.com / Plan123! (ŞİFRE: 123456)
-- - depo@thunder.com / Depo123! (ŞİFRE: 123456)
-- - operator1@thunder.com / 123456
-- - operator2@thunder.com / 123456
--
-- NOT: Tüm şifreler geçici olarak 123456 kullanıyor!
-- Production'da mutlaka değiştirin!
-- ============================================

