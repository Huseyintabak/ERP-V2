-- RLS'yi tamamen devre dışı bırak
ALTER TABLE semi_production_orders DISABLE ROW LEVEL SECURITY;

-- Tüm politikaları kaldır
DROP POLICY IF EXISTS "Authenticated users can view semi production orders" ON semi_production_orders;
DROP POLICY IF EXISTS "Authenticated users can insert semi production orders" ON semi_production_orders;
DROP POLICY IF EXISTS "Authenticated users can update semi production orders" ON semi_production_orders;
DROP POLICY IF EXISTS "Authenticated users can delete semi production orders" ON semi_production_orders;

-- Tabloyu herkese açık yap
GRANT ALL ON semi_production_orders TO authenticated;
GRANT ALL ON semi_production_orders TO anon;
GRANT ALL ON semi_production_orders TO service_role;

SELECT '✅ RLS COMPLETELY DISABLED!' as result;
