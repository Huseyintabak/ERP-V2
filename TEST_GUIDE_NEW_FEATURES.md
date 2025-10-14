# 🧪 YENİ ÖZELLİKLER TEST REHBERİ

> **Tarih:** 14 Ekim 2025  
> **Özellikler:** Fiyatlandırma, Envanter Sayımı, Excel Export  
> **Test Süresi:** ~15-20 dakika

---

## ✅ PRE-TEST CHECKLIST

- [x] ✅ Build başarılı (`npm run build`)
- [ ] ⏳ Supabase migration 1 çalıştırıldı (pricing-system)
- [ ] ⏳ Supabase migration 2 çalıştırıldı (inventory-count)
- [ ] ⏳ Development server çalışıyor (`npm run dev`)

---

## 🧪 TEST SENARYOLARI

### **TEST 1: Fiyatlandırma & Maliyet Sistemi** 💰

#### 1.1. BOM Maliyet Hesaplama (BOM Sayfası)

**Adımlar:**
1. `http://localhost:3000/uretim/bom` git
2. Bir nihai ürün seç (örn: "Berlingo_2018+_2x")
3. **"Maliyet Hesapla"** butonuna tıkla (sağ üst, mavi Calculator ikonu)

**Beklenen Sonuç:**
- ✅ Modal açılır
- ✅ Toplam maliyet gösterilir (hammadde + yarı mamul)
- ✅ Kar marjı analizi var
- ✅ Detaylı malzeme breakdown tablosu
- ✅ Önerilen fiyat hesaplanmış

**Başarılı ise:** ✅ Test 1.1 PASSED

---

#### 1.2. Maliyet Hesaplama (Nihai Ürünler Sayfası)

**Adımlar:**
1. `http://localhost:3000/stok/nihai-urunler` git
2. Bir ürünün satırında mavi **Calculator** ikonuna tıkla

**Beklenen Sonuç:**
- ✅ Aynı maliyet hesaplama modal'ı açılır
- ✅ BOM maliyeti, kar marjı gösterilir

**Başarılı ise:** ✅ Test 1.2 PASSED

---

#### 1.3. API Test (Console)

**Browser Console'da:**
```javascript
fetch('/api/pricing/calculate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({productId: 'a8b40901-9b77-4d5b-a90e-e8d1ea313993'})
})
.then(r => r.json())
.then(console.log)
```

**Beklenen Sonuç:**
```json
{
  "success": true,
  "calculation": {
    "total_cost": 123.45,
    "item_count": 5
  },
  "profitability": {
    "profit_percentage": 20.5
  }
}
```

**Başarılı ise:** ✅ Test 1.3 PASSED

---

### **TEST 2: Envanter Sayım Sistemi** 📦

#### 2.1. Envanter Sayımı Başlatma (Depo Dashboard)

**Login:** `depo@thunder.com / 123456`

**Adımlar:**
1. `http://localhost:3000/depo-dashboard` git
2. Quick Actions → **"Envanter Sayımı"** tıkla
3. Malzeme Tipi: **Hammadde** seç
4. Malzeme: Herhangi bir hammadde seç
5. Fiziki Sayım Miktarı: **Farklı bir değer** gir (örn: sistem 100 ise 95 yaz)
6. Notlar: "Test sayımı"
7. **"Kaydet ve Onaya Gönder"** tıkla

**Beklenen Sonuç:**
- ✅ Sistem stoğu otomatik gösterilir
- ✅ Fark hesaplanır (-5)
- ✅ Sapma yüzdesi gösterilir (-5%)
- ✅ Sapma seviyesi badge'i (Orta Sapma)
- ✅ Toast mesajı: "Envanter sayımı kaydedildi"
- ✅ Modal kapanır

**Başarılı ise:** ✅ Test 2.1 PASSED

---

#### 2.2. Sayım Onaylama (Yönetici Dashboard)

**Login:** `admin@thunder.com / 123456`

**Adımlar:**
1. `http://localhost:3000/yonetici-dashboard` git
2. Aşağı scroll et → **"Onay Bekleyen Envanter Sayımları"** kartını bul
3. Az önce oluşturduğun sayımı gör
4. **Yeşil ✓** ikonuna tıkla (Onayla)
5. Confirm dialog'da **OK** tıkla

