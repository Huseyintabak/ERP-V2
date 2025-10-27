-- Migration: Tamamlanmış planları aktif duruma getir
-- Bu script, production_plans tablosunda status='tamamlandi' olan 
-- tüm planları 'planlandi' durumuna getirir.

DO $$
DECLARE
  v_updated_count BIGINT := 0;
BEGIN
  -- Tamamlanmış planları planlandi durumuna getir
  UPDATE production_plans
  SET 
    status = 'planlandi',
    updated_at = NOW()
  WHERE status = 'tamamlandi';
  
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  RAISE NOTICE '✅ Tamamlanmış planlar aktive edildi: % adet plan güncellendi', v_updated_count;
END $$;

-- Kontrol sorgusu: Güncellenmiş planları göster
SELECT 
  id,
  order_id,
  status,
  created_at,
  updated_at
FROM production_plans
WHERE status IN ('planlandi', 'tamamlandi')
ORDER BY updated_at DESC
LIMIT 10;

