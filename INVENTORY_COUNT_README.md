# 📦 Envanter Sayım Sistemi

> **Durum:** ✅ Geliştirme Tamamlandı  
> **Tarih:** 14 Ekim 2025  
> **Versiyon:** 1.0.0

---

## 📋 Özellikler

### ✅ Tamamlanan Özellikler

1. **Fiziki Envanter Sayımı**
   - 3 malzeme tipi desteği (Hammadde, Yarı Mamul, Nihai Ürün)
   - Sistem stoğu vs fiziki sayım karşılaştırması
   - Otomatik fark hesaplama
   - Sapma yüzdesi analizi

2. **Onay/Red Sistemi**
   - Yönetici onay mekanizması
   - Red sebebi kayıt
   - Otomatik stok güncelleme
   - Stok hareketi kaydı

3. **Sapma Analizi**
   - Düşük sapma: 0-5%
   - Orta sapma: 5-10%
   - Yüksek sapma: >10%
   - Görsel uyarılar

4. **Rapor Export**
   - CSV/Excel export
   - Filtreleme (tarih, tip, durum)
   - Detaylı sayım raporu

---

## 🚀 Kurulum

### ADIM 1: Database Migration

Supabase SQL Editor'da:

```bash
supabase/migrations/20251014-inventory-count.sql
```

**Bu migration şunları oluşturur:**
- ✅ `inventory_counts` tablosu
- ✅ `inventory_count_batches` tablosu (toplu sayımlar için)
- ✅ `approve_inventory_count()` function
- ✅ `reject_inventory_count()` function
- ✅ `v_pending_inventory_counts` view
- ✅ `v_inventory_count_summary` view

### ADIM 2: Verification

```sql
-- Tabloları kontrol et
SELECT table_name 
FROM information_schema.tables
WHERE table_name IN ('inventory_counts', 'inventory_count_batches');

-- Function'ları kontrol et
SELECT routine_name 
FROM information_schema.routines
WHERE routine_name LIKE '%inventory_count%';
```

**Beklenen:** 2 tablo + 2 function ✅

---

## 📖 Kullanım

### 1. Envanter Sayımı Başlatma (Depo Kullanıcısı)

**Nerede:** `http://localhost:3000/depo-dashboard`

