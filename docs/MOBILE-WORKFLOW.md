# 📱 Mobil İş Akışı - Stok Yönetimi

## 🎯 Barkod Okuyucu İş Akışı

### Senaryo 1: Mal Kabul (Stok Giriş)

```
1. Mobil Dashboard → "Barkod Oku" butonuna tıkla
2. Kamera ile barkod okut
3. Ürün bilgileri gösterilir
4. "Stok Giriş" butonuna tıkla
5. Miktar gir (numpad ile)
6. Konum/Raf seç
7. Not ekle (opsiyonel)
8. "Kaydet" → ✅ Stok güncellendi!
```

### Senaryo 2: Sevkiyat (Stok Çıkış)

```
1. Mobil Dashboard → "Barkod Oku" butonuna tıkla
2. Kamera ile barkod okut
3. Ürün bilgileri gösterilir
4. "Stok Çıkış" butonuna tıkla
5. Miktar gir (numpad ile)
6. Çıkış nedeni yaz (Satış, Fire, vb.)
7. "Kaydet" → ✅ Stok azaltıldı!
```

### Senaryo 3: Hızlı Stok Sorgulama

```
1. Mobil Dashboard → "Barkod Oku"
2. Kamera ile barkod okut
3. ✅ Ürün bilgileri:
   - Ürün adı
   - Kategori
   - Mevcut stok
   - Fiyat
   - Konum/Raf
```

---

## 📄 Sayfalar ve Özellikleri

### 1. Mobil Dashboard (`/depo/mobile-dashboard`)
- Günlük istatistikler
- Hızlı erişim butonları
- Son işlemler
- Uyarılar

### 2. Barkod Okuyucu (`/depo/scanner`)
- Kamera ile okuma (ZXing)
- Manuel barkod girişi
- Ürün bilgisi gösterimi
- Direkt stok giriş/çıkış butonları
- Scan history

### 3. Stok Giriş (`/depo/stok-giris`)
- Barkod ile ürün seçimi
- Numpad ile miktar girişi
- Konum/Raf seçimi
- Not ekleme
- Son işlemler listesi

### 4. Stok Çıkış (`/depo/stok-cikis`)
- Barkod ile ürün seçimi
- Numpad ile miktar girişi
- Çıkış nedeni
- Stok kontrolü (yetersiz stok uyarısı)
- Son işlemler listesi

---

## 🔄 API Endpoints

### Ürün Sorgulama
```
GET /api/products/by-barcode/:barcode
```

### Stok Giriş
```
POST /api/stock/entry
Body: {
  product_id, 
  quantity, 
  location, 
  notes
}
```

### Stok Çıkış
```
POST /api/stock/exit
Body: {
  product_id, 
  quantity, 
  location, 
  notes
}
```

---

## ✨ Özellikler

### PWA
- ✅ Offline çalışma
- ✅ Ana ekrana eklenebilir
- ✅ Push notification (yakında)
- ✅ Background sync (yakında)

### Barkod Okuyucu
- ✅ ZXing kütüphanesi (iOS/Android uyumlu)
- ✅ Continuous scanning
- ✅ Vibration feedback
- ✅ Visual scanning frame
- ✅ Manuel input fallback

### Stok İşlemleri
- ✅ Numpad input
- ✅ +/- butonları
- ✅ Real-time stok kontrolü
- ✅ Yetersiz stok uyarısı
- ✅ Son işlemler geçmişi
- ✅ Lokasyon tracking

---

## 🚀 Başlangıç

1. **HTTPS ile çalıştırın** (kamera için gerekli):
   ```bash
   ngrok http 3001
   ```

2. **Mobil cihazdan erişin**:
   ```
   https://xxxx.ngrok-free.app/depo/mobile-dashboard
   ```

3. **Ana ekrana ekleyin** (PWA):
   - iOS: Safari → Paylaş → Ana Ekrana Ekle
   - Android: Chrome → Menü → Ana ekrana ekle

4. **Kullanmaya başlayın!** 📱

---

## 💡 İpuçları

- 🔋 **Batarya Tasarrufu**: Kamera kullanımı sonrası "Durdur" butonuna basın
- 📶 **Offline Mod**: İnternet kesilse bile işlemler queue'lanır
- 🎯 **Hızlı İşlem**: Barkod okut → Miktar gir → Kaydet (3 saniye!)
- 📊 **İstatistikler**: Dashboard'da günlük özet görüntüleyin

---

**Geliştirme:** Thunder Team 🚀
**Versiyon:** 1.0.0
