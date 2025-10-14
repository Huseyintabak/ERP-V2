-- Zone Inventories ve Zone Transfers RLS Fix
-- Bu SQL'i Supabase SQL Editor'da çalıştırın

-- 1. Zone Inventories RLS'i kapat
ALTER TABLE zone_inventories DISABLE ROW LEVEL SECURITY;

-- 2. Zone Transfers RLS'i kapat  
ALTER TABLE zone_transfers DISABLE ROW LEVEL SECURITY;

-- Kontrol et
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('zone_inventories', 'zone_transfers');

-- Beklenen sonuç: rowsecurity = false


