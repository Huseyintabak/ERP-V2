-- ==========================================
-- SİPARİŞ ONAYLAMA FONKSİYONU GÜNCELLEMESİ
-- ==========================================
-- Bu kodu Supabase Dashboard > SQL Editor'de çalıştırın

-- Problem: approve_order_transaction fonksiyonu eski schema kullanıyor
-- Çözüm: Yeni order_items tablosu için güncelleniyor

CREATE OR REPLACE FUNCTION approve_order_transaction(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_order_items RECORD;
  v_plan_id UUID;
  v_missing_materials JSON;
  v_total_missing JSONB := '[]'::JSONB;
  v_item_missing JSON;
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  -- Her order_item için stok kontrolü yap
  FOR v_order_items IN 
    SELECT product_id, quantity 
    FROM order_items 
    WHERE order_id = p_order_id
  LOOP
    -- Her ürün için stok kontrolü
    SELECT check_stock_availability(v_order_items.product_id, v_order_items.quantity) INTO v_item_missing;
    
    -- Eğer bu ürün için stok yoksa, missing listesine ekle
    IF v_item_missing IS NOT NULL THEN
      v_total_missing := v_total_missing || jsonb_build_object(
        'product_id', v_order_items.product_id,
        'quantity', v_order_items.quantity,
        'missing_materials', v_item_missing
      );
    END IF;
  END LOOP;
  
  -- Eğer herhangi bir ürün için stok yoksa
  IF jsonb_array_length(v_total_missing) > 0 THEN
    RETURN json_build_object('success', FALSE, 'missing_materials', v_total_missing);
  END IF;
  
  -- Her order_item için production plan oluştur
  FOR v_order_items IN 
    SELECT product_id, quantity 
    FROM order_items 
    WHERE order_id = p_order_id
  LOOP
    INSERT INTO production_plans (order_id, product_id, planned_quantity, status)
    VALUES (p_order_id, v_order_items.product_id, v_order_items.quantity, 'planlandi')
    RETURNING id INTO v_plan_id;
    
    -- Her ürün için malzeme rezervasyonları oluştur
    PERFORM create_material_reservations(p_order_id, v_order_items.product_id, v_order_items.quantity);
  END LOOP;
  
  -- Sipariş durumunu güncelle
  UPDATE orders SET status = 'uretimde' WHERE id = p_order_id;
  
  RETURN json_build_object('success', TRUE, 'plan_id', v_plan_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- GÜNCELLEME TAMAMLANDI
-- ==========================================
-- Fonksiyon artık yeni schema ile çalışıyor:
-- ✅ order_items tablosu kullanılıyor
-- ✅ Çoklu ürün desteği
-- ✅ Her ürün için ayrı stok kontrolü
-- ✅ Her ürün için ayrı production plan
-- ✅ Malzeme rezervasyonları