**Adımlar:**
1. **"Envanter Sayımı"** butonuna tıkla
2. **Malzeme tipi** seç (Hammadde/Yarı Mamul/Nihai Ürün)
3. **Malzeme** seç (dropdown'dan)
4. **Fiziki sayım miktarı** gir
5. **(Opsiyonel) Notlar** ekle
6. **"Kaydet ve Onaya Gönder"** tıkla

**Sistem Otomatik:**
- Mevcut sistem stoğunu gösterir
- Farkı hesaplar (Fiziki - Sistem)
- Sapma yüzdesini hesaplar
- Uyarı seviyesi belirler

**Örnek:**
```
Malzeme: HM-001 - Çelik Sac 2mm
Sistem Stoğu: 100 kg
Fiziki Sayım: 95 kg
Fark: -5 kg (-5%)
Durum: Orta Sapma (5-10%)
```

---

### 2. Envanter Sayımı Onaylama (Yönetici)

**Nerede:** `http://localhost:3000/yonetici-dashboard`

**Envanter Sayım Onayları** kartında:

1. **Onay bekleyen sayımları** gör
2. **Detayları incele:**
   - Malzeme bilgileri
   - Sistem vs fiziki stok
   - Sapma yüzdesi
   - Sayan kişi
3. **İşlem seç:**
   - ✅ **Onayla** → Stok otomatik güncellenir
   - ❌ **Reddet** → Sebep yaz ve reddet

**Onay Sonrası:**
- Sistem stoğu fiziki sayıma güncellenir
- `stock_movements` tablosuna hareket kaydı eklenir
- Sayım durumu "approved" olur

---

### 3. Export (Rapor Alma)

**API Kullanımı:**

```bash
# Tüm sayımları export et
GET /api/stock/count/export

# Sadece pending olanları
GET /api/stock/count/export?status=pending

# Tarih aralığı ile
GET /api/stock/count/export?startDate=2025-10-01&endDate=2025-10-14

# Malzeme tipine göre
GET /api/stock/count/export?materialType=finished
```

**Çıktı:** CSV dosyası (Excel'de açılabilir)

---

## 🔌 API Endpoints

### 1. POST `/api/stock/count`

**Yeni envanter sayımı oluşturur**

Request:
```json
{
  "materialType": "raw",
  "materialId": "uuid",
  "physicalQuantity": 95.5,
  "notes": "Aylık envanter sayımı"
}
```

Response:
```json
{
  "success": true,
  "data": {...},
  "analysis": {
    "system_quantity": 100,
    "physical_quantity": 95.5,
    "difference": -4.5,
    "variance_percentage": -4.5,
    "severity": "low"
  }
}
```

---

### 2. GET `/api/stock/count`

**Envanter sayımlarını listeler**

Query Params:
- `status`: pending/approved/rejected
- `materialType`: raw/semi/finished
- `page`: 1, 2, 3...
- `limit`: 10, 50, 100

Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

---

### 3. PUT `/api/stock/count/[id]`

**Envanter sayımını onayla veya reddet**

Request (Onaylama):
```json
{
  "action": "approve",
  "autoAdjust": true
}
```

Request (Reddetme):
```json
{
  "action": "reject",
  "reason": "Yanlış sayım tespit edildi"
}
```

---

### 4. GET `/api/stock/count/[id]`

**Envanter sayım detayını getirir**

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "material_code": "HM-001",
    "material_name": "Çelik Sac 2mm",
    "system_quantity": 100,
    "physical_quantity": 95.5,
    "difference": -4.5,
    "variance_percentage": -4.5,
    "status": "pending",
    "counted_by_user": {...}
  }
}
```

---

### 5. DELETE `/api/stock/count/[id]`

**Envanter sayım kaydını siler (sadece pending)**

Response:
```json
{
  "success": true,
  "message": "Envanter sayım kaydı silindi"
}
```

---

### 6. GET `/api/stock/count/export`

**CSV export**

Query Params:
- `status`: pending/approved/rejected/all
- `materialType`: raw/semi/finished
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD

Response: CSV file download

---

## 💾 Database Schema

### `inventory_counts` Tablosu

```sql
- id: UUID PRIMARY KEY
- material_type: TEXT (raw/semi/finished)
- material_id: UUID
- material_code: TEXT
- material_name: TEXT
- system_quantity: NUMERIC(12,2)
- physical_quantity: NUMERIC(12,2)
- difference: NUMERIC(12,2) GENERATED
- variance_percentage: NUMERIC(5,2) GENERATED
- counted_by: UUID → users(id)
- notes: TEXT
- status: TEXT (pending/approved/rejected)
- created_at: TIMESTAMPTZ
- approved_at: TIMESTAMPTZ
- approved_by: UUID → users(id)
- rejection_reason: TEXT
- stock_adjusted: BOOLEAN
- adjusted_at: TIMESTAMPTZ
- batch_id: UUID → inventory_count_batches(id)
```

### `inventory_count_batches` Tablosu

```sql
- id: UUID PRIMARY KEY
- batch_name: TEXT
- description: TEXT
- count_date: DATE
- started_by: UUID → users(id)
- total_items: INTEGER
- completed_items: INTEGER
- status: TEXT (in_progress/completed/cancelled)
- created_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
```

---

## 🧪 Test Senaryoları

### Test 1: Envanter Sayımı Oluşturma

1. **Depo dashboard**'a git
2. **"Envanter Sayımı"** tıkla
3. Hammadde seç
4. Fiziki miktar gir (sistem stoğundan farklı)
5. **Kaydet**
6. **Beklenen:** Toast mesajı + sayım onaya gönderilir

**SQL Kontrolü:**
```sql
SELECT * FROM inventory_counts 
WHERE status = 'pending' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

### Test 2: Sayım Onaylama

1. **Yönetici dashboard**'a git
2. **"Envanter Sayım Onayları"** kartını gör
3. Bir sayımı **onayla** (yeşil ✓ ikonu)
4. **Beklenen:** 
   - Stok güncellenir
   - Stok hareketi oluşur
   - Sayım durumu "approved" olur

