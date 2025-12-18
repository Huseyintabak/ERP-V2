-- ============================================
-- EKSİK TRİGGER EKLE: update_stock_on_production
-- ============================================

-- Bu trigger production_logs'a INSERT olunca:
-- 1. Finished product stokunu artırır
-- 2. Production plan'ın produced_quantity'sini günceller
-- 3. Stock movement kaydı oluşturur

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS trigger_production_log_stock ON production_logs;

CREATE TRIGGER trigger_production_log_stock
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION update_stock_on_production();

-- Kontrol et
SELECT 
    '✅ Trigger eklendi' as result,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'production_logs'
ORDER BY trigger_name;

-- Test: Mevcut production log için manuel trigger çağırarak produced_quantity güncelle
-- (Geçmişte oluşan log için retroaktif güncelleme)
UPDATE production_plans pp
SET produced_quantity = (
    SELECT COALESCE(SUM(pl.quantity_produced), 0)
    FROM production_logs pl
    WHERE pl.plan_id = pp.id
)
WHERE pp.id IN (
    SELECT DISTINCT plan_id 
    FROM production_logs 
    WHERE timestamp >= NOW() - INTERVAL '1 hour'
);

-- Sonucu kontrol et
SELECT 
    'After Trigger Fix' as check_type,
    pp.id,
    o.order_number,
    pp.planned_quantity,
    pp.produced_quantity,
    (SELECT COUNT(*) FROM production_logs WHERE plan_id = pp.id) as total_logs,
    CASE 
        WHEN pp.produced_quantity > 0 THEN '✅ Düzeltildi!'
        ELSE '❌ Hala 0'
    END as fix_status
FROM production_plans pp
JOIN orders o ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-011';

