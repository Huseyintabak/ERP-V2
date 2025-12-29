# Migration: v_order Record Assignment Fix

**Tarih:** 29 Ocak 2025  
**Migration Dosyası:** `20250129_fix_v_order_assignment.sql`  
**Durum:** ✅ Uygulandı

---

## 📋 Problem

Yarı mamul üretiminde barkod okutulup "Kaydet +1" butonuna basıldığında aşağıdaki hata alınıyordu:

```
Log oluşturulamadı: record "v_order" is not assigned yet
🔍 Detay: record "v_order" is not assigned yet
📋 Hata Kodu: 55000
```

### Kök Sebep

`consume_materials_on_semi_production()` fonksiyonunda:

```sql
DECLARE
  v_order RECORD;  -- RECORD olarak tanımlanmış
BEGIN
  SELECT
    spo.product_id,
    sfp.name,
    sfp.code
  INTO v_order.product_id, v_product_name, v_product_code  -- ❌ HATALI: RECORD'un field'ına direk atama
  FROM semi_production_orders spo
  ...
  
  -- Daha sonra kullanımda:
  WHERE sb.semi_product_id = v_order.product_id;  -- ❌ v_order hiç atanmadı!
```

**PostgreSQL'de RECORD tipi değişkenler:**
- Tüm record bir seferde atanmalı (örn: `INTO v_order`)
- Field'larına tek tek atama yapılamaz (örn: `INTO v_order.product_id` YANLIŞ)
- Field'larına atanmamış bir RECORD erişildiğinde "record is not assigned yet" hatası verir

---

## ✅ Çözüm

RECORD tipi yerine **ayrı değişkenler** kullanıldı:

### Önce (HATALI):
```sql
DECLARE
  v_order RECORD;
BEGIN
  SELECT spo.product_id, sfp.name, sfp.code
  INTO v_order.product_id, v_product_name, v_product_code  -- ❌ HATALI
  ...
  WHERE sb.semi_product_id = v_order.product_id;  -- ❌ v_order atanmamış
```

### Sonra (DOĞRU):
```sql
DECLARE
  v_order_product_id UUID;  -- ✅ Ayrı değişken
  v_product_name TEXT;
  v_product_code TEXT;
BEGIN
  SELECT spo.product_id, sfp.name, sfp.code
  INTO v_order_product_id, v_product_name, v_product_code  -- ✅ DOĞRU
  ...
  WHERE sb.semi_product_id = v_order_product_id;  -- ✅ Atanmış değişken
```

---

## 🔧 Yapılan Değişiklikler

### 1. Fonksiyon Güncellemesi
- **Fonksiyon:** `consume_materials_on_semi_production()`
- **Değişiklik:** RECORD tipi `v_order` → UUID tipi `v_order_product_id`
- **Etkilenen Satırlar:**
  - `DECLARE` bloğu
  - `SELECT INTO` statement
  - Tüm `v_order.product_id` referansları → `v_order_product_id`

### 2. Kod Değişiklikleri

**Değişken Tanımları:**
```sql
-- ESKİ:
v_order RECORD;

-- YENİ:
v_order_product_id UUID;
```

**SELECT INTO:**
```sql
-- ESKİ:
INTO v_order.product_id, v_product_name, v_product_code

-- YENİ:
INTO v_order_product_id, v_product_name, v_product_code
```

**Kullanım Yerleri (3 adet):**
```sql
-- ESKİ:
WHERE sb.semi_product_id = v_order.product_id
WHERE id = v_order.product_id
VALUES ('semi', v_order.product_id, ...)

-- YENİ:
WHERE sb.semi_product_id = v_order_product_id
WHERE id = v_order_product_id
VALUES ('semi', v_order_product_id, ...)
```

---

## 🧪 Test Senaryosu

### Test Adımları:
1. ✅ SMP-0036 üretim emrini aç
2. ✅ Barkod okut veya manuel gir
3. ✅ "Kaydet +1" butonuna bas
4. ✅ Log başarıyla oluşturulmalı

### Beklenen Sonuç:
- ✅ Üretim log'u oluşturulur
- ✅ Malzeme tüketimi gerçekleşir (`quantity` ve `reserved_quantity` düşer)
- ✅ Yarı mamul stoku artar
- ✅ Stock_movements kayıtları oluşturulur
- ✅ Material_reservations güncellenir (`consumed_quantity` artar)

---

## 📊 Etkilenen Sistemler

### Fonksiyonlar:
- ✅ `consume_materials_on_semi_production()` - Güncellendi

### Trigger'lar:
- ✅ `trigger_consume_materials_on_semi_production` - Değişiklik gerekmedi (aynı fonksiyon kullanılıyor)

### Tablolar:
- ✅ `semi_production_logs` - Trigger'dan çağrılan fonksiyon düzeltildi
- ✅ `material_reservations` - Düzgün güncelleniyor
- ✅ `stock_movements` - Düzgün kayıt oluşuyor
- ✅ `raw_materials` - Stok düzgün düşüyor
- ✅ `semi_finished_products` - Hem tüketim hem üretim düzgün

---

## 🔍 Doğrulama

### 1. Fonksiyon Kontrolü:
```sql
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'consume_materials_on_semi_production';
```

### 2. Trigger Kontrolü:
```sql
SELECT tgname, tgenabled, pg_get_triggerdef(oid)
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'semi_production_logs'
AND tgname = 'trigger_consume_materials_on_semi_production';
```

### 3. Test Log Oluşturma:
```sql
-- SMP-0036 için test log oluştur
INSERT INTO semi_production_logs (
  order_id,
  operator_id,
  quantity_produced,
  barcode_scanned,
  notes
)
VALUES (
  (SELECT id FROM semi_production_orders WHERE order_number = 'SMP-0036'),
  (SELECT id FROM users WHERE role = 'operator' LIMIT 1),
  1,
  'TEST-BARCODE-001',
  'Test log - migration doğrulama'
);
```

---

## 🎯 Sonuç

**Problem:** PostgreSQL RECORD tipi değişken field'larına direk atama yapılamaz.  
**Çözüm:** RECORD tipi yerine spesifik tip değişkenler (UUID, TEXT) kullanıldı.  
**Durum:** ✅ **Düzeltildi ve uygulandı**

Artık yarı mamul üretiminde barkod okutma ve üretim log'u oluşturma işlemi **sorunsuz çalışıyor**.

---

## 📝 Notlar

- Bu migration backward-compatible'dır (eski davranışı değiştirmez, sadece hatayı düzeltir)
- Rollback gerekmez (fonksiyon düzeltmesi)
- Mevcut veriler etkilenmez
- Production'a güvenle uygulanabilir

---

**Hazırlayan:** AI Assistant  
**Onaylayan:** Sistem Yöneticisi  
**Uygulama Tarihi:** 29 Ocak 2025