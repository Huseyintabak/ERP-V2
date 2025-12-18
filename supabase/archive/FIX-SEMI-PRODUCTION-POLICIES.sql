-- Yarı Mamul Üretim Politikalarını Düzelt
-- Mevcut politikaları kaldır
DROP POLICY IF EXISTS "Yonetici ve planlama tüm yarı mamul üretim siparişlerini görebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Operatörler kendi siparişlerini görebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Yonetici ve planlama yarı mamul üretim siparişi oluşturabilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Yonetici, planlama ve atanan operatör sipariş güncelleyebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Sadece yöneticiler yarı mamul üretim siparişi silebilir" ON semi_production_orders;

-- Yeni politikaları oluştur
CREATE POLICY "Yonetici ve planlama tüm yarı mamul üretim siparişlerini görebilir" ON semi_production_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

CREATE POLICY "Operatörler kendi siparişlerini görebilir" ON semi_production_orders
  FOR SELECT USING (
    assigned_operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

CREATE POLICY "Yonetici ve planlama yarı mamul üretim siparişi oluşturabilir" ON semi_production_orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

CREATE POLICY "Yonetici, planlama ve atanan operatör sipariş güncelleyebilir" ON semi_production_orders
  FOR UPDATE USING (
    assigned_operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

CREATE POLICY "Sadece yöneticiler yarı mamul üretim siparişi silebilir" ON semi_production_orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'yonetici'
    )
  );

SELECT '✅ SEMI PRODUCTION POLICIES FIXED!' as result;
