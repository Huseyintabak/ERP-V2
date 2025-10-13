# 🧪 REAL TEST SENARYOSU - Adım Adım Rehber

**Tarih:** 8 Ekim 2025  
**Amaç:** Migration'ı gerçek kullanıcı senaryosu ile test etmek

---

## 📋 TEST ADIMLARI

### ADIM 0: Hazırlık (Opsiyonel)

**Ne Yapılacak:** Eski test verilerini temizle

**SQL:**
```sql
-- Supabase SQL Editor'da çalıştır:
-- Dosya: supabase/REAL-TEST-CLEANUP.sql
```

**Beklenen Sonuç:**
```
result: "ADIM 0: Test verileri temizlendi, stoklar sifirlandi"
```

**Sorun yaşarsanız:** "Adım 0'da problem"

---

### ADIM 1: BOM Kontrolü

**Ne Yapılacak:** Finished product için BOM tanımlı mı kontrol et

**SQL:**
```sql
-- Supabase SQL Editor'da çalıştır:

SELECT 
    fp.code as product_code,
    fp.name as product_name,
    fp.barcode,
    bom.material_type,
    CASE 
        WHEN bom.material_type = 'raw' THEN rm.code
        ELSE sfp.code
    END as material_code,
    bom.quantity_needed
FROM finished_products fp
LEFT JOIN bom ON bom.finished_product_id = fp.id
LEFT JOIN raw_materials rm ON bom.material_type = 'raw' AND bom.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON bom.material_type = 'semi' AND bom.material_id = sfp.id
WHERE fp.code LIKE 'NM%'
ORDER BY fp.code;
```

**Beklenen Sonuç:**
- En az 1 finished product
- Her ürün için 2-3 malzeme BOM kaydı

**Eğer BOM yoksa:** BOM ekleyin (UI veya SQL ile)

**Sorun yaşarsanız:** "Adım 1'de problem"

---

### ADIM 2: Planlama ile Login (UI)

**Ne Yapılacak:** Web uygulamasına planlama kullanıcısı ile giriş yap

**Adımlar:**
1. http://localhost:3000 aç
2. Email: `planlama@thunder.com`
3. Şifre: `123456`
4. Giriş Yap

**Beklenen Sonuç:**
- Dashboard'a yönlendirildiniz
- Üst menüde "Planlama Kullanıcı" görünüyor

**Sorun yaşarsanız:** "Adım 2'de problem"

---

### ADIM 3: Yeni Sipariş Oluştur (UI)

**Ne Yapılacak:** Yeni bir sipariş ekle

