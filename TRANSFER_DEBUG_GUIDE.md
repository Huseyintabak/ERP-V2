# 🔍 Transfer Debug Rehberi

## 🚨 Problem
Transfer işlemi başarılı görünüyor ama zone stokları değişmiyor.

---

## 📋 Debug Adımları

### **ADIM 1: SQL Fonksiyonunu Güncelle (ZORUNLU)**

Supabase SQL Editor'da şu dosyayı çalıştır:

```
supabase/FIX-TRANSFER-FUNCTION-V3.sql
```

Bu yeni versiyon:
- ✅ Detaylı log'lama ekler
- ✅ Her adımda ROW_COUNT kontrol eder
- ✅ Hata durumunda rollback yapar
- ✅ Debug bilgisi döndürür

**Başarılı Sonuç:**
```
✅ TRANSFER_BETWEEN_ZONES V3 CREATED WITH LOGGING!
```

---

### **ADIM 2: Debug SQL'i Çalıştır**

Supabase SQL Editor'da:

```
supabase/DEBUG-TRANSFER-ISSUE.sql
```

Bu script şunları kontrol eder:
1. Son transfer kayıtları
2. Mevcut zone inventory'ler
3. Transfer edilen zone'larda inventory var mı
4. RLS policy'leri
5. Manuel test (otomatik)
6. Trigger'lar

**Çıktıları İncele:**
- ❌ "NO INVENTORY RECORD" → Zone'da ürün yoksa ekle
- ❌ "SOURCE NOT UPDATED" → SQL fonksiyonu çalışmıyor
- ❌ RLS policy problemi → Admin client kullanılmalı

---

### **ADIM 3: Server'ı Yeniden Başlat**

```bash
# Terminal'de:
npm run dev
```

Yeni API değişiklikleri aktif oldu:
- ✅ `user_id` parametresi eklendi
- ✅ Admin client kullanılıyor
- ✅ Detaylı console.log'lar eklendi

---

### **ADIM 4: Transfer Testi (Frontend)**

1. Tarayıcıda:
```
http://localhost:3000/depo-zone-yonetimi
```

2. Browser Console'u aç (F12)

3. Bir zone'dan transfer yap

4. Console'da şunları kontrol et:

```javascript
🔄 Calling transfer_between_zones with: { ... }
📊 Transfer function result: { ... }
✅ Transfer completed successfully
📦 Updated inventories: { source: [...], destination: [...] }
```

---

### **ADIM 5: Supabase Logs Kontrolü**

Supabase Dashboard → Logs → **Postgres Logs**

Şu log'ları ara:

```
=== TRANSFER START ===
From Zone: <uuid>
To Zone: <uuid>
Current Source Qty: <number>
Source zone rows updated: 1
Destination zone rows affected: 1
✅ TRANSFER COMPLETED SUCCESSFULLY
```

**Sorunlar:**
- `rows_updated: 0` → Source zone'da ürün yok veya zone_id yanlış
- `rows_inserted: 0` → Destination zone'a yazılamıyor (constraint?)
- `❌ TRANSFER EXCEPTION` → SQL hatası var

---

## 🔧 Olası Sorunlar ve Çözümler

### **Sorun 1: Source Zone'da Inventory Yok**

**Belirti:**
```
Source zone rows updated: 0
```

**Çözüm:**
```sql
-- Zone'a manuel inventory ekle
INSERT INTO zone_inventories (
  zone_id,
  material_type,
  material_id,
  quantity
) VALUES (
  'SOURCE_ZONE_ID',
  'finished',
  'PRODUCT_ID',
  100
);
```

---

### **Sorun 2: RLS Policy Engeli**

**Belirti:**
```
Transfer function error: permission denied
```

**Çözüm 1:** API'de admin client kullanıldığından emin ol (✅ yapıldı)

**Çözüm 2:** RLS policy'leri kontrol et:
```sql
-- zone_inventories için RLS policy'leri görüntüle
SELECT * FROM pg_policies WHERE tablename = 'zone_inventories';

-- Gerekirse RLS'i geçici olarak devre dışı bırak (SADECE TEST İÇİN)
ALTER TABLE zone_inventories DISABLE ROW LEVEL SECURITY;
```

---

### **Sorun 3: Constraint Violation**

**Belirti:**
```
EXCEPTION: duplicate key value violates unique constraint
```

**Çözüm:**
```sql
-- zone_inventories'de unique constraint'i kontrol et
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_catalog.pg_constraint con
WHERE con.conrelid = 'zone_inventories'::regclass;

-- Muhtemelen: (zone_id, material_type, material_id) UNIQUE
-- ON CONFLICT clause fonksiyonda zaten var, ama kontrol et
```

