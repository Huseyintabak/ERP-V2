# Stok Sayım Özelliği

## 📋 Genel Bakış

Stok Sayım özelliği, fiziksel stok sayımı yaparak sistem stoğu ile gerçek stok arasındaki farkları tespit etmenizi ve otomatik düzeltme yapmanızı sağlar.

## 🎯 Özellikler

- ✅ **Barkod/QR Tarama**: Sürekli tarama modu ile hızlı ürün ekleme
- ✅ **Sistem vs Gerçek Karşılaştırma**: Anlık fark hesaplama
- ✅ **Merkez Depo Odaklı**: Her zaman merkez depo üzerinden sayım
- ✅ **Otomatik Düzeltme**: Sayım sonrası stok otomatik güncelleme
- ✅ **Detaylı Kayıt**: Tüm sayım hareketleri kaydedilir

## 🚀 Kullanım

### 1. Sayım Başlatma

1. Mobile Dashboard'dan **"Stok Sayım"** kartına tıklayın
2. Kamera ile tarama ekranı açılır
3. Ürün barkodlarını/QR kodlarını tarayın

### 2. Ürün Tarama

- **Kamera ile Tara** butonuna basın
- Ürün barkodunu kameraya gösterin
- Ürün otomatik olarak listeye eklenir
- Sistem stoğu otomatik gösterilir

### 3. Gerçek Miktar Girişi

Her ürün için:
1. **"Gerçek Miktarı Gir"** butonuna basın
2. Fiziksel sayımda bulduğunuz miktarı girin
3. **"Kaydet"** butonuna basın
4. Fark otomatik hesaplanır

### 4. Fark Gösterimi

Sistem 3 tip fark gösterir:

- 🟢 **Artış (+)**: Gerçek > Sistem (fazla stok bulundu)
- 🔴 **Eksilme (-)**: Gerçek < Sistem (eksik stok bulundu)
- ⚪ **Eşit (-)**: Gerçek = Sistem (fark yok)

### 5. Sayımı Tamamlama

1. Tüm ürünler için gerçek miktar girildiğinde
2. **"Sayımı Tamamla"** butonu aktif olur
3. Butona basarak kaydedin
4. Sistem stokları otomatik günceller

## 📊 Sayım Sonrası

### Stok Güncelleme

Sayım tamamlandığında sistem:

1. **Zone Inventory**: Merkez depo stoğunu günceller
2. **Product Total**: Ürün toplam stoğunu düzeltir
3. **Stock Movement**: Hareket kaydı oluşturur

### Hareket Tipleri

- `sayim_artis`: Gerçek stok sistem stoğundan fazla
- `sayim_eksilme`: Gerçek stok sistem stoğundan az

### Örnek Kayıt

```
Stok sayım düzeltmesi - Merkez Depo
Sistem: 100, Sayım: 95, Fark: -5
```

## 🔍 API Endpoints

### POST /api/warehouse/stock-count

Sayım sonuçlarını kaydeder ve stok düzeltir.

**Request Body:**
```json
{
  "zoneId": "uuid",
  "countItems": [
    {
      "productId": "uuid",
      "materialType": "finished",
      "systemQuantity": 100,
      "actualQuantity": 95
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Stok sayımı tamamlandı. 5 üründe düzeltme yapıldı.",
  "results": [...],
  "summary": {
    "totalItems": 10,
    "adjustedItems": 5,
    "unchangedItems": 5
  }
}
```

### GET /api/warehouse/stock-count

Sayım geçmişini getirir.

**Query Params:**
- `limit`: Sayfa başına kayıt (default: 50)
- `page`: Sayfa numarası (default: 1)

## 📱 Ekran Görüntüleri

### Ana Ekran

- Header: Zone adı, sayılan ürün sayısı
- Stats: Sayılan/Toplam/Toplam Fark
- Scanner: Kamera tarama butonu
- Liste: Taranan ürünler

### Ürün Kartı

Her ürün kartında:
- Ürün adı ve kodu
- Material type badge
- 3 sütunlu miktar gösterimi:
  - **Sistem**: Mevcut stok
  - **Sayım**: Girilen gerçek miktar
  - **Fark**: Hesaplanan fark (renkli gösterim)
- Miktar giriş/düzenle butonu
- Sil butonu

## ⚠️ Önemli Notlar

1. **Sadece Merkez Depo**: Sayım sadece merkez depo için yapılır
2. **Bir Kere Sayın**: Aynı ürün listede varsa tekrar eklenmez
3. **Tüm Ürünler Sayılmalı**: Sayımı tamamlamak için tüm ürünler için gerçek miktar girilmelidir
4. **Geri Alınamaz**: Sayım kaydedildikten sonra geri alınamaz
5. **Yetki**: Sadece `depo` ve `yonetici` rolleri kullanabilir

## 🛠️ Teknik Detaylar

### Database Tabloları

**zone_inventories**
- Güncellenecek alan: `quantity`
- Filtre: `zone_id`, `material_type`, `material_id`

**stock_movements**
- Yeni kayıt: `movement_type` = `sayim_artis` veya `sayim_eksilme`
- İçerik: Fark miktarı ve açıklama

**finished_products / semi_finished_products / raw_materials**
- Güncellenecek alan: `quantity` (toplam stok)

### İş Akışı

```
1. Ürün Tara → 2. Sistem Stoğunu Getir → 3. Gerçek Miktar Gir
    ↓
4. Fark Hesapla → 5. Tüm Ürünler Tamam? → 6. Sayımı Kaydet
    ↓
7. Zone Inventory Güncelle → 8. Product Total Güncelle → 9. Movement Kaydet
```

## 🐛 Sorun Giderme

### "Merkez depo bulunamadı"
- Veritabanında `zone_type = 'center'` olan zone var mı kontrol edin
- Warehouse zones API'sinin çalıştığından emin olun

### "Ürün bulunamadı"
- Barkod doğru mu kontrol edin
- Ürün `/api/stock/raw` endpoint'inde dönüyor mu kontrol edin

### "Sayım kaydedilemedi"
- Network tab'dan hata detaylarını kontrol edin
- Server loglarını inceleyin
- Kullanıcı yetkilerini kontrol edin (`depo` veya `yonetici`)

### Sayım Sonrası Stok Güncellemedi
- Stock movements tablosunu kontrol edin
- Zone inventories'i manuel kontrol edin
- API response'u logları inceleyin

## 📈 İyileştirme Önerileri

- [ ] **Toplu Sayım**: Aynı anda birden fazla zone sayımı
- [ ] **Offline Mod**: İnternet olmadan sayım yapıp sonra senkronize etme
- [ ] **Sayım Geçmişi**: Mobil ekranda sayım geçmişi görüntüleme
- [ ] **Fark Raporu**: PDF/Excel olarak fark raporu export
- [ ] **Sayım Şablonu**: Belli ürün grupları için önceden hazır şablon
- [ ] **Çoklu Kullanıcı**: Aynı anda birden fazla kişi sayım yapabilme
- [ ] **Sayım Kilidi**: Sayım sırasında stok hareketlerini kilitleme

## 📞 Destek

Sorun yaşarsanız:
1. Server loglarını kontrol edin (`logger` çıktıları)
2. Browser console'u inceleyin
3. Network tab'dan API çağrılarını kontrol edin
4. Database'de manuel sorgu çalıştırıp veriyi doğrulayın