**Beklenen Sonuç:**
- ✅ Toast mesajı: "Sayım onaylandı ve stok güncellendi"
- ✅ Sayım listeden kalkmalı
- ✅ Stok otomatik güncellenmeli

**Kontrol (SQL):**
```sql
-- Sayım durumu
SELECT status, stock_adjusted FROM inventory_counts 
WHERE status = 'approved' 
ORDER BY created_at DESC LIMIT 1;

-- stock_adjusted = true olmalı
```

**Başarılı ise:** ✅ Test 2.2 PASSED

---

#### 2.3. Sayım Reddetme

**Adımlar:**
1. Yeni bir sayım oluştur (Test 2.1 tekrarla)
2. Yönetici dashboard'da
3. **Kırmızı ✗** ikonuna tıkla (Reddet)
4. Red sebebi yaz: "Test red"
5. **"Reddet"** tıkla

**Beklenen Sonuç:**
- ✅ Toast mesajı: "Sayım reddedildi"
- ✅ Sayım listeden kalkmalı
- ✅ Stok değişmemeli

**Başarılı ise:** ✅ Test 2.3 PASSED

---

### **TEST 3: Excel Export Sistemi** 📊

#### 3.1. Üretim Raporu Export

**Adımlar:**
1. `http://localhost:3000/raporlar` git
2. **"Üretim Raporları"** tab'ına git
3. Sağ üstteki **"Excel İndir"** butonuna tıkla

**Beklenen Sonuç:**
- ✅ `production-raporu-2025-10-14.xlsx` dosyası indirilir
- ✅ Excel'de açıldığında:
  - Sheet 1: "Özet" (toplam plan, tamamlanan, vs.)
  - Sheet 2: "Üretim Detay" (plan kodu, sipariş, ürün, ilerleme...)

**Başarılı ise:** ✅ Test 3.1 PASSED

---

#### 3.2. Stok Raporu Export

**Adımlar:**
1. Raporlar sayfasında **"Stok Raporları"** tab'ına git
2. **"Excel İndir"** tıkla

**Beklenen Sonuç:**
- ✅ `stock-raporu-2025-10-14.xlsx` indirilir
- ✅ Excel'de 4 sayfa var:
  - Sheet 1: "Özet" (toplam ürün, kritik stok, toplam değer)
  - Sheet 2: "Hammaddeler" (86 adet)
  - Sheet 3: "Yarı Mamüller" (12 adet)
  - Sheet 4: "Nihai Ürünler" (244 adet)

**Başarılı ise:** ✅ Test 3.2 PASSED

---

#### 3.3. Operatör Raporu Export

**Adımlar:**
1. **"Operatör Raporları"** tab'ına git
2. **"Operatör Raporu İndir"** tıkla

**Beklenen Sonuç:**
- ✅ `operators-raporu-2025-10-14.xlsx` indirilir
- ✅ 2 sayfa: Özet + Operatör Detayları

**Başarılı ise:** ✅ Test 3.3 PASSED

---

#### 3.4. Sipariş Raporu Export

**Adımlar:**
1. **"Sipariş Raporları"** tab'ına git
2. **"Excel İndir"** tıkla

**Beklenen Sonuç:**
- ✅ `orders-raporu-2025-10-14.xlsx` indirilir
- ✅ 3 sayfa: Özet + Sipariş Detay + Müşteri Analizi

**Başarılı ise:** ✅ Test 3.4 PASSED

---

#### 3.5. Tümünü İndir

**Adımlar:**
1. Raporlar sayfasında sağ üstteki **"Tümünü İndir"** butonuna tıkla

**Beklenen Sonuç:**
- ✅ 4 Excel dosyası sırayla indirilir (500ms aralıklarla):
  1. `production-raporu-*.xlsx`
  2. `stock-raporu-*.xlsx`
  3. `operators-raporu-*.xlsx`
  4. `orders-raporu-*.xlsx`

**Başarılı ise:** ✅ Test 3.5 PASSED

---

## 🔍 **HATA SENARYOLARI**

