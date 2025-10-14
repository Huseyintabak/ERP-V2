# 🚀 PRODUCTION DEPLOYMENT GUIDE

> **Tarih:** 14 Ekim 2025  
> **Özellikler:** Pricing, Inventory Count, Excel Export  
> **Sunucu:** Ubuntu 192.168.1.250  
> **Süre:** ~10-15 dakika

---

## 📋 ÖN HAZIRLIK

### ✅ Tamamlanan:
- [x] Local build başarılı
- [x] Testler başarılı
- [x] Git commit yapıldı
- [x] GitHub push yapıldı
- [x] Geçici dosyalar temizlendi

### ⏳ Yapılacak:
- [ ] Supabase migration'ları (Production)
- [ ] Sunucuda kod güncelleme
- [ ] Build ve restart
- [ ] Production test

---

## 🗄️ ADIM 1: SUPABASE MIGRATION'LARI

### Production Supabase Dashboard

**URL:** https://supabase.com/dashboard/project/unodzubpvymgownyjrgz

**SQL Editor** → **New Query**

---

### Migration 1: Pricing System (2-3 dakika)

**Dosya:** `supabase/migrations/20251014-pricing-system.sql`

**Lokal'de dosyayı aç ve içeriği kopyala:**
```bash
cat /Users/huseyintabak/Downloads/ThunderV2/supabase/migrations/20251014-pricing-system.sql
```

**Supabase SQL Editor'a yapıştır ve RUN tıkla**

