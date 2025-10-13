# 🧪 Production Flow Test Senaryosu

Migration başarıyla tamamlandıktan sonra bu test senaryosunu uygulayarak sistemin doğru çalıştığından emin olun.

## 🎯 Test Hedefi

Migration sonrası sistemin tüm kritik özelliklerinin çalıştığını doğrulamak:

1. ✅ BOM snapshot mekanizması
2. ✅ Malzeme tüketimi (production_log_id ile)
3. ✅ Kritik stok bildirimleri (target_roles ile)
4. ✅ Stock movements tracking

---

## 📋 Test Adımları

### ADIM 1: Test Verilerini Kontrol Et

```sql
-- Mevcut stokları kontrol et
SELECT 'Raw Materials:' as type, code, name, quantity, critical_level 
FROM raw_materials
UNION ALL
SELECT 'Semi-Finished:', code, name, quantity, critical_level 
FROM semi_finished_products
UNION ALL
SELECT 'Finished Products:', code, name, quantity, critical_level 
FROM finished_products;
```

**Beklenen:** En az 1 finished product, 2-3 raw material olmalı

---

### ADIM 2: BOM Kontrolü

```sql
-- Finished product'ın BOM'u var mı?
SELECT 
    fp.code as product_code,
    fp.name as product_name,
    bom.material_type,
    CASE 
        WHEN bom.material_type = 'raw' THEN rm.code
        ELSE sfp.code
    END as material_code,
    CASE 
        WHEN bom.material_type = 'raw' THEN rm.name
        ELSE sfp.name
    END as material_name,
    bom.quantity_needed
FROM finished_products fp
LEFT JOIN bom ON bom.finished_product_id = fp.id
LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
ORDER BY fp.code;
```

**Beklenen:** En az 1 finished product için BOM tanımlı olmalı

---

### ADIM 3: Sipariş Oluştur (UI veya SQL)

**UI Yöntemi:**
1. Planlama kullanıcısı ile login ol
2. Üretim Yönetimi → Sipariş Ekle
3. Finished product seç
4. Miktar: 5 adet
5. Kaydet

**SQL Yöntemi:**
```sql
-- Test siparişi oluştur
INSERT INTO orders (
    customer_id,
    order_number,
    priority,
    status,
    order_items
) VALUES (
    (SELECT id FROM customers LIMIT 1),
    'TEST-001',
    'normal',
    'beklemede',
    jsonb_build_array(
        jsonb_build_object(
            'product_id', (SELECT id FROM finished_products WHERE code LIKE 'FP%' LIMIT 1),
            'product_code', (SELECT code FROM finished_products WHERE code LIKE 'FP%' LIMIT 1),
            'product_name', (SELECT name FROM finished_products WHERE code LIKE 'FP%' LIMIT 1),
            'quantity', 5,
            'unit_price', 100
        )
    )
) RETURNING id, order_number;
```

---

### ADIM 4: Siparişi Onayla (Kritik Test!)

**UI Yöntemi:**
1. Sipariş listesinde "Onayla" butonuna bas
2. Toast mesajını kontrol et

**SQL Kontrol (Onay sonrası):**
```sql
-- Production plan oluştu mu?
SELECT 
    pp.id,
    pp.status,
    pp.planned_quantity,
    fp.code as product_code,
    fp.name as product_name
FROM production_plans pp
JOIN finished_products fp ON pp.product_id = fp.id
WHERE pp.order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001');

-- BOM SNAPSHOT oluştu mu? (ÖNEMLİ!)
SELECT 
    plan_id,
    material_type,
    material_code,
    material_name,
    quantity_needed
FROM production_plan_bom_snapshot
WHERE plan_id = (
    SELECT id FROM production_plans 
    WHERE order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001')
);
```

**Beklenen:**
- ✅ production_plans: 1 kayıt, status: 'planlandi'
- ✅ production_plan_bom_snapshot: 2-3 kayıt (her malzeme için)
- ✅ Snapshot'ta quantity_needed = bom.quantity * planned_quantity

---

### ADIM 5: Operatör Ataması