---

### **Sorun 4: Transaction Rollback**

**Belirti:**
Transfer başarılı görünüyor ama database'de değişiklik yok

**Çözüm:**
```sql
-- Fonksiyonda exception handling doğru mu kontrol et
-- V3'te RAISE EXCEPTION eklendi - rollback yapacak
```

---

## 🧪 Manuel Test

### **Basit Transfer Testi (SQL)**

```sql
-- 1. Mevcut durumu kontrol et
SELECT 
  zi.zone_id,
  wz.name as zone_name,
  zi.material_id,
  fp.name as product_name,
  zi.quantity
FROM zone_inventories zi
JOIN warehouse_zones wz ON zi.zone_id = wz.id
JOIN finished_products fp ON zi.material_id = fp.id
WHERE zi.material_type = 'finished'
ORDER BY zi.quantity DESC
LIMIT 5;

-- 2. İki zone ID ve bir product ID seç (yukarıdan)

-- 3. Transfer fonksiyonunu çağır
SELECT transfer_between_zones(
  'SOURCE_ZONE_ID'::UUID,
  'TARGET_ZONE_ID'::UUID,
  'PRODUCT_ID'::UUID,
  5,  -- quantity
  NULL::UUID
);

-- 4. Sonucu kontrol et
-- Başarılı ise: {"success": true, "message": "...", "debug": {...}}
-- Hatalı ise: {"success": false, "error": "..."}

-- 5. Inventory'leri tekrar kontrol et
SELECT 
  zi.zone_id,
  wz.name as zone_name,
  zi.material_id,
  fp.name as product_name,
  zi.quantity
FROM zone_inventories zi
JOIN warehouse_zones wz ON zi.zone_id = wz.id
JOIN finished_products fp ON zi.material_id = fp.id
WHERE zi.material_type = 'finished'
  AND zi.material_id = 'PRODUCT_ID'::UUID
ORDER BY zi.zone_id;
```

---

## ✅ Başarı Kontrolü

Transfer başarılı olduysa:

**1. Database:**
```sql
-- Source zone'un stoğu azalmış olmalı
-- Target zone'un stoğu artmış olmalı
SELECT * FROM zone_inventories 
WHERE material_id = 'PRODUCT_ID';

-- Transfer kaydı oluşturulmuş olmalı
SELECT * FROM zone_transfers 
ORDER BY transfer_date DESC 
LIMIT 1;
```

**2. Browser Console:**
```
✅ Transfer completed successfully
📦 Updated inventories: {
  source: [{ quantity: 90 }],  // 100 - 10
  destination: [{ quantity: 10 }]
}
```

**3. Frontend:**
- Toast: "Transfer başarıyla tamamlandı"
- Zone listesi otomatik yenilendi
- Stok sayıları güncellenmiş görünüyor

---

## 🎯 Hızlı Fix Checklist

Eğer hala çalışmıyorsa, sırayla şunları kontrol et:

- [ ] `FIX-TRANSFER-FUNCTION-V3.sql` çalıştırıldı
- [ ] Server yeniden başlatıldı (`npm run dev`)
- [ ] Browser cache temizlendi (Ctrl+Shift+R)
- [ ] Supabase Postgres Logs'ta `TRANSFER START` görünüyor
- [ ] `rows_updated: 1` ve `rows_inserted: 1` görünüyor
- [ ] API console'da `✅ Transfer completed` görünüyor
- [ ] Admin client kullanılıyor (RLS bypass)
- [ ] Zone'larda gerçekten ürün var (`zone_inventories` kontrol)

---

## 📞 Hala Çalışmıyorsa

Şu bilgileri topla:

1. **Supabase Postgres Logs** (son transfer)
2. **Browser Console** (tam log)
3. **SQL sorgusu sonucu:**
```sql
SELECT * FROM zone_transfers 
ORDER BY transfer_date DESC LIMIT 1;

SELECT * FROM zone_inventories 
WHERE zone_id IN ('SOURCE_ID', 'TARGET_ID');
```

4. **API response** (Network tab'dan)

---

**Casper'nun Yorumu:**  
> "Transfer sistemi transaction-based olmalı. Ya her şey başarılı olur, ya da hiçbir şey değişmez. Eğer transfer kaydı varsa ama stok değişmemişse, RLS policy veya constraint problemidir. V3 fonksiyonu bunu debug edecek." 🔍