**SQL Kontrolü:**
```sql
-- Sayım durumu
SELECT status, stock_adjusted FROM inventory_counts WHERE id = 'count-id';

-- Stok hareketi
SELECT * FROM stock_movements 
WHERE reference_type = 'inventory_count' 
AND reference_id = 'count-id';

-- Güncel stok
SELECT quantity FROM raw_materials WHERE id = 'material-id';
```

---

### Test 3: Sayım Reddetme

1. Yönetici dashboard'da
2. Bir sayımı **reddet** (kırmızı ✗ ikonu)
3. **Red sebebi** yaz
4. **Reddet** tıkla
5. **Beklenen:** Sayım "rejected" olur, stok değişmez

---

### Test 4: Export

```bash
# Browser'dan
http://localhost:3000/api/stock/count/export?status=approved

# veya CURL
curl http://localhost:3000/api/stock/count/export > sayim-raporu.csv
```

**Beklenen:** CSV dosyası indirilir ✅

---

## 📊 Component'ler

### 1. `InventoryCountDialog`
**Dosya:** `components/stock/inventory-count-dialog.tsx`

**Props:**
- `open`: boolean
- `onOpenChange`: (open: boolean) => void
- `onSuccess?`: () => void

**Kullanım:**
```tsx
<InventoryCountDialog
  open={inventoryCountOpen}
  onOpenChange={setInventoryCountOpen}
  onSuccess={() => fetchStats()}
/>
```

---

### 2. `InventoryApprovalList`
**Dosya:** `components/stock/inventory-approval-list.tsx`

**Props:** Yok (self-contained)

**Kullanım:**
```tsx
<InventoryApprovalList />
```

---

## 🎯 Özellikler

### ✅ Otomatik Hesaplamalar
- Fark (Fiziki - Sistem)
- Sapma yüzdesi
- Sapma seviyesi (düşük/orta/yüksek)

### ✅ Güvenlik
- Sadece pending sayımlar silinebilir
- Onaylanan sayımlar değiştirilemez
- User tracking (kim saydı, kim onayladı)

### ✅ Stok Entegrasyonu
- Onay sonrası otomatik stok güncelleme
- Stok hareketi kaydı oluşturma
- Real-time güncelleme

---

## 🔗 İlgili Dosyalar

- `supabase/migrations/20251014-inventory-count.sql` - Database schema
- `app/api/stock/count/route.ts` - API endpoints
- `components/stock/inventory-count-dialog.tsx` - Sayım modal
- `components/stock/inventory-approval-list.tsx` - Onay listesi
- `app/(dashboard)/depo-dashboard/page.tsx` - Depo entegrasyonu
- `app/(dashboard)/yonetici-dashboard/page.tsx` - Yönetici entegrasyonu

---

## 🐛 Troubleshooting

### Problem 1: "Function approve_inventory_count does not exist"
**Çözüm:** Migration çalıştırılmamış.
```sql
-- Supabase SQL Editor'da:
-- supabase/migrations/20251014-inventory-count.sql
```

### Problem 2: "Column difference does not exist"
**Çözüm:** GENERATED column sorun çıkartabilir. Manuel ekle:
```sql
ALTER TABLE inventory_counts 
  DROP COLUMN IF EXISTS difference,
  ADD COLUMN difference NUMERIC(12, 2);

-- Manual update trigger ekle
CREATE OR REPLACE FUNCTION update_inventory_count_difference()
RETURNS TRIGGER AS $$
BEGIN
  NEW.difference := NEW.physical_quantity - NEW.system_quantity;
  NEW.variance_percentage := CASE 
    WHEN NEW.system_quantity > 0 THEN 
      ((NEW.physical_quantity - NEW.system_quantity) / NEW.system_quantity) * 100
    ELSE 0
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_count_difference
  BEFORE INSERT OR UPDATE ON inventory_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_count_difference();
```

### Problem 3: RLS Hatası
**Çözüm:**
```sql
ALTER TABLE inventory_counts DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_batches DISABLE ROW LEVEL SECURITY;
```

---

## 📝 Gelecek İyileştirmeler

- [ ] Barkod okuyucu entegrasyonu
- [ ] Toplu sayım (batch mode)
- [ ] Mobil uygulama desteği
- [ ] PDF rapor export
- [ ] Email bildirimleri
- [ ] Otomatik sayım planlama (cron job)

---

**✅ Sistem hazır! Test et ve kullanmaya başla!** 🚀

