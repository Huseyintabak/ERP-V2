-- BOM Tablosu Foreign Key Düzeltmesi
-- Yarı mamul ürünler için BOM desteği

-- 1. Mevcut foreign key constraint'i kaldır
ALTER TABLE bom DROP CONSTRAINT IF EXISTS bom_finished_product_id_fkey;

-- 2. Yeni validation için trigger fonksiyonu oluştur
CREATE OR REPLACE FUNCTION validate_bom_product_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Ürünün finished_products veya semi_finished_products'ta olup olmadığını kontrol et
  IF NOT EXISTS (
    SELECT 1 FROM finished_products WHERE id = NEW.finished_product_id
    UNION
    SELECT 1 FROM semi_finished_products WHERE id = NEW.finished_product_id
  ) THEN
    RAISE EXCEPTION 'Product ID % not found in finished_products or semi_finished_products', NEW.finished_product_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger'ı ekle
DROP TRIGGER IF EXISTS validate_bom_product ON bom;
CREATE TRIGGER validate_bom_product
  BEFORE INSERT OR UPDATE ON bom
  FOR EACH ROW
  EXECUTE FUNCTION validate_bom_product_id();

-- 4. finished_product_id kolonuna açıklama ekle
COMMENT ON COLUMN bom.finished_product_id IS 'Can reference either finished_products or semi_finished_products';

