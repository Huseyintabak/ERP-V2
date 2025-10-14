# ✅ PRODUCTION DEPLOYMENT CHECKLIST

**Tarih:** 14 Ekim 2025  
**Commit:** 6933105  
**Özellikler:** Pricing, Inventory Count, Excel Export, BOM Yarı Mamul

---

## 📦 GITHUB (TAMAMLANDI ✅)

- [x] Git commit (3 commit)
- [x] Git push
- [x] GitHub repository güncel
- [x] Geçici dosyalar temizlendi

---

## 🗄️ SUPABASE MIGRATION (YAPILACAK)

### Production Supabase Dashboard

**URL:** https://supabase.com/dashboard/project/unodzubpvymgownyjrgz

### Migration 1: Pricing System
```bash
# Dosya: supabase/migrations/20251014-pricing-system.sql
# Tüm içeriği kopyala ve Supabase SQL Editor'a yapıştır
# RUN butonuna tıkla
```

**Kontrol:**
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'finished_products'
  AND column_name IN ('cost_price', 'profit_margin', 'last_price_update');
```
**Beklenen:** 3 kolon ✅

---

### Migration 2: Inventory Count
```bash
# Dosya: supabase/migrations/20251014-inventory-count.sql
# Tüm içeriği kopyala ve Supabase SQL Editor'a yapıştır
# RUN butonuna tıkla
```

**Kontrol:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('inventory_counts', 'inventory_count_batches');
```
**Beklenen:** 2 tablo ✅

---

## 🖥️ PRODUCTION SERVER (YAPILACAK)

### SSH Komutları

```bash
# 1. Bağlan
ssh vipkrom@192.168.1.250

# 2. Klasöre git
cd /var/www/thunder-erp

# 3. Git pull
git pull origin main

# 4. Install (xlsx paketi için)
npm install

# 5. Build
npm run build

# 6. Restart
pm2 restart thunder-erp

# 7. Status
pm2 status

# 8. Logs (error var mı?)
pm2 logs thunder-erp --lines 30
# Ctrl+C ile çık
```

---

## 🧪 PRODUCTION TEST (YAPILACAK)

### URL: http://192.168.1.250

### Test 1: Login
- Email: `admin@thunder.com`
- Şifre: `123456`
- **Beklenen:** Dashboard'a gir ✅

### Test 2: Depo Dashboard KPI
- URL: `/depo-dashboard`
- Login: `depo@thunder.com / 123456`
- **Kontrol:**
  - ✅ "Rezerve Stok" var
  - ✅ "Toplam Hareket" var
  - ❌ "Stok Değeri (₺)" YOK

### Test 3: BOM - Yarı Mamul
- URL: `/uretim/bom`
- Yarı mamul seç (örn: BR01_Braket_Kit18+)
- **"Malzeme Ekle"** tıkla
- **Kontrol:**
  - ✅ Sadece hammadde eklenebiliyor
  - ✅ Yarı mamul badge'i görünüyor

### Test 4: Maliyet Hesaplama
- Nihai ürün seç
- **"Maliyet Hesapla"** tıkla
- **Beklenen:** Modal açılır ✅

### Test 5: Envanter Sayımı
- `/depo-dashboard` → **"Envanter Sayımı"**
- Modal açılır ✅
- Sayım kaydet
- `/yonetici-dashboard` → Onay listesi görünür ✅

### Test 6: Excel Export
- `/raporlar` → **"Excel İndir"**
- Excel dosyası indirilir ✅

---

## 📊 DEPLOYMENT ÖZET

```
✅ Local:
   - Build başarılı
   - Test başarılı
   - Git push tamamlandı

⏳ Production:
   1. Supabase migration (5 dk)
   2. Server deployment (5 dk)
   3. Production test (5 dk)
   
⏰ Toplam: ~15 dakika
```

---

## 🎯 YENİ ÖZELLİKLER

### 1. Fiyatlandırma & Maliyet
- BOM maliyet hesaplama
- Kar marjı analizi
- Müşteri özel fiyat

### 2. Envanter Sayımı
- Fiziki stok sayımı
- Yönetici onay sistemi
- Otomatik stok güncelleme

### 3. Excel Export
- 4 tip rapor
- Çoklu worksheet
- Filtreleme

### 4. BOM İyileştirmeler
- Yarı mamul desteği
- Akıllı kısıtlama

### 5. Dashboard İyileştirmeler
- Depo KPI güncelleme
- Fiyat bilgisi gizleme

---

**Deployment'a başla! Sorun olursa söyle!** 🚀

