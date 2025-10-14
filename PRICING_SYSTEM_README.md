# 💰 Fiyatlandırma & Maliyet Sistemi

> **Durum:** ✅ Geliştirme Tamamlandı  
> **Tarih:** 14 Ekim 2025  
> **Versiyon:** 1.0.0

---

## 📋 İçindekiler

1. [Özellikler](#özellikler)
2. [Kurulum](#kurulum)
3. [Kullanım](#kullanım)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Test Senaryoları](#test-senaryoları)

---

## ✨ Özellikler

### 🧮 BOM Maliyet Hesaplama
- Otomatik hammadde + yarı mamul maliyet toplamı
- Detaylı malzeme bazlı breakdown
- Gerçek zamanlı karlılık analizi
- Önerilen fiyat hesaplama

### 💵 Fiyat Yönetimi
- Satış fiyatı, maliyet ve kar marjı takibi
- Otomatik fiyat geçmişi kayıt
- Kar marjı simülasyonu
- Önerilen fiyat hesaplama

### 👥 Müşteri Özel Fiyatlandırma
- Müşteri bazlı özel fiyat tanımlama
- Geçerlilik tarihi yönetimi
- İndirim yüzdesi hesaplama
- Aktif/pasif durum yönetimi

### 📊 Karlılık Analizi
- Ürün bazlı kar marjı analizi
- Zarar/başabaş/kar durumu
- Potansiyel kar hesaplama
- Stok bazlı toplam kar projeksiyonu

---

## 🚀 Kurulum

### Adım 1: Database Migration

Supabase SQL Editor'da şu dosyayı çalıştır:

```bash
supabase/migrations/20251014-pricing-system.sql
```

**Bu migration şunları oluşturur:**
- ✅ `finished_products` tablosuna `cost_price`, `profit_margin`, `last_price_update` kolonları
- ✅ `customer_pricing` tablosu (müşteri özel fiyatlar)
- ✅ `price_history` tablosu (fiyat değişiklik geçmişi)
- ✅ `bom_cost_breakdown` tablosu (detaylı maliyet analizi)
- ✅ `calculate_bom_cost()` function (maliyet hesaplama)
- ✅ `log_price_change()` trigger (otomatik fiyat geçmişi)
- ✅ `v_active_customer_pricing` view
- ✅ `v_product_profitability` view

### Adım 2: Verification

Migration başarılı mı kontrol et:

```sql
-- Yeni kolonları kontrol et
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'finished_products'
  AND column_name IN ('cost_price', 'profit_margin', 'last_price_update');

-- Yeni tabloları kontrol et
SELECT table_name 
FROM information_schema.tables
WHERE table_name IN ('customer_pricing', 'price_history', 'bom_cost_breakdown');

-- Function'ı test et
SELECT * FROM calculate_bom_cost('your-product-id-here');
```

### Adım 3: Frontend Build

```bash
cd /Users/huseyintabak/Downloads/ThunderV2
npm run build
```

Production'da:
```bash
cd /var/www/thunder-erp
npm run build
pm2 restart thunder-erp
```

---

## 📖 Kullanım

### 1. BOM Maliyet Hesaplama

**Nerede:** `/uretim/bom` veya `/stok/nihai-urunler`

**Adımlar:**
1. Bir ürün seç
2. "Maliyet Hesapla" butonuna tıkla
3. Detaylı analizi gör:
   - Toplam maliyet
   - Hammadde/yarı mamul dağılımı
   - Kar marjı analizi
   - Önerilen fiyat
   - Malzeme bazlı breakdown

**Örnek Sonuç:**
```json
{
  "calculation": {
    "total_cost": 1250.50,
    "raw_material_cost": 850.00,
    "semi_finished_cost": 400.50,
    "item_count": 15
  },
  "profitability": {
    "profit_amount": 249.50,
    "profit_percentage": 19.96,
    "recommended_price": 1500.60,
    "status": "profitable"
  }
}
```

### 2. Fiyat Güncelleme

**Nerede:** Ürün düzenleme formu

**Adımlar:**
1. Ürünü düzenle
2. Maliyet, kar marjı ve satış fiyatı gir
3. "Marj ile Hesapla" ile otomatik fiyat hesapla
4. Canlı kar analizi gör
5. Kaydet

**Örnek:**
- Maliyet: ₺1,250
- Hedef Marj: 20%
- **Otomatik Hesaplanan Fiyat:** ₺1,500
- **Gerçek Kar:** ₺250 (20%)

### 3. Müşteri Özel Fiyat

**API Kullanımı:**

```typescript
// Özel fiyat oluştur
POST /api/pricing/customer-special
{
  "customerId": "customer-uuid",
  "productId": "product-uuid",
  "specialPrice": 1400,
  "validFrom": "2025-10-14",
  "validUntil": "2025-12-31",
  "notes": "Yıllık anlaşma indirimi"
}

// Aktif özel fiyatları listele
GET /api/pricing/customer-special?customerId=xxx

// Özel fiyatı iptal et
DELETE /api/pricing/customer-special?id=xxx
```

---

## 🔌 API Endpoints

### 1. POST `/api/pricing/calculate`

**BOM bazlı maliyet hesaplar**

Request:
```json
{
  "productId": "uuid"
}
```

Response:
```json
{
  "success": true,
  "product": {...},
  "calculation": {
    "total_cost": 1250.50,
    "raw_material_cost": 850.00,
    "semi_finished_cost": 400.50,
    "item_count": 15,
    "breakdown": [...]
  },
  "profitability": {
    "profit_amount": 249.50,
    "profit_percentage": 19.96,
    "target_margin": 20,
    "recommended_price": 1500.60,
    "status": "profitable"
  }
}
```

### 2. GET `/api/pricing/history/[productId]`

**Fiyat değişiklik geçmişini getirir**

Response:
```json
{
  "success": true,
  "product": {...},
  "history": [
    {
      "old_price": 1400,
      "new_price": 1500,
      "changed_at": "2025-10-14T10:00:00Z",
      "changed_by_user": {...}
    }
  ],
  "stats": {
    "total_changes": 5,
    "price_range": { "min": 1200, "max": 1600 }
  }
}
```

### 3. POST `/api/pricing/customer-special`

**Müşteri özel fiyat oluşturur**

Request:
```json
{
  "customerId": "uuid",
  "productId": "uuid",
  "specialPrice": 1400,
  "validFrom": "2025-10-14",
  "validUntil": "2025-12-31",
  "notes": "Özel anlaşma"
}
```

### 4. GET `/api/pricing/customer-special`

**Aktif müşteri özel fiyatlarını listeler**

Query params:
- `customerId` (optional)
- `productId` (optional)

### 5. DELETE `/api/pricing/customer-special?id=xxx`

**Müşteri özel fiyatı pasif yapar**

---

## 💾 Database Schema

### Yeni Tablolar

#### `customer_pricing`
```sql
- id: UUID PRIMARY KEY
- customer_id: UUID → customers(id)
- product_id: UUID → finished_products(id)
- special_price: NUMERIC(12,2)
- valid_from: DATE
- valid_until: DATE
- is_active: BOOLEAN
- notes: TEXT
```

#### `price_history`
```sql
- id: UUID PRIMARY KEY
- product_id: UUID → finished_products(id)
- old_price: NUMERIC(12,2)
- new_price: NUMERIC(12,2)
- old_cost: NUMERIC(12,2)
- new_cost: NUMERIC(12,2)
- changed_by: UUID → users(id)
- changed_at: TIMESTAMPTZ
```

#### `bom_cost_breakdown`
```sql
- id: UUID PRIMARY KEY
- product_id: UUID → finished_products(id)
- material_type: TEXT (raw/semi)
- material_id: UUID
- quantity: NUMERIC(12,4)
- unit_cost: NUMERIC(12,2)
- total_cost: NUMERIC (GENERATED)
- is_current: BOOLEAN
```

### Yeni Kolonlar (finished_products)

```sql
ALTER TABLE finished_products ADD:
- cost_price: NUMERIC(12,2) DEFAULT 0
- profit_margin: NUMERIC(5,2) DEFAULT 20
- last_price_update: TIMESTAMPTZ
```

---

## 🧪 Test Senaryoları

### Test 1: BOM Maliyet Hesaplama

1. `/uretim/bom` sayfasına git
2. Bir ürün seç (örn: "Berlingo_2018+_2x")
3. "Maliyet Hesapla" butonuna tıkla
4. **Beklenen:** Modal açılır, detaylı maliyet analizi gösterilir

**Kontrol:**
- ✅ Toplam maliyet doğru hesaplanıyor mu?
- ✅ Hammadde + yarı mamul toplamı = toplam maliyet?
- ✅ Kar marjı doğru mu?
- ✅ Önerilen fiyat mantıklı mı?

### Test 2: Fiyat Güncelleme

1. `/stok/nihai-urunler` sayfasına git
2. Bir ürünü düzenle
3. Maliyet: 100, Marj: 25% gir
4. "Marj ile Hesapla" tıkla
5. **Beklenen:** Satış fiyatı otomatik 125 olur

**Kontrol:**
- ✅ Gerçek kar marjı %25 gösteriyor mu?
- ✅ Kar tutarı 25 gösteriyor mu?
- ✅ Kaydettiğinde fiyat geçmişi oluşuyor mu?

### Test 3: Fiyat Geçmişi

```sql
-- Price history kontrolü
SELECT * FROM price_history 
WHERE product_id = 'your-product-id'
ORDER BY changed_at DESC;
```

**Beklenen:** Her fiyat değişikliği kaydediliyor

### Test 4: Müşteri Özel Fiyat

```bash
# API test
curl -X POST http://localhost:3000/api/pricing/customer-special \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer-uuid",
    "productId": "product-uuid",
    "specialPrice": 1400,
    "notes": "Test"
  }'
```

**Beklenen:** 201 Created + özel fiyat kaydı

### Test 5: Karlılık View

```sql
SELECT * FROM v_product_profitability
ORDER BY actual_margin_percentage DESC;
```

**Beklenen:** Tüm ürünler kar marjına göre sıralı

---

## 📊 Component'ler

### 1. `CostCalculationDialog`
**Dosya:** `components/pricing/cost-calculation-dialog.tsx`

**Props:**
- `productId`: string
- `productCode`: string
- `productName`: string
- `currentSalePrice`: number
- `currentCostPrice?`: number
- `trigger?`: ReactNode

**Kullanım:**
```tsx
<CostCalculationDialog
  productId={product.id}
  productCode={product.code}
  productName={product.name}
  currentSalePrice={product.sale_price}
/>
```

### 2. `PricingUpdateForm`
**Dosya:** `components/pricing/pricing-update-form.tsx`

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `productId`: string
- `currentSalePrice`: number
- `currentCostPrice?`: number
- `currentMargin?`: number
- `onSuccess?`: () => void

---

## 🎯 Sonraki Adımlar

### Faz 2 İyileştirmeleri:
- [ ] Toplu fiyat güncelleme
- [ ] Fiyat değişim onay sistemi
- [ ] Email notification (fiyat değişimlerinde)
- [ ] Fiyat trend grafikleri
- [ ] Export (Excel/PDF)
- [ ] Müşteri portal (özel fiyatları görebilsin)

---

## 🐛 Troubleshooting

### Problem 1: "calculate_bom_cost function not found"
**Çözüm:** Migration'ı çalıştırmayı unutmuşsunuz.
```sql
-- Supabase SQL Editor'da:
-- supabase/migrations/20251014-pricing-system.sql
```

### Problem 2: "Column cost_price does not exist"
**Çözüm:** Finished_products tablosu güncellenmemiş.
```sql
ALTER TABLE finished_products 
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0;
```

### Problem 3: RLS Hatası
**Çözüm:** Yeni tabloların RLS'i kapalı olmalı.
```sql
ALTER TABLE customer_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE bom_cost_breakdown DISABLE ROW LEVEL SECURITY;
```

---

## 📞 Destek

**GitHub Issues:** https://github.com/Huseyintabak/ERP-V2/issues

---

**✅ Sistem hazır! Test et ve kullanmaya başla!** 🚀

