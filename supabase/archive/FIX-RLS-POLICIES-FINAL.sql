-- RLS Politikalarını Tamamen Düzelt
-- Önce tüm politikaları kaldır
DROP POLICY IF EXISTS "Yonetici ve planlama tüm yarı mamul üretim siparişlerini görebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Operatörler kendi siparişlerini görebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Yonetici ve planlama yarı mamul üretim siparişi oluşturabilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Yonetici, planlama ve atanan operatör sipariş güncelleyebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Sadece yöneticiler yarı mamul üretim siparişi silebilir" ON semi_production_orders;

-- RLS'yi geçici olarak devre dışı bırak
ALTER TABLE semi_production_orders DISABLE ROW LEVEL SECURITY;

-- Basit politikalar oluştur
ALTER TABLE semi_production_orders ENABLE ROW LEVEL SECURITY;

-- Tüm authenticated kullanıcılar için basit politikalar
CREATE POLICY "Authenticated users can view semi production orders" ON semi_production_orders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert semi production orders" ON semi_production_orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update semi production orders" ON semi_production_orders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete semi production orders" ON semi_production_orders
  FOR DELETE USING (auth.role() = 'authenticated');

SELECT '✅ RLS POLICIES FIXED - SIMPLE VERSION!' as result;
