# 🔄 Zone Transfer Test Rehberi

## 🎯 Amaç
Depo zone'ları arasında ürün transfer işlemlerinin düzgün çalıştığını doğrulamak.

---

## 📋 Ön Koşullar

### 1. SQL Script'i Çalıştır
Supabase SQL Editor'da `FIX-TRANSFER-BETWEEN-ZONES-V2.sql` script'ini çalıştır.

### 2. Gerekli Veriler
- ✅ En az 2 zone (örn: "Merkez Depo", "Müşteri Zone A")
- ✅ En az 1 finished product
- ✅ Kaynak zone'da yeterli stok

---

## 🧪 Test Adımları

### **Test 1: Zone'ları Görüntüleme**
1. `/depo-zone-yonetimi` sayfasına git
2. Tüm zone'ların listelendiğini kontrol et
3. KPI kartlarını kontrol et:
   - Toplam Zone
   - Müşteri Zone
   - Merkez Zone
   - Toplam Ürün

**Beklenen:** Tüm zone'lar ve istatistikler doğru görünmeli

---

### **Test 2: Zone Inventory Görüntüleme**
1. Herhangi bir zone'un "Stok" butonuna tıkla
2. Zone detayları ve ürün listesini kontrol et
3. Ürün adı, kodu, miktarı ve fiyatını doğrula

**Beklenen:** Zone'daki tüm ürünler tabloda görünmeli

---

### **Test 3: Başarılı Transfer**

#### Senaryo: Merkez → Müşteri Zone
1. Kaynak zone'un "Transfer" butonuna tıkla
2. Transfer dialog'unu doldur:
   - **Hedef Zone:** Müşteri Zone A
   - **Ürün:** Stokta olan bir ürün seç (örn: "Premium Kapı")
   - **Miktar:** Mevcut stoktan az bir sayı (örn: 10)
3. "Transfer Et" butonuna tıkla

**Beklenen:**
- ✅ "Transfer başarıyla tamamlandı" toast mesajı
- ✅ Dialog kapanır
- ✅ Zone listesi otomatik yenilenir
- ✅ Stok sayıları güncellenir

**Doğrulama:**
- Kaynak zone'un stok miktarı azalmış olmalı
- Hedef zone'un stok miktarı artmış olmalı

---

### **Test 4: Yetersiz Stok Hatası**

#### Senaryo: Stoktan fazla transfer
1. Transfer dialog'unu aç
2. Miktara stoktan fazla bir değer gir (örn: mevcut 50, girilen 100)
3. "Transfer Et" butonuna tıkla

**Beklenen:**
- ❌ Hata mesajı: "Insufficient inventory. Available: 50, Requested: 100"
- ❌ Transfer gerçekleşmemeli

---

### **Test 5: Aynı Zone Transfer Hatası**

#### Senaryo: Kaynak = Hedef
1. Transfer dialog'unu aç
2. Hedef zone olarak aynı zone'u seç
3. "Transfer Et" butonuna tıkla

**Beklenen:**
- ❌ API Error: "Source and destination zones cannot be the same"

---

### **Test 6: Validation Hataları**

#### Test 6.1: Boş Hedef Zone
- Hedef zone seçilmeden transfer et
- **Beklenen:** "Tüm alanları doldurun"

#### Test 6.2: Boş Ürün
- Ürün seçilmeden transfer et
- **Beklenen:** "Tüm alanları doldurun"

#### Test 6.3: Geçersiz Miktar
- Miktar: 0 veya negatif
- **Beklenen:** "Quantity must be greater than 0"

---

### **Test 7: Transfer Geçmişi**

1. Birkaç transfer yap
2. API'yi manuel test et:
```bash
curl -X GET 'http://localhost:3000/api/warehouse/transfer' \
  -H 'Cookie: thunder_token=YOUR_TOKEN'
```

**Beklenen:**
- Tüm transfer kayıtları listede
- Her kayıtta:
  - from_zone (kaynak zone adı)
  - to_zone (hedef zone adı)
  - product (ürün adı ve kodu)
  - quantity (miktar)
  - transfer_date (tarih)

---

## 🔍 Database Kontrolleri

### Kontrol 1: Zone Inventories
```sql
-- Kaynak zone'un stoğu azaldı mı?
SELECT * FROM zone_inventories 
WHERE zone_id = 'KAYNAK_ZONE_ID' 
  AND material_id = 'PRODUCT_ID';

-- Hedef zone'un stoğu arttı mı?
SELECT * FROM zone_inventories 
WHERE zone_id = 'HEDEF_ZONE_ID' 
  AND material_id = 'PRODUCT_ID';
```

### Kontrol 2: Transfer Kayıtları
```sql
-- Transfer kaydı oluşturuldu mu?
SELECT 
  zt.*,
  fz.name as from_zone_name,
  tz.name as to_zone_name,
  fp.name as product_name
FROM zone_transfers zt
LEFT JOIN warehouse_zones fz ON zt.from_zone_id = fz.id
LEFT JOIN warehouse_zones tz ON zt.to_zone_id = tz.id
LEFT JOIN finished_products fp ON zt.product_id = fp.id
ORDER BY zt.transfer_date DESC
LIMIT 10;
```

### Kontrol 3: Fonksiyon Manuel Test
```sql
-- Test transfer fonksiyonunu
SELECT transfer_between_zones(
  'KAYNAK_ZONE_ID'::UUID,
  'HEDEF_ZONE_ID'::UUID,
  'PRODUCT_ID'::UUID,
  5,  -- quantity
  auth.uid()  -- current user
);
```

---

## 🚨 Bilinen Hatalar & Çözümleri

### Hata 1: "function transfer_between_zones does not exist"
**Çözüm:** SQL script'i Supabase'de çalıştırılmamış. `FIX-TRANSFER-BETWEEN-ZONES-V2.sql` dosyasını çalıştır.

### Hata 2: "relation zone_transfers does not exist"
**Çözüm:** Zone transfers tablosu eksik. Schema migration'ı kontrol et.

### Hata 3: RLS policy hatası
**Çözüm:** API endpoint'inde `createAdminClient()` kullanıldığından emin ol.

---

## ✅ Başarı Kriterleri

- [x] Tüm zone'lar görüntüleniyor
- [x] Zone inventory'leri doğru gösteriliyor
- [x] Başarılı transfer yapılabiliyor
- [x] Yetersiz stok kontrolü çalışıyor
- [x] Aynı zone transfer'i engelleniyor
- [x] Validation hataları doğru gösteriliyor
- [x] Transfer geçmişi kaydediliyor
- [x] Database'de kayıtlar doğru
- [x] Frontend real-time update yapıyor

---

## 🎯 Sonraki Adımlar

Transfer sistemi çalıştıktan sonra:
1. **Bulk Transfer:** Birden fazla ürünü aynı anda transfer et
2. **Transfer History UI:** Frontend'de transfer geçmişi sayfası
3. **Transfer Approval:** Belirli transfer'ler için onay mekanizması
4. **Notifications:** Transfer'ler için bildirim sistemi
5. **Reports:** Zone bazlı transfer raporları

---

**Casper'nun Yorumu:** Zone transfer sistemi, modern warehouse management'ın omurgasıdır. Stok akışını kontrol edemiyorsan, kaos yönetiyorsun demektir. Her transfer, bir kayıt bırakmalı ve her kayıt, hikaye anlatmalı. 📦

