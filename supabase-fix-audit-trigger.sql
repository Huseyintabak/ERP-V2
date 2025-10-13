-- ==========================================
-- AUDIT LOG TRIGGER HATA DÜZELTMESİ
-- ==========================================
-- Problem: "record 'old' has no field 'unit_cost'" hatası
-- Çözüm: Audit log trigger'ı field mapping ile güncelleniyor

-- Mevcut trigger'ları kaldır
DROP TRIGGER IF EXISTS trigger_audit_raw_materials ON raw_materials;
DROP TRIGGER IF EXISTS trigger_audit_semi_finished ON semi_finished_products;
DROP TRIGGER IF EXISTS trigger_audit_finished ON finished_products;

-- Yeni, güncellenmiş audit log trigger fonksiyonu
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- User ID'yi context'ten al (yoksa NULL)
  BEGIN
    v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      v_user_id := NULL;
  END;
  
  -- Eğer user_id yoksa (seed data gibi), audit log kaydetme
  IF v_user_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- User ID varsa audit log kaydet
  IF TG_OP = 'DELETE' THEN
    -- Field mapping ile güvenli JSON oluştur
    BEGIN
      v_old_values := to_jsonb(OLD);
    EXCEPTION
      WHEN OTHERS THEN
        -- Hata durumunda sadece temel bilgileri kaydet
        v_old_values := jsonb_build_object(
          'id', OLD.id,
          'table_name', TG_TABLE_NAME
        );
    END;
    
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (v_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, v_old_values);
    RETURN OLD;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Field mapping ile güvenli JSON oluştur
    BEGIN
      v_old_values := to_jsonb(OLD);
      v_new_values := to_jsonb(NEW);
    EXCEPTION
      WHEN OTHERS THEN
        -- Hata durumunda sadece temel bilgileri kaydet
        v_old_values := jsonb_build_object(
          'id', OLD.id,
          'table_name', TG_TABLE_NAME
        );
        v_new_values := jsonb_build_object(
          'id', NEW.id,
          'table_name', TG_TABLE_NAME
        );
    END;
    
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, v_old_values, v_new_values);
    RETURN NEW;
    
  ELSIF TG_OP = 'INSERT' THEN
    -- Field mapping ile güvenli JSON oluştur
    BEGIN
      v_new_values := to_jsonb(NEW);
    EXCEPTION
      WHEN OTHERS THEN
        -- Hata durumunda sadece temel bilgileri kaydet
        v_new_values := jsonb_build_object(
          'id', NEW.id,
          'table_name', TG_TABLE_NAME
        );
    END;
    
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (v_user_id, 'CREATE', TG_TABLE_NAME, NEW.id, v_new_values);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları yeniden oluştur
CREATE TRIGGER trigger_audit_raw_materials
AFTER INSERT OR UPDATE OR DELETE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_semi_finished
AFTER INSERT OR UPDATE OR DELETE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_finished
AFTER INSERT OR UPDATE OR DELETE ON finished_products
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- ==========================================
-- GÜNCELLEME TAMAMLANDI
-- ==========================================
-- ✅ Audit log trigger artık field hatalarını handle ediyor
-- ✅ Exception handling eklendi
-- ✅ Güvenli JSON oluşturma
-- ✅ Trigger'lar yeniden oluşturuldu