### Senaryo 1: Maliyet Hesaplama Hatası

**Hata:** "BOM bulunamadı" mesajı

**Çözüm:** Normal! Bazı ürünlerin BOM'u yok.
- BOM'u olan bir ürün seç
- Veya önce BOM oluştur

---

### Senaryo 2: Excel İndirilmiyor

**Hata:** Hiçbir şey olmuyor

**Çözüm:** 
1. Browser console'u kontrol et (F12)
2. Network tab'da API çağrısını gör
3. 200 OK dönüyor mu?
4. Pop-up blocker'ı kapat

---

### Senaryo 3: Envanter Sayımı Görünmüyor

**Hata:** Yönetici dashboard'da liste boş

**Çözüm:** 
1. Depo kullanıcısı sayım yaptı mı?
2. SQL kontrol: `SELECT * FROM inventory_counts WHERE status = 'pending';`
3. Migration çalıştırıldı mı?

---

## ✅ **TEST SONUÇLARI**

### Başarılı Testler:

- [ ] Test 1.1: BOM Maliyet Hesaplama (BOM sayfası)
- [ ] Test 1.2: Maliyet Hesaplama (Stok sayfası)
- [ ] Test 1.3: API Test (Console)
- [ ] Test 2.1: Envanter Sayımı Başlatma
- [ ] Test 2.2: Sayım Onaylama
- [ ] Test 2.3: Sayım Reddetme
- [ ] Test 3.1: Üretim Raporu Export
- [ ] Test 3.2: Stok Raporu Export
- [ ] Test 3.3: Operatör Raporu Export
- [ ] Test 3.4: Sipariş Raporu Export
- [ ] Test 3.5: Tümünü İndir

---

## 📝 **TEST SONRASI ADIMLAR**

### Tüm testler başarılı ise:

```bash
# 1. Git add
git add .

# 2. Commit (anlamlı mesaj)
git commit -m "feat: 3 major özellik - Faz 1 Complete 🎉

✅ Fiyatlandırma & Maliyet Sistemi:
- BOM bazlı otomatik maliyet hesaplama
- Kar marjı analizi ve simülasyon
- Müşteri özel fiyatlandırma
- 3 API endpoint, 2 component

✅ Envanter Sayım Sistemi:
- Fiziki stok sayımı modal (depo)
- Yönetici onay/red sistemi
- Otomatik stok güncelleme
- CSV export, 4 API endpoint

✅ Excel Export Sistemi:
- 4 tip rapor (üretim, stok, operatör, sipariş)
- Çoklu worksheet (özet + detay)
- Tarih/durum filtreleme
- Tümünü indir özelliği

📊 İstatistikler:
- 20 yeni dosya oluşturuldu
- 5 dosya değiştirildi
- 3 README eklendi
- ~4-5 saat geliştirme
- Faz 1 Quick Wins TAMAMLANDI!"

# 3. Push to GitHub
git push origin main
```

---

## 🚀 **PRODUCTION DEPLOYMENT**

### Sunucuda (SSH):

```bash
# 1. Bağlan
ssh vipkrom@192.168.1.250

# 2. Klasöre git
cd /var/www/thunder-erp

# 3. Son kodu çek
git pull origin main

# 4. Dependencies güncelle (yeni: xlsx)
npm install

# 5. Build
npm run build

# 6. PM2 restart
pm2 restart thunder-erp

# 7. Logları kontrol et
pm2 logs thunder-erp --lines 50
```

### Supabase Migration (Production'da aynı):

**Dikkat:** Local'de yaptığın migration'ları Production Supabase'de de çalıştır!

1. Production Supabase Dashboard → SQL Editor
2. `supabase/migrations/20251014-pricing-system.sql` çalıştır
3. `supabase/migrations/20251014-inventory-count.sql` çalıştır

---

## 🎯 **TEST SONUÇ RAPORU**

Test tamamlandığında buraya sonuçları yaz:

### Başarılı:
- [ ] Pricing System
- [ ] Inventory Count
- [ ] Excel Export

### Hatalar (varsa):
```
Hata 1: ...
Çözüm: ...
```

---

**Testlere başla ve sonuçları paylaş!** 🚀

