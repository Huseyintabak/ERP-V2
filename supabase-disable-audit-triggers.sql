-- ==========================================
-- AUDIT LOG TRIGGER'LARI DEVRE DIŞI BIRAK
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- Tüm audit log trigger'larını kaldır
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products;
DROP TRIGGER IF EXISTS trigger_audit_orders ON orders;
DROP TRIGGER IF EXISTS trigger_audit_production_plans ON production_plans;
DROP TRIGGER IF EXISTS trigger_audit_bom ON bom;
DROP TRIGGER IF EXISTS trigger_audit_users ON users;

-- ==========================================
-- TRIGGER'LAR DEVRE DIŞI BIRAKILDI
-- ==========================================
-- ✅ Artık audit log trigger'ları yok
-- ✅ Sipariş onaylama işlemi çalışmalı
-- ✅ Test edebilirsiniz