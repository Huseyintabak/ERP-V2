-- ==========================================
-- APPROVE FUNCTION SONUCU ALMA
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- Test için user context set et
SELECT set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111'::TEXT, TRUE);

-- Approve function'ı test et ve sonucu göster
SELECT approve_order_transaction(
  'bed97e89-82c6-4977-aaaa-9efa7937530f'::UUID,
  '11111111-1111-1111-1111-111111111111'::UUID
) as function_result;