**UI Yöntemi:**
1. İş Emirleri sayfasında operatör ata
2. Veya otomatik atama aktifse atlanır

**SQL Yöntemi:**
```sql
-- Operatör ata
UPDATE production_plans
SET assigned_operator_id = (SELECT id FROM operators LIMIT 1)
WHERE order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001')
RETURNING id, assigned_operator_id;
```

---

### ADIM 6: Operatör Kabul Etsin

**UI Yöntemi:**
1. Operatör olarak login ol
2. Atanan Siparişler → "Kabul Et" butonu
3. Aktif Üretimler tabına geçmeli

**SQL Kontrol:**
```sql
-- Plan status güncellenmiş mi?
SELECT status FROM production_plans
WHERE order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001');
```

**Beklenen:** status: 'devam_ediyor'

---

### ADIM 7: Barkod Okutma (ASIL TEST!)

**UI Yöntemi:**
1. Operatör dashboard → Görüntüle butonu
2. Barkod input'una finished product barkodu yaz
3. Veya Enter'a bas
4. 3 kez tekrarla (toplam 3 adet üretim)

**SQL Yöntemi (Test amaçlı):**
```sql
-- Barkod okutma simülasyonu
DO $$
DECLARE
    v_plan_id UUID;
    v_operator_id UUID;
    v_product_id UUID;
    v_barcode TEXT;
BEGIN
    -- Plan bilgilerini al
    SELECT pp.id, pp.assigned_operator_id, fp.id, fp.barcode
    INTO v_plan_id, v_operator_id, v_product_id, v_barcode
    FROM production_plans pp
    JOIN finished_products fp ON pp.product_id = fp.id
    WHERE pp.order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001');
    
    -- 3 adet üretim kaydı ekle
    FOR i IN 1..3 LOOP
        INSERT INTO production_logs (
            plan_id,
            operator_id,
            product_id,
            barcode,
            quantity_produced,
            notes
        ) VALUES (
            v_plan_id,
            v_operator_id,
            v_product_id,
            v_barcode,
            1,
            'Test üretimi #' || i
        );
        
        -- Her kayıttan sonra 1 saniye bekle (opsiyonel)
        PERFORM pg_sleep(0.1);
    END LOOP;
    
    RAISE NOTICE 'Test: 3 adet üretim kaydı oluşturuldu';
END $$;
```

---

### ADIM 8: Kritik Kontroller (Migration Başarısı!)

**1. Finished Product Stok Arttı mı?**
```sql
SELECT 
    code,
    name,
    quantity,
    'Beklenen: +3 artmış olmalı' as note
FROM finished_products
WHERE id = (
    SELECT product_id FROM production_plans 
    WHERE order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001')
);
```

**2. Raw Materials/Semi-Finished Stok Azaldı mı?**
```sql
-- Stok değişimlerini kontrol et
SELECT 
    material_type,
    material_code,
    material_name,
    quantity_needed as consumed_per_unit,
    'Her üretim için bu kadar tüketilmeli' as note
FROM production_plan_bom_snapshot
WHERE plan_id = (
    SELECT id FROM production_plans 
    WHERE order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001')
);
```

**3. Stock Movements Kayıtları VAR MI? (ÖNEMLİ!)**
```sql
-- Migration'ın başarısını gösteren asıl kanıt!
SELECT 
    sm.id,
    sm.material_type,
    sm.movement_type,
    sm.quantity,
    sm.description,
    sm.production_log_id,  -- ← BU DOLU OLMALI! (Migration ekledi)
    pl.barcode,
    pl.quantity_produced
FROM stock_movements sm
LEFT JOIN production_logs pl ON sm.production_log_id = pl.id
WHERE sm.production_log_id IS NOT NULL
ORDER BY sm.created_at DESC
LIMIT 10;
```

**BEKLENEN:**
- ✅ En az 9 kayıt (3 üretim × 3 malzeme)
- ✅ production_log_id kolonu **DOLU** olmalı
- ✅ movement_type: 'uretim'
- ✅ quantity: negatif (tüketim) veya pozitif (üretim)

---

### ADIM 9: Kritik Stok Bildirimi Testi

