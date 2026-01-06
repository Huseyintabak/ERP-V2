# 📱 Mobil PWA - Depo Yönetim Sistemi

## 🎯 Genel Bakış

Thunder Depo Yönetim Sistemi artık **Progressive Web App (PWA)** olarak çalışıyor! 

Mobil cihazlardan:
- 📸 Kamera ile barkod okuma
- 📦 Hızlı stok giriş/çıkış
- ✅ Stok sayımı
- 🔄 Raf transferleri
- 🔍 Ürün sorgulama
- 📶 Offline çalışma

---

## 🚀 Kurulum ve Kullanım

### Geliştirme Ortamında Test

#### 1. Bilgisayarınızın IP adresini öğrenin:
```bash
# Mac/Linux
ifconfig | grep "inet "

# Windows
ipconfig

# Örnek: 192.168.1.100
```

#### 2. Next.js'i network'te başlatın:
```bash
npm run dev -- -H 0.0.0.0
```

#### 3. Telefonunuzdan bağlanın:
```
http://192.168.1.100:3000/depo/mobile-dashboard
```

**NOT:** Telefon ve bilgisayar aynı WiFi ağında olmalı!

---

## 📱 Ana Ekrana Ekleme (PWA Install)

### iOS (Safari):
1. Safari'de siteyi açın
2. Paylaş butonuna (⬆️) tıklayın
3. "Ana Ekrana Ekle" seçin
4. İsmi düzenleyip "Ekle"ye tıklayın

### Android (Chrome):
1. Chrome'da siteyi açın
2. Menü (⋮) açın
3. "Ana ekrana ekle" seçin
4. "Ekle"yi onaylayın

### Sonuç:
✅ App gibi açılır (browser bar olmadan)
✅ Splash screen gösterir
✅ Offline çalışır
✅ Push notification alır

---

## 🎨 Mobil Sayfalar

### 1. Mobil Dashboard
**Yol:** `/depo/mobile-dashboard`

**Özellikler:**
- Günlük istatistikler
- Hızlı erişim butonları
- Son işlemler
- Düşük stok uyarıları
- PWA kurulum hatırlatıcısı

### 2. Barkod Okuyucu
**Yol:** `/depo/scanner`

**Özellikler:**
- Kamera ile barkod/QR kod okuma
- Manuel barkod girişi
- Flaş/Torch kontrolü
- Ürün bilgisi gösterimi
- Stok seviyesi kontrolü
- Hızlı stok işlemi butonları
- Son tarananlar geçmişi

**Klavye Kısayolları:**
- 📸 Kamera başlat/durdur
- ⌨️ Manuel giriş
- 💡 Flaş aç/kapa

### 3. Stok Giriş (Yapım Aşamasında)
**Yol:** `/depo/stok-giris`

**Planlanan Özellikler:**
- Barkod okuyup hızlı giriş
- Miktar girişi (numpad)
- Konum/Raf seçimi
- Toplu kaydetme
- Offline queue

### 4. Stok Çıkış (Yapım Aşamasında)
**Yol:** `/depo/stok-cikis`

**Planlanan Özellikler:**
- Barkod okuyup hızlı çıkış
- Miktar girişi
- Çıkış nedeni
- Onay ekranı

### 5. Stok Sayım (Yapım Aşamasında)
**Yol:** `/depo/sayim`

**Planlanan Özellikler:**
- Sayım başlatma
- Barkod oku → miktar gir
- Sayım listesi
- Farklılık analizi
- Sayım raporu

### 6. Transfer (Yapım Aşamasında)
**Yol:** `/depo/transfer`

**Planlanan Özellikler:**
- Kaynak → Hedef raf
- Barkod ile ürün seç
- Miktar girişi
- Transfer onayı

### 7. Ürün Arama (Yapım Aşamasında)
**Yol:** `/depo/urun-ara`

**Planlanan Özellikler:**
- Metin arama
- Barkod arama
- Kategori filtresi
- Detaylı ürün bilgisi

---

## 🔧 Teknik Detaylar

### Kullanılan Teknolojiler

```json
{
  "PWA": "@ducanh2912/next-pwa",
  "Barkod Okuma": "html5-qrcode",
  "Framework": "Next.js 14",
  "UI": "Tailwind CSS + shadcn/ui",
  "Database": "Supabase/PostgreSQL",
  "Offline": "Service Worker + Cache API"
}
```

### PWA Özellikleri

#### 1. Manifest.json
```json
{
  "name": "Thunder Depo Yönetim",
  "short_name": "Depo",
  "display": "standalone",
  "start_url": "/depo/mobile-dashboard"
}
```

#### 2. Service Worker
- Static asset caching
- API response caching
- Offline fallback
- Background sync

#### 3. Cache Stratejisi
```javascript
{
  handler: 'NetworkFirst',
  cacheName: 'offlineCache',
  maxEntries: 200
}
```

### API Endpoints

#### Barkod Sorgulama
```typescript
GET /api/products/by-barcode/:barcode

Response:
{
  id: string,
  code: string,
  name: string,
  barcode: string,
  category: string,
  price: number,
  stock: number,
  location: string,
  type: string
}
```