**UI Adımları:**
1. Sidebar → Üretim → Siparişler
2. "Yeni Sipariş" butonu
3. Formu doldur:
   - Müşteri: LTSAUTO (veya herhangi biri)
   - Ürün: Endüstriyel Kapı (veya BOM'u olan ürün)
   - Miktar: 3
   - Öncelik: Orta
   - Teslim Tarihi: Gelecek bir tarih
4. "Sipariş Oluştur"

**Beklenen Sonuç:**
- Toast: "Sipariş başarıyla oluşturuldu"
- Sipariş listesinde görünüyor
- Durum: "Beklemede"

**SQL Kontrolü:**
```sql
SELECT 
    order_number,
    status,
    order_items,
    created_at
FROM orders
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Sorun yaşarsanız:** "Adım 3'te problem" + hata mesajı

---

### ADIM 4: Siparişi Onayla (UI) - BOM SNAPSHOT TEST!

**Ne Yapılacak:** Oluşturduğun siparişi onayla

**UI Adımları:**
1. Üretim → Üretim Yönetimi
2. "Bekleyen Siparişler" tab'ı
3. Yeni siparişin yanındaki "Onayla" butonu

**Beklenen Sonuç:**
- Toast: "Sipariş onaylandı"
- Sipariş "Üretimdeki Siparişler" tab'ına geçti
- Production plan oluştu

**SQL Kontrolü (ÖNEMLİ!):**
```sql
-- 1. Production plan oluştu mu?
SELECT 
    pp.id as plan_id,
    pp.status,
    pp.planned_quantity,
    o.order_number
FROM production_plans pp
JOIN orders o ON pp.order_id = o.id
WHERE pp.created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY pp.created_at DESC;

-- 2. BOM SNAPSHOT oluştu mu? (MIGRATION TESTİ!)
SELECT 
    plan_id,
    material_type,
    material_code,
    material_name,
    quantity_needed,
    'BOM Snapshot olusturuldu - create_bom_snapshot trigger calisti!' as test_result
FROM production_plan_bom_snapshot
WHERE plan_id = (
    SELECT id FROM production_plans 
    WHERE created_at >= NOW() - INTERVAL '5 minutes'
    ORDER BY created_at DESC 
    LIMIT 1
);
```

**Beklenen SQL Sonuç:**
- 1 production plan
- 2-3 BOM snapshot kaydı
- test_result: "BOM Snapshot olusturuldu..."

**Sorun yaşarsanız:** "Adım 4'te problem" + SQL sonucu

---

### ADIM 5: Operatör Ataması (UI)

**Ne Yapılacak:** Production plan'a operatör ata

**UI Adımları:**
1. Üretim → Üretim Planları
2. Yeni oluşan planı bul
3. "Operatör Ata" butonu (varsa)
4. Thunder Operatör seç

**Alternatif - SQL ile:**
```sql
UPDATE production_plans
SET assigned_operator_id = (SELECT id FROM operators LIMIT 1)
WHERE id = (
    SELECT id FROM production_plans 
    WHERE created_at >= NOW() - INTERVAL '5 minutes'
    ORDER BY created_at DESC 
    LIMIT 1
)
RETURNING id, assigned_operator_id;
```

**Beklenen Sonuç:**
- assigned_operator_id dolu

**Sorun yaşarsanız:** "Adım 5'te problem"

---

### ADIM 6: Operatör ile Login (UI)

**Ne Yapılacak:** Operatör olarak giriş yap

**Adımlar:**
1. Çıkış yap (sağ üst)
2. http://localhost:3000/operator-login
3. Operatör: Thunder Operatör
4. Şifre: 123456
5. Giriş Yap

**Beklenen Sonuç:**
- Operatör dashboard açıldı
- "Atanan Siparişler" veya "Aktif Üretimler" listesinde sipariş görünüyor

**Sorun yaşarsanız:** "Adım 6'da problem"

---

### ADIM 7: Siparişi Kabul Et (UI)

**Ne Yapılacak:** Atanan siparişi kabul et

**Adımlar:**
1. "Atanan Siparişler" bölümünde sipariş var mı kontrol et
2. "Kabul Et" butonu (varsa)
3. Veya direkt "Aktif Üretimler" tab'ında görünüyorsa, devam et

**SQL ile Status Güncelleme (Alternatif):**
```sql
UPDATE production_plans
SET status = 'devam_ediyor',
    started_at = NOW()
WHERE id = (
    SELECT id FROM production_plans 
    WHERE created_at >= NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC 
    LIMIT 1
)
RETURNING id, status;
```

**Beklenen Sonuç:**
- Plan status: "devam_ediyor"
- "Aktif Üretimler" listesinde görünüyor

**Sorun yaşarsanız:** "Adım 7'de problem"

---

### ADIM 8: Üretim Modal'ını Aç (UI)

**Ne Yapılacak:** Barkod okutma modal'ını aç

**Adımlar:**
1. "Aktif Üretimler" tab'ı
2. Siparişin yanındaki "Görüntüle" butonu

**Beklenen Sonuç:**
- Modal açıldı
- Ürün bilgileri görünüyor
- Barkod input var
- Gerekli malzemeler listeleniyor

**Sorun yaşarsanız:** "Adım 8'de problem"

---

### ADIM 9: Barkod Okut (UI) - MIGRATION TEST!

**Ne Yapılacak:** Ürün barkodunu okut ve üretim kaydet

**Adımlar:**
1. Barkod input'a ürün barkodunu yaz (örn: 8690123456789)
2. "Kaydet" butonu veya Enter

**VEYA SQL ile (Önerilen):**
```sql
-- Production log ekle (trigger'ları tetikler!)
INSERT INTO production_logs (
    plan_id,
    operator_id,
    barcode_scanned,
    quantity_produced
)
SELECT 
    pp.id,
    pp.assigned_operator_id,
    fp.barcode,
    1
FROM production_plans pp
JOIN finished_products fp ON pp.product_id = fp.id
WHERE pp.created_at >= NOW() - INTERVAL '10 minutes'
  AND pp.status = 'devam_ediyor'
ORDER BY pp.created_at DESC
LIMIT 1
RETURNING id, barcode_scanned, quantity_produced;
```

**Beklenen Sonuç:**
- Toast: "Üretim kaydedildi"
- İlerleme barı güncellendi (1/3)
- Son kayıtlar listesinde görünüyor

**Sorun yaşarsanız:** "Adım 9'da problem" + hata mesajı

---

### ADIM 10: stock_movements Kontrolü (SQL) - MIGRATION KANITI!

**Ne Yapılacak:** production_log_id dolu mu kontrol et

**SQL:**
```sql
-- EN KRITIK TEST!
SELECT 
    sm.id as movement_id,
    sm.material_type,
    sm.movement_type,
    sm.quantity,
    sm.production_log_id,  -- ← BU DOLU OLMALI!
    pl.barcode_scanned,
    pl.quantity_produced,
    sm.description,
    CASE 
        WHEN sm.production_log_id IS NOT NULL 
        THEN '✅ MIGRATION BASARILI - production_log_id DOLU!'
        ELSE '❌ HATA - production_log_id BOS!'
    END as test_result
FROM stock_movements sm
LEFT JOIN production_logs pl ON sm.production_log_id = pl.id
WHERE sm.created_at >= NOW() - INTERVAL '2 minutes'
ORDER BY sm.created_at DESC
LIMIT 10;
```

**Beklenen Sonuç:**
```
2-3 kayıt (her malzeme için 1)
material_type: raw
movement_type: uretim
production_log_id: <UUID> (DOLU!)
test_result: "MIGRATION BASARILI - production_log_id DOLU!"
```

**Sorun yaşarsanız:** "Adım 10'da problem" + SQL sonucu

---

### ADIM 11: Finished Product Stok Kontrolü (SQL)

**Ne Yapılacak:** Finished product stoğu arttı mı kontrol et

**SQL:**
```sql
SELECT 
    fp.code,
    fp.name,
    fp.quantity as current_stock,
    'Her barkod okutmada +1 artmali' as note
FROM finished_products fp
WHERE fp.id = (
    SELECT product_id FROM production_plans
    WHERE created_at >= NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC
    LIMIT 1
);
```

**Beklenen Sonuç:**
- quantity arttı (+1 her barkod için)

**Sorun yaşarsanız:** "Adım 11'de problem" + sonuç

---

### ADIM 12: Raw Materials Stok Kontrolü (SQL)

**Ne Yapılacak:** Hammadde stokları azaldı mı kontrol et

**SQL:**
```sql
SELECT 
    rm.code,
    rm.name,
    rm.quantity as current_stock,
    bom.quantity_needed as consumed_per_unit,
    'Her uretim icin bu kadar azalmali' as note
FROM raw_materials rm
JOIN production_plan_bom_snapshot bom ON bom.material_id = rm.id AND bom.material_type = 'raw'
WHERE bom.plan_id = (
    SELECT id FROM production_plans 
    WHERE created_at >= NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY rm.code;
```

**Beklenen Sonuç:**
- Stoklar BOM snapshot'a göre azaldı
- quantity değişti

**Sorun yaşarsanız:** "Adım 12'de problem" + stok değerleri

---

### ADIM 13: Kritik Stok Bildirimi Testi (SQL) - MIGRATION KANITI!

**Ne Yapılacak:** Bir hammaddeyi kritik seviyeye düşür ve bildirim kontrolü

**SQL:**
```sql
-- 1. Hammaddeyi kritik seviyeye düşür
UPDATE raw_materials
SET quantity = critical_level - 10
WHERE code = 'HM-BOYA-001'
RETURNING code, quantity, critical_level;

-- 2. 2 saniye bekle
SELECT pg_sleep(2);

-- 3. Bildirim oluştu mu ve target_roles dolu mu kontrol et
SELECT 
    type,
    title,
    message,
    target_roles,  -- ← BU DOLU OLMALI!
    severity,
    is_read,
    CASE 
        WHEN target_roles IS NOT NULL AND 'planlama' = ANY(target_roles)
        THEN '✅ MIGRATION BASARILI - target_roles rol bazli!'
        ELSE '❌ HATA - target_roles bos!'
    END as test_result,
    created_at
FROM notifications
WHERE type = 'critical_stock'
  AND created_at >= NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC
LIMIT 3;
```

**Beklenen Sonuç:**
```
type: critical_stock
target_roles: ["planlama","yonetici"]  ← DOLU!
test_result: "MIGRATION BASARILI - target_roles rol bazli!"
```

**Sorun yaşarsanız:** "Adım 13'te problem" + SQL sonucu

---

### ADIM 14: Birden Fazla Barkod Okutma (UI/SQL)

**Ne Yapılacak:** 2-3 kez daha barkod okut, her seferinde kontrol et

**SQL (Her okutmadan sonra çalıştır):**
```sql
-- Yeni production log ekle
INSERT INTO production_logs (plan_id, operator_id, barcode_scanned, quantity_produced)
SELECT pp.id, pp.assigned_operator_id, fp.barcode, 1
FROM production_plans pp
JOIN finished_products fp ON pp.product_id = fp.id
WHERE pp.created_at >= NOW() - INTERVAL '10 minutes'
  AND pp.status = 'devam_ediyor'
ORDER BY pp.created_at DESC
LIMIT 1
RETURNING id, barcode_scanned;

-- Production plan güncellendi mi?
SELECT 
    planned_quantity,
    produced_quantity,
    ROUND((produced_quantity / planned_quantity) * 100, 2) as completion_percentage
FROM production_plans
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Beklenen Sonuç:**
- produced_quantity arttı
- completion_percentage güncellendi

**Sorun yaşarsanız:** "Adım 14'te problem"

---

### ADIM 15: Final Validation (SQL) - MIGRATION KANITI!

**Ne Yapılacak:** Tüm migration özelliklerini kontrol et

**SQL:**
```sql
-- FINAL TEST: Tum migration ozellikleri
SELECT 
    'TEST RAPORU' as section,
    '' as data;

-- 1. Kac production log eklendi?
SELECT 
    '1. Production Logs:' as test,
    COUNT(*) as log_count,
    'En az 1 olmali' as expected
FROM production_logs
WHERE timestamp >= NOW() - INTERVAL '10 minutes';

-- 2. Kac stock movement oluştu?
SELECT 
    '2. Stock Movements:' as test,
    COUNT(*) as movement_count,
    COUNT(production_log_id) as with_log_id,
    CASE 
        WHEN COUNT(*) = COUNT(production_log_id)
        THEN 'MIGRATION BASARILI - Hepsi production_log_id ile!'
        ELSE 'SORUN - Bazi kayitlarda production_log_id yok'
    END as test_result
FROM stock_movements
WHERE created_at >= NOW() - INTERVAL '10 minutes';

-- 3. target_roles bildirimi var mı?
SELECT 
    '3. Critical Notifications:' as test,
    COUNT(*) as notification_count,
    COUNT(target_roles) as with_roles,
    CASE 
        WHEN COUNT(target_roles) > 0
        THEN 'MIGRATION BASARILI - Rol bazli bildirim!'
        ELSE 'SORUN - target_roles bos'
    END as test_result
FROM notifications
WHERE type = 'critical_stock'
  AND created_at >= NOW() - INTERVAL '10 minutes';

-- 4. Production plan produced_quantity güncellenmiş mi?
SELECT 
    '4. Production Progress:' as test,
    planned_quantity,
    produced_quantity,
    CASE 
        WHEN produced_quantity > 0
        THEN 'BASARILI - Trigger update_stock_on_production calisti!'
        ELSE 'SORUN - produced_quantity guncellenme'
    END as test_result
FROM production_plans
WHERE created_at >= NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

**Beklenen Sonuç:**
```
1. Production Logs: 3+
2. Stock Movements: 6-9 kayıt, HEPSI production_log_id ile
3. Critical Notifications: 1+, target_roles dolu
4. Production Progress: produced_quantity > 0
```

**Sorun yaşarsanız:** "Adım 15'te problem" + hangi test başarısız

---

## 📊 TEST BAŞARI KRİTERLERİ

Migration **BAŞARILI** sayılır eğer:

- [x] ADIM 4: BOM snapshot oluştu
- [x] ADIM 10: production_log_id DOLU (en kritik!)
- [x] ADIM 13: target_roles DOLU (en kritik!)
- [x] ADIM 15: Tüm testler geçti

---

## 🎯 BAŞLAYALIM!

**ADIM 0'dan başlayın** ve her adımda sonucu bildirin.

Sorun yaşarsanız: **"Adım X'te problem"** yazın ve detayları paylaşın.

---

**Hazırsınız! ADIM 0'dan başlayın!** 🚀

