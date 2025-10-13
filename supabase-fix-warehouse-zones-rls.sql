-- ============================================
-- Fix Warehouse Zones RLS Policy
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Yönetici can manage warehouse zones" ON warehouse_zones;

-- Create new policy for both yönetici and depo roles
CREATE POLICY "Yönetici and Depo can manage warehouse zones" ON warehouse_zones
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('yonetici', 'depo')
  )
);

-- Test the policy by checking current policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'warehouse_zones';
