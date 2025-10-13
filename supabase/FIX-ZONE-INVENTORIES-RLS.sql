-- ═══════════════════════════════════════════════════════════
-- 🔐 ZONE_INVENTORIES RLS FIX
-- ═══════════════════════════════════════════════════════════

-- 1. Mevcut RLS politikalarını kaldır
DROP POLICY IF EXISTS "zone_inventories_select" ON zone_inventories;
DROP POLICY IF EXISTS "zone_inventories_insert" ON zone_inventories;
DROP POLICY IF EXISTS "zone_inventories_update" ON zone_inventories;
DROP POLICY IF EXISTS "zone_inventories_delete" ON zone_inventories;

-- 2. Yeni politikalar - depo ve yonetici erişebilsin

-- SELECT policy (depo ve yonetici görebilsin)
CREATE POLICY "zone_inventories_select" ON zone_inventories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('depo', 'yonetici')
  )
);

-- INSERT policy (depo ve yonetici ekleyebilsin)
CREATE POLICY "zone_inventories_insert" ON zone_inventories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('depo', 'yonetici')
  )
);

-- UPDATE policy (depo ve yonetici güncelleyebilsin)
CREATE POLICY "zone_inventories_update" ON zone_inventories
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('depo', 'yonetici')
  )
);

-- DELETE policy (sadece yonetici silebilsin)
CREATE POLICY "zone_inventories_delete" ON zone_inventories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'yonetici'
  )
);

-- Kontrol
SELECT 
    '✅ RLS POLICIES UPDATED' as info,
    COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'zone_inventories';