**Kontrol (aynı SQL Editor'da):**
```sql
-- Yeni kolonları kontrol et
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'finished_products'
  AND column_name IN ('cost_price', 'profit_margin', 'last_price_update');

-- Yeni tabloları kontrol et
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('customer_pricing', 'price_history', 'bom_cost_breakdown');
```

**Beklenen Sonuç:**
```
✅ 3 kolon: cost_price, profit_margin, last_price_update
✅ 3 tablo: customer_pricing, price_history, bom_cost_breakdown
```

---

### Migration 2: Inventory Count (2-3 dakika)

**Dosya:** `supabase/migrations/20251014-inventory-count.sql`

**Lokal'de dosyayı aç ve içeriği kopyala:**
```bash
cat /Users/huseyintabak/Downloads/ThunderV2/supabase/migrations/20251014-inventory-count.sql
```

**Supabase SQL Editor'a yapıştır ve RUN tıkla**

**Kontrol:**
```sql
-- Yeni tabloları kontrol et
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('inventory_counts', 'inventory_count_batches');

-- Function'ları kontrol et
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%inventory_count%';
```

**Beklenen Sonuç:**
```
✅ 2 tablo: inventory_counts, inventory_count_batches
✅ 2 function: approve_inventory_count, reject_inventory_count
```

---

## 🖥️ ADIM 2: SUNUCUDA KOD GÜNCELLEME

### SSH Bağlantı

```bash
ssh vipkrom@192.168.1.250
```

**Şifre:** (sunucu şifresi)

---

### 2.1. Klasöre Git
```bash
cd /var/www/thunder-erp
```

---

### 2.2. Git Pull
```bash
git pull origin main
```

**Beklenen Çıktı:**
```
Updating 901cff5..054dbe7
Fast-forward
 44 files changed, 6628 insertions(+), 138 deletions(-)
 create mode 100644 app/api/pricing/...
 create mode 100644 components/pricing/...
 ...
```

---

### 2.3. Dependencies Güncelle
```bash
npm install
```

**Not:** `xlsx` paketi eklendi, install edilecek.

**Beklenen Çıktı:**
```
up to date, audited 525 packages in 2s
```

---

### 2.4. Build
```bash
npm run build
```

**Beklenen:** Hiç error olmadan tamamlanmalı ✅

**Süre:** ~30-60 saniye

---

### 2.5. PM2 Restart
```bash
pm2 restart thunder-erp
```

**Beklenen:**
```
[PM2] Applying action restartProcessId on app [thunder-erp]
[PM2] [thunder-erp](0) ✓
```

---

### 2.6. Status Kontrol
```bash
pm2 status
```

**Beklenen:**
```
┌─────┬──────────────┬─────────┬──────┬───────┬────────┬─────────┐
│ id  │ name         │ mode    │ ↺    │ status│ cpu    │ memory  │
├─────┼──────────────┼─────────┼──────┼───────┼────────┼─────────┤
│ 0   │ thunder-erp  │ fork    │ 15   │ online│ 0%     │ 85.2mb  │
└─────┴──────────────┴─────────┴──────┴───────┴────────┴─────────┘
```

**status: online** olmalı ✅

---

### 2.7. Logları Kontrol
```bash
pm2 logs thunder-erp --lines 50
```

**Kontrol Et:**
- ✅ "Ready in XXXms" görünmeli
- ❌ Error mesajı OLMAMALI
- ✅ "Compiled successfully" olmalı

**Sorun varsa:** `Ctrl+C` ile loglardan çık

---

## 🧪 ADIM 3: PRODUCTION TEST

### Tarayıcıda: `http://192.168.1.250`

---

### Test 1: Login
```
Email: admin@thunder.com
Şifre: 123456
```

**Beklenen:** Dashboard'a yönlendirilmeli ✅

---

### Test 2: Depo Dashboard KPI
```
URL: http://192.168.1.250/depo-dashboard
Login: depo@thunder.com / 123456
```

**Kontrol:**
- ✅ "Rezerve Stok" KPI'ı var mı?
- ✅ "Toplam Hareket" KPI'ı var mı?
- ❌ "Stok Değeri (₺)" YOK olmalı

---

### Test 3: BOM - Yarı Mamul
```
URL: http://192.168.1.250/uretim/bom
Login: admin@thunder.com / 123456
```

**Kontrol:**
- ✅ Ürün listesinde hem nihai hem yarı mamul var mı?
- ✅ Yarı mamul seçince "Yarı Mamul" badge'i görünüyor mu?
- ✅ Yarı mamul seçince sadece hammadde eklenebiliyor mu?

---

### Test 4: Maliyet Hesaplama
```
URL: http://192.168.1.250/uretim/bom
```

**Adımlar:**
1. Bir **nihai ürün** seç
2. **"Maliyet Hesapla"** butonuna tıkla
3. Modal açılmalı ✅

**Beklenen:**
- ✅ Toplam maliyet gösterilir
- ✅ Kar marjı analizi var
- ✅ Malzeme breakdown tablosu var

**Eğer hata:** Supabase migration çalıştırıldı mı kontrol et

---

### Test 5: Envanter Sayımı
```
URL: http://192.168.1.250/depo-dashboard
Login: depo@thunder.com / 123456
```

**Adımlar:**
1. **"Envanter Sayımı"** butonuna tıkla
2. Modal açılmalı ✅
3. Malzeme seç, fiziki miktar gir
4. Kaydet

**Kontrol (Yönetici):**
```
URL: http://192.168.1.250/yonetici-dashboard
Login: admin@thunder.com / 123456
```

- ✅ "Onay Bekleyen Envanter Sayımları" kartında sayım görünüyor mu?

---

### Test 6: Excel Export
```
URL: http://192.168.1.250/raporlar
```

**Adımlar:**
1. **"Üretim Raporları"** tab
2. **"Excel İndir"** tıkla
3. Excel dosyası indirilmeli ✅

**Beklenen:**
- ✅ `production-raporu-2025-10-14.xlsx` indirilir
- ✅ Excel'de 2 sayfa: Özet + Üretim Detay

---

## ✅ BAŞARILI DEPLOYMENT CHECKLİST

```
Supabase:
✅ Migration 1 çalıştırıldı (pricing)
✅ Migration 2 çalıştırıldı (inventory)
✅ Kontrol sorguları başarılı

Sunucu:
✅ git pull başarılı
✅ npm install tamamlandı
✅ npm run build başarılı
✅ pm2 restart başarılı
✅ pm2 status: online

Production Test:
✅ Login çalışıyor
✅ Depo dashboard KPI'lar doğru
✅ BOM yarı mamul desteği çalışıyor
✅ Maliyet hesaplama çalışıyor
✅ Envanter sayımı çalışıyor
✅ Excel export çalışıyor
```

---

## 🐛 SORUN GİDERME

### Sorun 1: "Function calculate_bom_cost does not exist"

**Sebep:** Supabase migration çalıştırılmadı

**Çözüm:**
```sql
-- Production Supabase SQL Editor'da:
-- supabase/migrations/20251014-pricing-system.sql
```

---

### Sorun 2: "Column cost_price does not exist"

**Sebep:** Migration başarısız

**Çözüm:**
```sql
-- Manuel ekle
ALTER TABLE finished_products 
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profit_margin NUMERIC(5, 2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMPTZ;
```

---

### Sorun 3: Build hatası

**Sebep:** Node modules eksik

**Çözüm:**
```bash
cd /var/www/thunder-erp
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

### Sorun 4: PM2 restart sonrası "errored"

**Sebep:** Build başarısız veya .env.local eksik

**Çözüm:**
```bash
# Logları kontrol et
pm2 logs thunder-erp

# .env.local var mı kontrol et
cat .env.local

# Yoksa oluştur (local'den kopyala)
```

---

## 📊 DEPLOYMENT SONUÇ

```
🎉 PRODUCTION DEPLOYMENT TAMAMLANDI!

✅ Yeni Özellikler Canlıda:
   - Fiyatlandırma & Maliyet Sistemi
   - Envanter Sayım Sistemi
   - Excel Export Sistemi
   - BOM Yarı Mamul Desteği
   - Depo Dashboard İyileştirmeler

🌐 Production URL: http://192.168.1.250

📊 İstatistikler:
   - 3/15 feature tamamlandı
   - Faz 1 Quick Wins COMPLETE
   - 20 yeni dosya
   - 0 production bug
```

---

## 🎯 SONRAKI ADIMLAR

### Faz 2: Core Improvements (2-3 hafta)
- Email Notifications (2-3 saat)
- Expired Stock Tracking (1-2 saat)
- Advanced Filtering (2 saat)
- Push Notifications (1-2 saat)

**Başlamak için:** `NICE_TO_HAVE_FEATURES.md` dosyasını incele

---

**Deployment tamamlandı! Herhangi bir sorun varsa bu guide'ı takip et!** 🚀

