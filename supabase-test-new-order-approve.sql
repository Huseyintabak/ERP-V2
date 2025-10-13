-- ==========================================
-- YENİ SİPARİŞ ONAYLAMA TEST
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- Test için user context set et
SELECT set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111'::TEXT, TRUE);

-- Yeni siparişin detaylarını kontrol et
SELECT 
  o.id,
  o.order_number,
  o.customer_name,
  o.status,
  oi.product_id,
  oi.quantity,
  fp.name as product_name
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN finished_products fp ON oi.product_id = fp.id
WHERE o.order_number = 'ORD-2025-008';

-- Approve function'ı test et (yeni sipariş için)
SELECT approve_order_transaction(
  'bed97e89-82c6-4977-aaaa-9efa7937530f'::UUID,
  '11111111-1111-1111-1111-111111111111'::UUID
);

-- Sonucu kontrol et
SELECT 
  o.id,
  o.order_number,
  o.status,
  pp.id as plan_id,
  pp.product_id,
  pp.planned_quantity,
  pp.status as plan_status
FROM orders o
LEFT JOIN production_plans pp ON o.id = pp.order_id
WHERE o.order_number = 'ORD-2025-008';

