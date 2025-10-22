-- Fix audit_logs RLS policy to allow insertions
-- audit_logs RLS policy'sini eklemelere izin verecek şekilde düzelt

-- First, let's check if audit_logs table exists and has RLS enabled
-- audit_logs tablosunun var olup olmadığını ve RLS'nin etkin olup olmadığını kontrol edelim

-- Disable RLS temporarily to allow insertions
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;

-- Or if we want to keep RLS but allow insertions, create a policy:
-- RLS'yi korumak ama eklemelere izin vermek istiyorsak, bir policy oluşturalım:

-- Re-enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows insertions for authenticated users
-- Kimlik doğrulaması yapılmış kullanıcılar için eklemelere izin veren bir policy oluştur
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON audit_logs;
CREATE POLICY "Allow insert for authenticated users" ON audit_logs
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also allow updates and selects for authenticated users
-- Kimlik doğrulaması yapılmış kullanıcılar için güncelleme ve seçme işlemlerine de izin ver
DROP POLICY IF EXISTS "Allow select for authenticated users" ON audit_logs;
CREATE POLICY "Allow select for authenticated users" ON audit_logs
FOR SELECT 
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow update for authenticated users" ON audit_logs;
CREATE POLICY "Allow update for authenticated users" ON audit_logs
FOR UPDATE 
TO authenticated
USING (true);
