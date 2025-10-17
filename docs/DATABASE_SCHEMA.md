# Thunder ERP v2 - Veritabanı Şeması

## Genel Bilgiler
- **DBMS:** PostgreSQL 15+ (Supabase)
- **Schema:** public
- **Timezone:** UTC
- **Encoding:** UTF8

---

## Tablolar ve İlişkiler

### 1. users (Kullanıcılar)

**Açıklama:** Tüm sistem kullanıcıları (Yönetici, Planlama, Depo, Operatör)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('yonetici', 'planlama', 'depo', 'operator')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
```

**Seed Data:**
- Yönetici: admin@thunder.com / Admin123!
- Planlama: planlama@thunder.com / Plan123!
- Depo: depo@thunder.com / Depo123!
- Operatör 1: operator1@thunder.com / 123456
- Operatör 2: operator2@thunder.com / 123456

---

### 2. raw_materials (Hammaddeler)

```sql
CREATE TABLE raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity NUMERIC(12, 2) DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (reserved_quantity >= 0),
  critical_level NUMERIC(12, 2) DEFAULT 10 CHECK (critical_level >= 0),
  unit TEXT NOT NULL, -- 'kg', 'adet', 'litre', 'metre', vb.
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_materials_code ON raw_materials(code);
CREATE INDEX idx_raw_materials_barcode ON raw_materials(barcode) WHERE barcode IS NOT NULL;
```

---

### 3. semi_finished_products (Yarı Mamuller)

```sql
CREATE TABLE semi_finished_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity NUMERIC(12, 2) DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (reserved_quantity >= 0),
  critical_level NUMERIC(12, 2) DEFAULT 5 CHECK (critical_level >= 0),
  unit TEXT NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_semi_finished_code ON semi_finished_products(code);
