-- Yarı Mamul Üretim Siparişleri Tablosu
CREATE TABLE IF NOT EXISTS semi_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES semi_finished_products(id) ON DELETE CASCADE,
  planned_quantity INTEGER NOT NULL CHECK (planned_quantity > 0),
  produced_quantity INTEGER DEFAULT 0 CHECK (produced_quantity >= 0),
  status VARCHAR(20) DEFAULT 'planlandi' CHECK (status IN ('planlandi', 'devam_ediyor', 'tamamlandi', 'iptal')),
  priority VARCHAR(10) DEFAULT 'orta' CHECK (priority IN ('dusuk', 'orta', 'yuksek')),
  assigned_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_semi_production_orders_product_id ON semi_production_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_semi_production_orders_status ON semi_production_orders(status);
CREATE INDEX IF NOT EXISTS idx_semi_production_orders_assigned_operator ON semi_production_orders(assigned_operator_id);
CREATE INDEX IF NOT EXISTS idx_semi_production_orders_created_by ON semi_production_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_semi_production_orders_created_at ON semi_production_orders(created_at);

-- İzinler
GRANT SELECT ON semi_production_orders TO authenticated;
GRANT INSERT ON semi_production_orders TO authenticated;
GRANT UPDATE ON semi_production_orders TO authenticated;
GRANT DELETE ON semi_production_orders TO authenticated;
GRANT ALL ON semi_production_orders TO service_role;

-- RLS (Row Level Security) politikaları
ALTER TABLE semi_production_orders ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları kaldır (eğer varsa)
DROP POLICY IF EXISTS "Yonetici ve planlama tüm yarı mamul üretim siparişlerini görebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Operatörler kendi siparişlerini görebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Yonetici ve planlama yarı mamul üretim siparişi oluşturabilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Yonetici, planlama ve atanan operatör sipariş güncelleyebilir" ON semi_production_orders;
DROP POLICY IF EXISTS "Sadece yöneticiler yarı mamul üretim siparişi silebilir" ON semi_production_orders;

-- Yöneticiler ve planlama tüm kayıtları görebilir
CREATE POLICY "Yonetici ve planlama tüm yarı mamul üretim siparişlerini görebilir" ON semi_production_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Operatörler sadece kendilerine atanan siparişleri görebilir
CREATE POLICY "Operatörler kendi siparişlerini görebilir" ON semi_production_orders
  FOR SELECT USING (
    assigned_operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Yöneticiler ve planlama sipariş oluşturabilir
CREATE POLICY "Yonetici ve planlama yarı mamul üretim siparişi oluşturabilir" ON semi_production_orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Yöneticiler, planlama ve atanan operatör sipariş güncelleyebilir
CREATE POLICY "Yonetici, planlama ve atanan operatör sipariş güncelleyebilir" ON semi_production_orders
  FOR UPDATE USING (
    assigned_operator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Sadece yöneticiler sipariş silebilir
CREATE POLICY "Sadece yöneticiler yarı mamul üretim siparişi silebilir" ON semi_production_orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'yonetici'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_semi_production_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_semi_production_orders_updated_at
  BEFORE UPDATE ON semi_production_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_semi_production_orders_updated_at();

SELECT '✅ SEMI PRODUCTION ORDERS TABLE CREATED!' as result;
