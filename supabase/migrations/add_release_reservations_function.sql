-- Add release_reservations_on_plan_cancel function
-- release_reservations_on_plan_cancel fonksiyonunu ekle

CREATE OR REPLACE FUNCTION release_reservations_on_plan_cancel(p_plan_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Rezervasyonları serbest bırak
  -- Bu fonksiyon şimdilik basit bir implementasyon
  -- Gerçek rezervasyon sistemi varsa burada güncellenebilir
  
  -- Örnek: Eğer reservations tablosu varsa
  -- UPDATE reservations 
  -- SET status = 'released', released_at = NOW()
  -- WHERE plan_id = p_plan_id AND status = 'active';
  
  -- Şimdilik sadece log yazdır
  RAISE NOTICE 'Releasing reservations for plan: %', p_plan_id;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