CREATE INDEX idx_semi_finished_barcode ON semi_finished_products(barcode) WHERE barcode IS NOT NULL;
```

---

### 4. finished_products (Nihai Ürünler)

```sql
CREATE TABLE finished_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  quantity NUMERIC(12, 2) DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (reserved_quantity >= 0),
  critical_level NUMERIC(12, 2) DEFAULT 5 CHECK (critical_level >= 0),
  unit TEXT NOT NULL,
  sale_price NUMERIC(12, 2) NOT NULL CHECK (sale_price >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finished_code ON finished_products(code);
CREATE INDEX idx_finished_barcode ON finished_products(barcode) WHERE barcode IS NOT NULL;
```

---

### 5. price_history (Fiyat Geçmişi)

**Açıklama:** Hammadde ve yarı mamul fiyat değişiklikleri (yıllık ortalama hesabı için)

```sql
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_price_history_material ON price_history(material_type, material_id);
CREATE INDEX idx_price_history_date ON price_history(effective_date);
```

**Trigger:** Hammadde/yarı mamul fiyat güncellendiğinde otomatik kayıt

```sql
CREATE OR REPLACE FUNCTION log_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.unit_price != NEW.unit_price) OR
     (TG_OP = 'UPDATE' AND OLD.unit_cost != NEW.unit_cost) THEN
    INSERT INTO price_history (material_type, material_id, price, effective_date)
    VALUES (
      CASE WHEN TG_TABLE_NAME = 'raw_materials' THEN 'raw' ELSE 'semi' END,
      NEW.id,
      COALESCE(NEW.unit_price, NEW.unit_cost),
      CURRENT_DATE
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_raw_price_change
AFTER UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION log_price_change();

CREATE TRIGGER trigger_semi_price_change
AFTER UPDATE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION log_price_change();
```

---

### 6. bom (Bill of Materials - Ürün Ağacı)

**Açıklama:** Bir nihai ürünü üretmek için gerekli malzemeler

```sql
CREATE TABLE bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_id UUID NOT NULL REFERENCES finished_products(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  quantity_needed NUMERIC(12, 2) NOT NULL CHECK (quantity_needed > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(finished_product_id, material_type, material_id)
);

CREATE INDEX idx_bom_product ON bom(finished_product_id);
CREATE INDEX idx_bom_material ON bom(material_type, material_id);
```

---

### 7. orders (Siparişler)

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES finished_products(id),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  delivery_date DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('dusuk', 'orta', 'yuksek')),
  status TEXT NOT NULL DEFAULT 'beklemede' CHECK (status IN ('beklemede', 'uretimde', 'tamamlandi')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_number ON orders(order_number);
```

---

### 8. production_plans (Üretim Planları)

```sql
CREATE TABLE production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES finished_products(id),
  planned_quantity NUMERIC(12, 2) NOT NULL CHECK (planned_quantity > 0),
  produced_quantity NUMERIC(12, 2) DEFAULT 0 CHECK (produced_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'planlandi' CHECK (status IN ('planlandi', 'devam_ediyor', 'duraklatildi', 'tamamlandi', 'iptal_edildi')),
  assigned_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_production_plans_order ON production_plans(order_id);
CREATE INDEX idx_production_plans_status ON production_plans(status);
CREATE INDEX idx_production_plans_operator ON production_plans(assigned_operator_id);
```

---

### 9. operators (Operatör Bilgileri)

**Açıklama:** users tablosunun operatör rolü için extended bilgiler

```sql
CREATE TABLE operators (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  series TEXT NOT NULL CHECK (series IN ('thunder', 'thunder_pro')),
  experience_years INTEGER DEFAULT 0 CHECK (experience_years >= 0),
  daily_capacity NUMERIC(8, 2) NOT NULL CHECK (daily_capacity > 0),
  location TEXT NOT NULL,
  hourly_rate NUMERIC(8, 2) NOT NULL CHECK (hourly_rate > 0),
  active_productions_count INTEGER DEFAULT 0 CHECK (active_productions_count >= 0)
);

CREATE INDEX idx_operators_series ON operators(series);
```

**Seed Data:**
- Thunder Operatör: series='thunder', capacity=46, location='Üretim Salonu A', rate=25
- ThunderPro Operatör: series='thunder_pro', capacity=46, location='Üretim Salonu B', rate=25

---

### 10. production_logs (Üretim Kayıtları)

**Açıklama:** Her barkod okutma kaydedilir

```sql
CREATE TABLE production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES users(id),
  barcode_scanned TEXT NOT NULL,
  quantity_produced NUMERIC(12, 2) NOT NULL CHECK (quantity_produced > 0),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_production_logs_plan ON production_logs(plan_id);
CREATE INDEX idx_production_logs_operator ON production_logs(operator_id);
CREATE INDEX idx_production_logs_timestamp ON production_logs(timestamp);
```

---

### 11. stock_movements (Stok Hareketleri)

```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('giris', 'cikis', 'uretim', 'sayim')),
  quantity NUMERIC(12, 2) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_material ON stock_movements(material_type, material_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
```

**Movement Types:**
- `giris`: Manuel stok girişi
- `cikis`: Manuel stok çıkışı
- `uretim`: Üretim sırasında otomatik stok hareketi (barkod okutma)
- `sayim`: Envanter sayımı sonrası fark düzeltmesi

---

### 12. material_reservations (Malzeme Rezervasyonları)

**Açıklama:** Soft rezervasyon mekanizması - Sipariş onaylandığında malzemeler rezerve edilir

```sql
CREATE TABLE material_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  reserved_quantity NUMERIC(12, 2) NOT NULL CHECK (reserved_quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reservations_order ON material_reservations(order_id);
CREATE INDEX idx_reservations_material ON material_reservations(material_type, material_id);
```

---

### 13. production_plan_bom_snapshot (BOM Snapshot)

**Açıklama:** Sipariş onaylandığında BOM'un anlık görüntüsü (değişikliklere karşı koruma)

```sql
CREATE TABLE production_plan_bom_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES production_plans(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  material_code TEXT NOT NULL,
  material_name TEXT NOT NULL,
  quantity_needed NUMERIC(12, 2) NOT NULL CHECK (quantity_needed > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bom_snapshot_plan ON production_plan_bom_snapshot(plan_id);
CREATE INDEX idx_bom_snapshot_material ON production_plan_bom_snapshot(material_type, material_id);
```

---

### 14. notifications (Bildirimler)

**Açıklama:** Sistem bildirimleri (kritik stok, üretim gecikmeleri, vb.)

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('critical_stock', 'production_delay', 'order_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  material_type TEXT CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_read BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES users(id), -- NULL = tüm planlama personeline
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

---

### 15. audit_logs (İşlem Geçmişi)

**Açıklama:** Tüm kritik işlemlerin log kaydı (Kim, ne zaman, neyi değiştirdi)

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
```

**Loglanacak Tablolar:**
- `raw_materials`, `semi_finished_products`, `finished_products` (Stok)
- `orders`, `production_plans` (Üretim)
- `users` (Kullanıcı yönetimi)
- `bom` (Ürün ağacı)

---

### 16. system_settings (Sistem Ayarları)

**Açıklama:** Dinamik sistem konfigürasyonu

```sql
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan ayarlar
INSERT INTO system_settings (key, value, description) VALUES
  ('default_operator_password', '123456', 'Yeni operatörler için varsayılan şifre'),
  ('order_number_prefix', 'ORD', 'Sipariş numarası öneki'),
  ('default_critical_level_raw', '10', 'Hammadde varsayılan kritik seviye'),
  ('default_critical_level_semi', '5', 'Yarı mamul varsayılan kritik seviye'),
  ('default_critical_level_finished', '5', 'Nihai ürün varsayılan kritik seviye'),
  ('enable_auto_operator_assign', 'false', 'Otomatik operatör ataması aktif mi'),
  ('pagination_default_limit', '50', 'Varsayılan sayfa başı kayıt sayısı');
```

---

## Sequences & Auto-Generation

### 1. Sipariş Numarası Otomatik Üretimi

```sql
CREATE SEQUENCE order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  year TEXT;
  seq_num TEXT;
BEGIN
  -- Prefix'i ayarlardan al
  SELECT value INTO prefix FROM system_settings WHERE key = 'order_number_prefix';
  
  -- Yıl ve sıra numarası
  year := TO_CHAR(NOW(), 'YYYY');
  seq_num := LPAD(nextval('order_number_seq')::TEXT, 3, '0');
  
  RETURN prefix || '-' || year || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;

-- Sipariş oluştururken otomatik kullanım
-- INSERT INTO orders (order_number, ...) VALUES (generate_order_number(), ...)
```

---

## Triggers & Functions

### 1. Auto-update updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Her tabloya trigger ekle
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_raw_materials_updated_at BEFORE UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_semi_finished_updated_at BEFORE UPDATE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_finished_updated_at BEFORE UPDATE ON finished_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_production_plans_updated_at BEFORE UPDATE ON production_plans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 2. Auto-update Stock on Production Log

```sql
CREATE OR REPLACE FUNCTION update_stock_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
BEGIN
  -- Plan'dan product_id al
  SELECT product_id INTO v_product_id
  FROM production_plans
  WHERE id = NEW.plan_id;
  
  -- Nihai ürün stokunu artır
  UPDATE finished_products
  SET quantity = quantity + NEW.quantity_produced
  WHERE id = v_product_id;
  
  -- Stok hareketi kaydet
  INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
  VALUES ('finished', v_product_id, 'uretim', NEW.quantity_produced, NEW.operator_id, 
          'Üretim kaydı: Plan #' || NEW.plan_id);
  
  -- Production plan'daki produced_quantity güncelle
  UPDATE production_plans
  SET produced_quantity = produced_quantity + NEW.quantity_produced
  WHERE id = NEW.plan_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_production_log_stock
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION update_stock_on_production();
```

### 3. Auto-consume Materials on Production (BOM-based)

```sql
CREATE OR REPLACE FUNCTION consume_materials_on_production()
RETURNS TRIGGER AS $$
DECLARE
  v_bom_record RECORD;
BEGIN
  -- BOM snapshot'tan tüm malzemeleri al ve stokları azalt
  FOR v_bom_record IN
    SELECT material_type, material_id, material_code, material_name, quantity_needed
    FROM production_plan_bom_snapshot
    WHERE plan_id = NEW.plan_id
  LOOP
    IF v_bom_record.material_type = 'raw' THEN
      -- Hammadde stok azalt
      UPDATE raw_materials
      SET quantity = quantity - (v_bom_record.quantity_needed * NEW.quantity_produced / 
        (SELECT planned_quantity FROM production_plans WHERE id = NEW.plan_id))
      WHERE id = v_bom_record.material_id;
      
      -- Negatif stock movement kaydet
      INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
      VALUES (
        'raw',
        v_bom_record.material_id,
        'uretim',
        -(v_bom_record.quantity_needed * NEW.quantity_produced / 
          (SELECT planned_quantity FROM production_plans WHERE id = NEW.plan_id)),
        NEW.operator_id,
        format('Üretim tüketimi: %s adet %s için', NEW.quantity_produced, 
          (SELECT fp.name FROM production_plans pp 
           JOIN finished_products fp ON pp.product_id = fp.id 
           WHERE pp.id = NEW.plan_id))
      );
    ELSIF v_bom_record.material_type = 'semi' THEN
      -- Yarı mamul stok azalt
      UPDATE semi_finished_products
      SET quantity = quantity - (v_bom_record.quantity_needed * NEW.quantity_produced / 
        (SELECT planned_quantity FROM production_plans WHERE id = NEW.plan_id))
      WHERE id = v_bom_record.material_id;
      
      -- Negatif stock movement kaydet
      INSERT INTO stock_movements (material_type, material_id, movement_type, quantity, user_id, description)
      VALUES (
        'semi',
        v_bom_record.material_id,
        'uretim',
        -(v_bom_record.quantity_needed * NEW.quantity_produced / 
          (SELECT planned_quantity FROM production_plans WHERE id = NEW.plan_id)),
        NEW.operator_id,
        format('Üretim tüketimi: %s adet için', NEW.quantity_produced)
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_consume_materials
AFTER INSERT ON production_logs
FOR EACH ROW EXECUTE FUNCTION consume_materials_on_production();
```

### 4. Auto-update Operator Active Productions Count

```sql
CREATE OR REPLACE FUNCTION update_operator_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.assigned_operator_id IS NOT NULL THEN
    UPDATE operators
    SET active_productions_count = active_productions_count + 1
    WHERE id = NEW.assigned_operator_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Tamamlanan veya iptal edilen planlar için sayaç azalt
    IF OLD.status NOT IN ('tamamlandi', 'iptal_edildi') 
       AND NEW.status IN ('tamamlandi', 'iptal_edildi') 
       AND NEW.assigned_operator_id IS NOT NULL THEN
      UPDATE operators
      SET active_productions_count = active_productions_count - 1
      WHERE id = NEW.assigned_operator_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_operator_count
AFTER INSERT OR UPDATE ON production_plans
FOR EACH ROW EXECUTE FUNCTION update_operator_count();
```

### 4. Check Critical Stock Level & Create Notification

```sql
CREATE OR REPLACE FUNCTION check_critical_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_material_name TEXT;
  v_material_code TEXT;
  v_critical_level NUMERIC;
  v_current_quantity NUMERIC;
BEGIN
  -- Malzeme bilgilerini al
  IF TG_TABLE_NAME = 'raw_materials' THEN
    SELECT name, code, critical_level, quantity INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM raw_materials WHERE id = NEW.id;
  ELSIF TG_TABLE_NAME = 'semi_finished_products' THEN
    SELECT name, code, critical_level, quantity INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM semi_finished_products WHERE id = NEW.id;
  ELSIF TG_TABLE_NAME = 'finished_products' THEN
    SELECT name, code, critical_level, quantity INTO v_material_name, v_material_code, v_critical_level, v_current_quantity
    FROM finished_products WHERE id = NEW.id;
  END IF;

  -- Kritik seviyenin altındaysa bildirim oluştur
  IF v_current_quantity <= v_critical_level THEN
    -- Aynı malzeme için okunmamış bildirim var mı kontrol et
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE material_id = NEW.id 
        AND type = 'critical_stock' 
        AND is_read = FALSE
    ) THEN
      INSERT INTO notifications (type, title, message, material_type, material_id, severity)
      VALUES (
        'critical_stock',
        'Kritik Stok Seviyesi',
        format('Malzeme: %s (%s) - Mevcut: %s - Kritik Seviye: %s', 
          v_material_name, v_material_code, v_current_quantity, v_critical_level),
        CASE 
          WHEN TG_TABLE_NAME = 'raw_materials' THEN 'raw'
          WHEN TG_TABLE_NAME = 'semi_finished_products' THEN 'semi'
          ELSE 'finished'
        END,
        NEW.id,
        'high'
      );
    END IF;
  ELSE
    -- Stok kritik seviyenin üzerine çıktıysa bildirimleri kapat
    UPDATE notifications
    SET is_read = TRUE
    WHERE material_id = NEW.id 
      AND type = 'critical_stock' 
      AND is_read = FALSE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_raw_critical_stock
AFTER UPDATE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();

CREATE TRIGGER trigger_semi_critical_stock
AFTER UPDATE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();

CREATE TRIGGER trigger_finished_critical_stock
AFTER UPDATE ON finished_products
FOR EACH ROW EXECUTE FUNCTION check_critical_stock();
```

### 5. Auto-create BOM Snapshot on Plan Creation

```sql
CREATE OR REPLACE FUNCTION create_bom_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- BOM tablosundaki kayıtları snapshot tablosuna kopyala
  INSERT INTO production_plan_bom_snapshot (
    plan_id, material_type, material_id, material_code, material_name, quantity_needed
  )
  SELECT 
    NEW.id,
    bom.material_type,
    bom.material_id,
    CASE 
      WHEN bom.material_type = 'raw' THEN rm.code
      ELSE sfp.code
    END,
    CASE 
      WHEN bom.material_type = 'raw' THEN rm.name
      ELSE sfp.name
    END,
    bom.quantity_needed * NEW.planned_quantity
  FROM bom
  LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
  LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
  WHERE bom.finished_product_id = NEW.product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_bom_snapshot
AFTER INSERT ON production_plans
FOR EACH ROW EXECUTE FUNCTION create_bom_snapshot();
```

### 6. Generic Audit Log Trigger

```sql
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Kullanıcı ID'sini context'ten al (middleware tarafından set edilir)
  v_user_id := current_setting('app.current_user_id', TRUE)::UUID;
  
  IF TG_OP = 'DELETE' THEN
    v_old_values := to_jsonb(OLD);
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
    VALUES (v_user_id, 'DELETE', TG_TABLE_NAME, OLD.id, v_old_values);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_values := to_jsonb(OLD);
    v_new_values := to_jsonb(NEW);
    INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
    VALUES (v_user_id, 'UPDATE', TG_TABLE_NAME, NEW.id, v_old_values, v_new_values);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new_values := to_jsonb(NEW);
    INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
    VALUES (v_user_id, 'CREATE', TG_TABLE_NAME, NEW.id, v_new_values);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Kritik tablolara audit trigger ekle
CREATE TRIGGER trigger_audit_raw_materials
AFTER INSERT OR UPDATE OR DELETE ON raw_materials
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_semi_finished
AFTER INSERT OR UPDATE OR DELETE ON semi_finished_products
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_finished
AFTER INSERT OR UPDATE OR DELETE ON finished_products
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_production_plans
AFTER INSERT OR UPDATE OR DELETE ON production_plans
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_bom
AFTER INSERT OR UPDATE OR DELETE ON bom
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trigger_audit_users
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();
```

### 7. Check Stock Availability (BOM-based)

```sql
CREATE OR REPLACE FUNCTION check_stock_availability(
  p_product_id UUID,
  p_quantity NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_bom_record RECORD;
  v_available NUMERIC;
  v_needed NUMERIC;
  v_missing_materials JSON[] := ARRAY[]::JSON[];
BEGIN
  -- BOM'daki her malzeme için stok kontrolü
  FOR v_bom_record IN
    SELECT 
      bom.material_type,
      bom.material_id,
      bom.quantity_needed,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.code
        ELSE sfp.code
      END as material_code,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.name
        ELSE sfp.name
      END as material_name,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.quantity - rm.reserved_quantity
        ELSE sfp.quantity - sfp.reserved_quantity
      END as available_quantity,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.quantity
        ELSE sfp.quantity
      END as total_quantity,
      CASE 
        WHEN bom.material_type = 'raw' THEN rm.reserved_quantity
        ELSE sfp.reserved_quantity
      END as reserved_quantity
    FROM bom
    LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
    LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
    WHERE bom.finished_product_id = p_product_id
  LOOP
    v_needed := v_bom_record.quantity_needed * p_quantity;
    
    IF v_bom_record.available_quantity < v_needed THEN
      -- Eksik malzeme var
      v_missing_materials := array_append(
        v_missing_materials,
        json_build_object(
          'material_type', v_bom_record.material_type,
          'material_code', v_bom_record.material_code,
          'material_name', v_bom_record.material_name,
          'needed', v_needed,
          'available', v_bom_record.available_quantity,
          'total', v_bom_record.total_quantity,
          'reserved', v_bom_record.reserved_quantity,
          'missing', v_needed - v_bom_record.available_quantity
        )::JSON
      );
    END IF;
  END LOOP;
  
  -- Eksik malzeme varsa JSON döndür, yoksa NULL
  IF array_length(v_missing_materials, 1) > 0 THEN
    RETURN json_build_object('missing_materials', to_json(v_missing_materials));
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 8. Create Material Reservations

```sql
CREATE OR REPLACE FUNCTION create_material_reservations(
  p_order_id UUID,
  p_product_id UUID,
  p_quantity NUMERIC
)
RETURNS VOID AS $$
DECLARE
  v_bom_record RECORD;
  v_needed NUMERIC;
BEGIN
  -- BOM'daki her malzeme için rezervasyon oluştur
  FOR v_bom_record IN
    SELECT material_type, material_id, quantity_needed
    FROM bom
    WHERE finished_product_id = p_product_id
  LOOP
    v_needed := v_bom_record.quantity_needed * p_quantity;
    
    -- Rezervasyon kaydı oluştur
    INSERT INTO material_reservations (order_id, material_type, material_id, reserved_quantity)
    VALUES (p_order_id, v_bom_record.material_type, v_bom_record.material_id, v_needed);
    
    -- İlgili malzemenin reserved_quantity'sini artır
    IF v_bom_record.material_type = 'raw' THEN
      UPDATE raw_materials
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom_record.material_id;
    ELSIF v_bom_record.material_type = 'semi' THEN
      UPDATE semi_finished_products
      SET reserved_quantity = reserved_quantity + v_needed
      WHERE id = v_bom_record.material_id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 9. Release Material Reservations (Trigger)

```sql
CREATE OR REPLACE FUNCTION release_reservations_on_plan_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('iptal_edildi', 'tamamlandi') AND OLD.status NOT IN ('iptal_edildi', 'tamamlandi') THEN
    -- Rezervasyonları geri al
    UPDATE raw_materials rm
    SET reserved_quantity = reserved_quantity - mr.reserved_quantity
    FROM material_reservations mr
    WHERE mr.order_id = NEW.order_id
      AND mr.material_type = 'raw'
      AND mr.material_id = rm.id;
    
    UPDATE semi_finished_products sfp
    SET reserved_quantity = reserved_quantity - mr.reserved_quantity
    FROM material_reservations mr
    WHERE mr.order_id = NEW.order_id
      AND mr.material_type = 'semi'
      AND mr.material_id = sfp.id;
    
    -- Rezervasyon kayıtlarını sil
    DELETE FROM material_reservations WHERE order_id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_release_reservations
AFTER UPDATE ON production_plans
FOR EACH ROW EXECUTE FUNCTION release_reservations_on_plan_cancel();
```

### 10. Set User Context (for Audit Logs)

```sql
CREATE OR REPLACE FUNCTION set_user_context(user_id UUID)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id::TEXT, TRUE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 11. Approve Order Transaction (Complete Workflow)

```sql
CREATE OR REPLACE FUNCTION approve_order_transaction(
  p_order_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_product_id UUID;
  v_quantity NUMERIC;
  v_plan_id UUID;
  v_missing_materials JSON;
BEGIN
  -- User context set et (audit log için)
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  -- Sipariş bilgilerini al
  SELECT product_id, quantity INTO v_product_id, v_quantity
  FROM orders WHERE id = p_order_id;
  
  IF v_product_id IS NULL THEN
    RETURN json_build_object('success', FALSE, 'error', 'Order not found');
  END IF;
  
  -- BOM kontrolü ve stok kontrolü
  SELECT check_stock_availability(v_product_id, v_quantity) INTO v_missing_materials;
  
  IF v_missing_materials IS NOT NULL THEN
    RETURN json_build_object('success', FALSE, 'missing_materials', v_missing_materials);
  END IF;
  
  -- Production plan oluştur (BOM snapshot otomatik oluşturulacak - trigger)
  INSERT INTO production_plans (order_id, product_id, planned_quantity)
  VALUES (p_order_id, v_product_id, v_quantity)
  RETURNING id INTO v_plan_id;
  
  -- Rezervasyonları oluştur
  PERFORM create_material_reservations(p_order_id, v_product_id, v_quantity);
  
  -- Sipariş status güncelle
  UPDATE orders SET status = 'uretimde' WHERE id = p_order_id;
  
  RETURN json_build_object('success', TRUE, 'plan_id', v_plan_id);
EXCEPTION
  WHEN OTHERS THEN
    -- Hata durumunda rollback (automatic)
    RETURN json_build_object('success', FALSE, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;
```

### 12. Bulk Import Raw Materials (Transaction)

```sql
CREATE OR REPLACE FUNCTION bulk_import_raw_materials(
  p_materials JSONB,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_material JSONB;
  v_count INTEGER := 0;
BEGIN
  -- User context set
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  -- Her malzeme için insert
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
  LOOP
    INSERT INTO raw_materials (code, name, barcode, quantity, unit, unit_price, critical_level, description)
    VALUES (
      v_material->>'code',
      v_material->>'name',
      v_material->>'barcode',
      (v_material->>'quantity')::NUMERIC,
      v_material->>'unit',
      (v_material->>'unit_price')::NUMERIC,
      COALESCE((v_material->>'critical_level')::NUMERIC, 10),
      v_material->>'description'
    )
    ON CONFLICT (code) DO UPDATE
    SET 
      quantity = EXCLUDED.quantity,
      unit_price = EXCLUDED.unit_price,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

### 13. Bulk Import Semi-Finished Products

```sql
CREATE OR REPLACE FUNCTION bulk_import_semi_finished(
  p_materials JSONB,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_material JSONB;
  v_count INTEGER := 0;
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
  LOOP
    INSERT INTO semi_finished_products (code, name, barcode, quantity, unit, unit_cost, critical_level, description)
    VALUES (
      v_material->>'code',
      v_material->>'name',
      v_material->>'barcode',
      (v_material->>'quantity')::NUMERIC,
      v_material->>'unit',
      (v_material->>'unit_cost')::NUMERIC,
      COALESCE((v_material->>'critical_level')::NUMERIC, 5),
      v_material->>'description'
    )
    ON CONFLICT (code) DO UPDATE
    SET 
      quantity = EXCLUDED.quantity,
      unit_cost = EXCLUDED.unit_cost,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

### 14. Bulk Import Finished Products

```sql
CREATE OR REPLACE FUNCTION bulk_import_finished(
  p_materials JSONB,
  p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_material JSONB;
  v_count INTEGER := 0;
BEGIN
  PERFORM set_config('app.current_user_id', p_user_id::TEXT, TRUE);
  
  FOR v_material IN SELECT * FROM jsonb_array_elements(p_materials)
  LOOP
    INSERT INTO finished_products (code, name, barcode, quantity, unit, sale_price, critical_level, description)
    VALUES (
      v_material->>'code',
      v_material->>'name',
      v_material->>'barcode',
      (v_material->>'quantity')::NUMERIC,
      v_material->>'unit',
      (v_material->>'sale_price')::NUMERIC,
      COALESCE((v_material->>'critical_level')::NUMERIC, 5),
      v_material->>'description'
    )
    ON CONFLICT (code) DO UPDATE
    SET 
      quantity = EXCLUDED.quantity,
      sale_price = EXCLUDED.sale_price,
      updated_at = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Transaction Management (API Layer)

**Not:** Aşağıdaki işlemler mutlaka database transaction içinde yapılmalı:

### 1. Sipariş Onaylama
```sql
BEGIN;
  -- 1. BOM snapshot oluştur
  -- 2. Stok kontrolü yap
  -- 3. Rezervasyonları oluştur
  -- 4. Production plan oluştur
  -- 5. Sipariş status güncelle
COMMIT; -- Hata varsa ROLLBACK
```

### 2. Excel Import
```sql
BEGIN;
  -- Tüm satırları işle
  -- Hatalı olanları logla, geçerlileri ekle
COMMIT;
```

### 3. Production Plan İptal
```sql
BEGIN;
  -- 1. Rezervasyonları iptal et
  -- 2. Plan status güncelle
  -- 3. Sipariş status güncelle
COMMIT;
```

---

## Views (Kullanışlı Sorgular)

### 1. Yıllık Ortalama Fiyatlar

```sql
CREATE VIEW v_yearly_average_prices AS
SELECT
  material_type,
  material_id,
  AVG(price) as avg_price,
  COUNT(*) as price_change_count
FROM price_history
WHERE effective_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY material_type, material_id;
```

### 2. Stok Toplam Değerleri

```sql
CREATE VIEW v_stock_values AS
SELECT
  'raw' as material_type,
  SUM(quantity * unit_price) as total_value
FROM raw_materials
UNION ALL
SELECT
  'semi' as material_type,
  SUM(quantity * unit_cost) as total_value
FROM semi_finished_products
UNION ALL
SELECT
  'finished' as material_type,
  SUM(quantity * sale_price) as total_value
FROM finished_products;
```

### 3. Aktif Üretim İstatistikleri

```sql
CREATE VIEW v_active_production_stats AS
SELECT
  COUNT(*) as total_active_productions,
  COUNT(DISTINCT assigned_operator_id) as active_operators,
  SUM(planned_quantity - produced_quantity) as remaining_quantity
FROM production_plans
WHERE status IN ('planlandi', 'devam_ediyor');
```

---

## Supabase Realtime Aktivasyonu

**Not:** Realtime özelliklerin çalışması için tablolar publication'a eklenmeli

```sql
-- Realtime için publication'a tabloları ekle
ALTER PUBLICATION supabase_realtime ADD TABLE production_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE production_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE raw_materials;
ALTER PUBLICATION supabase_realtime ADD TABLE semi_finished_products;
ALTER PUBLICATION supabase_realtime ADD TABLE finished_products;
```

---

## Seed Data (Initial Setup)

**Not:** İlk kurulumda test verileri

```sql
-- 1. Kullanıcılar (şifreler bcrypt hash'lenmiş)
-- Admin123! -> $2a$10$rKz8VqK9mYZ8qN9.X9QxXO5J5vX5vX5vX5vX5vX5vX5vX5vX5vX5v
-- Plan123!  -> $2a$10$pL9AnN1nG.pL9AnN1nG.pL9AnN1nG.pL9AnN1nG.pL9AnN1nG.pL9A
-- Depo123!  -> $2a$10$dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE
-- 123456    -> $2a$10$oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP

INSERT INTO users (id, email, password_hash, name, role, is_active) VALUES
  (gen_random_uuid(), 'admin@thunder.com', '$2a$10$rKz8VqK9mYZ8qN9.X9QxXO5J5vX5vX5vX5vX5vX5vX5vX5vX5vX5v', 'Admin User', 'yonetici', TRUE),
  (gen_random_uuid(), 'planlama@thunder.com', '$2a$10$pL9AnN1nG.pL9AnN1nG.pL9AnN1nG.pL9AnN1nG.pL9AnN1nG.pL9A', 'Planlama User', 'planlama', TRUE),
  (gen_random_uuid(), 'depo@thunder.com', '$2a$10$dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE9P0.dE', 'Depo User', 'depo', TRUE),
  ('11111111-1111-1111-1111-111111111111', 'operator1@thunder.com', '$2a$10$oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP', 'Thunder Operatör', 'operator', TRUE),
  ('22222222-2222-2222-2222-222222222222', 'operator2@thunder.com', '$2a$10$oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP3R4t0R.oP', 'ThunderPro Operatör', 'operator', TRUE);

-- 2. Operatör bilgileri
INSERT INTO operators (id, series, experience_years, daily_capacity, location, hourly_rate, active_productions_count) VALUES
  ('11111111-1111-1111-1111-111111111111', 'thunder', 5, 46, 'Üretim Salonu A', 25, 0),
  ('22222222-2222-2222-2222-222222222222', 'thunder_pro', 5, 46, 'Üretim Salonu B', 25, 0);

-- 3. Örnek hammaddeler
INSERT INTO raw_materials (code, name, barcode, quantity, unit, unit_price, critical_level, description) VALUES
  ('HM-001', 'Çelik Sac 2mm', '1234567890001', 500, 'kg', 50.00, 100, 'Galvaniz çelik sac 2mm'),
  ('HM-002', 'Alüminyum Profil', '1234567890002', 200, 'metre', 75.00, 50, 'Alüminyum profil 40x40'),
  ('HM-003', 'Vida M8', '1234567890003', 10000, 'adet', 0.50, 1000, 'Paslanmaz çelik vida M8');

-- 4. Örnek yarı mamuller
INSERT INTO semi_finished_products (code, name, barcode, quantity, unit, unit_cost, critical_level, description) VALUES
  ('YM-001', 'Plaka A', '2234567890001', 100, 'adet', 120.00, 20, 'İşlenmiş çelik plaka'),
  ('YM-002', 'Gövde B', '2234567890002', 50, 'adet', 200.00, 10, 'Kaynaklı gövde parçası');

-- 5. Örnek nihai ürünler
INSERT INTO finished_products (code, name, barcode, quantity, unit, sale_price, critical_level, description) VALUES
  ('NU-001', 'Ürün X Model A', '3234567890001', 25, 'adet', 500.00, 5, 'Thunder ERP Ürün X'),
  ('NU-002', 'Ürün Y Model B', '3234567890002', 15, 'adet', 750.00, 3, 'ThunderPro Ürün Y');

-- 6. Örnek BOM (Ürün Ağacı)
-- NU-001 için: 10 kg HM-001 + 2 adet YM-001
INSERT INTO bom (finished_product_id, material_type, material_id, quantity_needed)
SELECT 
  fp.id,
  'raw',
  rm.id,
  10
FROM finished_products fp, raw_materials rm
WHERE fp.code = 'NU-001' AND rm.code = 'HM-001';

INSERT INTO bom (finished_product_id, material_type, material_id, quantity_needed)
SELECT 
  fp.id,
  'semi',
  sfp.id,
  2
FROM finished_products fp, semi_finished_products sfp
WHERE fp.code = 'NU-001' AND sfp.code = 'YM-001';

-- 7. System settings (zaten yukarıda INSERT edildi, burası optional additional settings)
INSERT INTO system_settings (key, value, description) VALUES
  ('company_name', 'Thunder ERP', 'Şirket adı'),
  ('max_file_upload_size_mb', '10', 'Maksimum dosya yükleme boyutu (MB)')
ON CONFLICT (key) DO NOTHING;
```

---

## Row Level Security (RLS) - Opsiyonel

**Not:** Custom JWT kullanıldığı için RLS şimdilik uygulanmayacak, ama gelecekte eklenebilir.

```sql
-- Örnek: Operatörler sadece kendi planlarını görebilir
ALTER TABLE production_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators see only their plans"
ON production_plans FOR SELECT
USING (
  auth.jwt() ->> 'role' = 'operator' AND
  assigned_operator_id = (auth.jwt() ->> 'userId')::UUID
);
```