**Hammaddeyi kritik seviyeye düşür:**
```sql
-- Bir hammaddeyi kritik seviyenin altına çek
UPDATE raw_materials
SET quantity = critical_level - 10
WHERE code LIKE 'RM%'
LIMIT 1
RETURNING code, quantity, critical_level;
```

**Bildirim oluştu mu kontrol et:**
```sql
-- Kritik stok bildirimi var mı?
SELECT 
    type,
    title,
    message,
    severity,
    target_roles,  -- ← BU DOLU OLMALI! (Migration ekledi)
    is_read,
    created_at
FROM notifications
WHERE type = 'critical_stock'
  AND is_read = FALSE
ORDER BY created_at DESC;
```

**BEKLENEN:**
- ✅ 1 notification kaydı
- ✅ type: 'critical_stock'
- ✅ target_roles: `{planlama,yonetici}` **← Migration başarısı!**

---

### ADIM 10: Production Plan İlerleme Kontrolü

```sql
-- Plan ilerleme durumu
SELECT 
    pp.id,
    pp.planned_quantity,
    pp.produced_quantity,
    pp.status,
    ROUND((pp.produced_quantity::NUMERIC / pp.planned_quantity) * 100, 2) as completion_percentage,
    CASE 
        WHEN pp.produced_quantity >= pp.planned_quantity THEN 'Hedef tamamlandı!'
        ELSE 'Devam ediyor...'
    END as progress_status
FROM production_plans pp
WHERE pp.order_id = (SELECT id FROM orders WHERE order_number = 'TEST-001');
```

**BEKLENEN:**
- planned_quantity: 5
- produced_quantity: 3
- status: 'devam_ediyor'
- completion_percentage: 60.00

---

## ✅ Başarı Kriterleri

Test başarılı sayılır eğer:

- [x] BOM snapshot oluştu
- [x] Finished product stok arttı (+3)
- [x] Raw materials stok azaldı (BOM snapshot'a göre)
- [x] stock_movements kayıtlarında **production_log_id DOLU**
- [x] Kritik stok bildirimi oluştu
- [x] Bildirimdeki **target_roles: {planlama,yonetici}**
- [x] Production plan produced_quantity güncellenmiş

---

## 🚀 Test Başarılıysa

**TEBRIKLER!** 🎉

Migration başarıyla uygulandı ve sistem production ready! Artık:

✅ BOM değişiklikleri devam eden üretimleri **ETKİLEMEZ**
✅ Stok hareketleri production log'lara **BAĞLI**
✅ Kritik stok bildirimleri **ROL BAZLI**
✅ Üretim takibi **EKSİKSİZ**

---

## 🧹 Test Verilerini Temizle (Opsiyonel)

```sql
-- Test verilerini temizle
DELETE FROM production_logs 
WHERE plan_id IN (
    SELECT id FROM production_plans 
    WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'TEST-%')
);

DELETE FROM production_plan_bom_snapshot
WHERE plan_id IN (
    SELECT id FROM production_plans 
    WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'TEST-%')
);

DELETE FROM production_plans 
WHERE order_id IN (SELECT id FROM orders WHERE order_number LIKE 'TEST-%');

DELETE FROM orders WHERE order_number LIKE 'TEST-%';

DELETE FROM notifications WHERE title LIKE '%Migration%';

-- Stokları eski haline getir
UPDATE raw_materials SET quantity = quantity + 30 WHERE code LIKE 'RM%';
```

---

## 📊 Migration Impact Summary

| Özellik | Önce | Sonra |
|---------|------|-------|
| Malzeme Tüketimi | ❌ Canlı BOM | ✅ Snapshot |
| Stok İzlenebilirliği | ❌ Kaynak belirsiz | ✅ production_log_id |
| Bildirimler | ❌ Sadece user_id | ✅ Rol bazlı |
| BOM Değişikliği Etkisi | ❌ Devam eden üretimi etkiler | ✅ Etkilemez |
| Geri Alma | ❌ Zor | ✅ Kolay |

---

**MIGRATION BAŞARILI! SISTEM PRODUCTION READY!** ✅🚀