---

## 📊 Dosya Yapısı

```
ThunderV2/
├── app/(dashboard)/depo/
│   ├── mobile-dashboard/page.tsx    # Ana mobil sayfa
│   ├── scanner/page.tsx              # Barkod okuyucu
│   ├── stok-giris/page.tsx          # [Yapım aşamasında]
│   ├── stok-cikis/page.tsx          # [Yapım aşamasında]
│   ├── sayim/page.tsx               # [Yapım aşamasında]
│   └── transfer/page.tsx            # [Yapım aşamasında]
│
├── app/api/products/
│   └── by-barcode/[barcode]/route.ts # Barkod API
│
├── public/
│   ├── manifest.json                 # PWA manifest
│   └── icons/                        # App iconları
│
└── docs/
    └── MOBILE-PWA.md                 # Bu dosya
```

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Mal Kabul
```
1. Mobil dashboard açılır
2. "Barkod Oku" butonuna tıklanır
3. Kamera ile barkod okunur
4. Ürün bilgileri görüntülenir
5. "Stok Giriş" butonuna basılır
6. Miktar girilir
7. Kaydet!
```

### Senaryo 2: Hızlı Sayım
```
1. "Sayım" sayfası açılır
2. Sayım başlatılır
3. Barkod okunur → miktar girilir
4. Bir sonraki ürün... (döngü)
5. Sayım tamamlanır
6. Rapor görüntülenir
```

### Senaryo 3: Raf Transferi
```
1. "Transfer" sayfası açılır
2. Kaynak raf seçilir
3. Barkod okunur
4. Miktar girilir
5. Hedef raf seçilir
6. Transfer onaylanır
```

---

## 🔐 Güvenlik

### Kamera İzinleri
- Kullanıcıdan izin istenir
- HTTPS gereklidir (production'da)
- localhost'ta izin gerekli değil

### Offline Data
- IndexedDB'de saklanır
- Şifreleme yapılabilir
- Senkronizasyon ile güncellenir

---

## 🐛 Sorun Giderme

### Kamera Açılmıyor
1. Tarayıcı izinlerini kontrol edin
2. HTTPS kullanın (production'da)
3. Safari'de "Kamera" iznini verin
4. Chrome'da "Site Ayarları" → "Kamera"

### PWA Kurulamıyor
1. HTTPS kullanıyor musunuz? (production)
2. manifest.json doğru mu?
3. Service Worker kayıtlı mı?
4. Tarayıcıyı yenileyin (Hard refresh)

### Offline Çalışmıyor
1. Service Worker aktif mi? (DevTools → Application)
2. Cache oluştu mu?
3. Network modu "Offline" yapıp test edin

### Barkod Okunmuyor
1. Işık yeterli mi?
2. Flaş açık mı?
3. Barkod net mi?
4. Alternatif: Manuel giriş kullanın

---

## 📈 Gelecek Özellikler

### Phase 1 (Tamamlandı) ✅
- [x] PWA altyapısı
- [x] Mobil dashboard
- [x] Barkod okuyucu
- [x] Kamera entegrasyonu
- [x] Barkod API

### Phase 2 (Devam Ediyor) 🚧
- [ ] Stok giriş sayfası
- [ ] Stok çıkış sayfası
- [ ] Sayım sayfası
- [ ] Transfer sayfası
- [ ] Ürün arama

### Phase 3 (Planlı) 📋
- [ ] Push notifications
- [ ] Offline sync
- [ ] Background sync API
- [ ] Multi-user support

### Phase 4 (Gelecek) 🔮
- [ ] Raporlar (mobil)
- [ ] Grafik/İstatistikler
- [ ] Export (PDF/Excel)
- [ ] QR kod üretimi

---

## 💡 İpuçları

### Performans
- Service Worker cache'i kullanın
- İmage'leri optimize edin
- Lazy loading kullanın
- API response'larını cache'leyin

### UX/UI
- Touch target'ları büyük tutun (min 44px)
- Numpad keyboard kullanın
- Toast notification gösterin
- Loading state'leri ekleyin
- Haptic feedback verin (vibration)

### Geliştirme
- Chrome DevTools → Device Mode
- Responsive design test
- Lighthouse audit çalıştırın
- PWA score'unu kontrol edin

---

## 📞 Destek

Sorularınız için:
- GitHub Issues
- Dokümantasyon
- API referansı

---

## 📝 Changelog

### v1.0.0 (2024-01-06)
- ✅ PWA altyapısı eklendi
- ✅ Mobil dashboard oluşturuldu
- ✅ Barkod okuyucu sayfası eklendi
- ✅ Kamera entegrasyonu (html5-qrcode)
- ✅ Barkod API endpoint'i
- ✅ Manifest.json yapılandırması
- ✅ Service Worker kurulumu
- ✅ Offline cache stratejisi

---

**Geliştirme:** Thunder Team 🚀
**Lisans:** MIT
**Versiyon:** 1.0.0