# Stok Sayım - Hızlı Başlangıç

## 🚀 5 Dakikada Stok Sayım

### 1. Mobil Dashboard'a Git
```
http://localhost:3000/depo/mobile-dashboard
```

### 2. "Stok Sayım" Kartına Tıkla
- Mor renkli kart
- ClipboardList ikonu
- "Stok sayımı yap" açıklaması

### 3. Ürün Tara
1. **"Kamera ile Tara"** butonuna bas
2. Ürün barkodunu/QR'ını kameraya göster
3. Ürün listeye eklenir
4. Sistem stoğu otomatik gösterilir

### 4. Gerçek Miktarı Gir
1. **"Gerçek Miktarı Gir"** butonuna bas
2. Fiziksel sayımda bulduğun miktarı yaz
3. **"Kaydet"** butonuna bas
4. Fark otomatik hesaplanır:
   - 🟢 **+5**: Fazla stok bulundu
   - 🔴 **-5**: Eksik stok bulundu
   - ⚪ **0**: Fark yok

### 5. Sayımı Tamamla
- Tüm ürünler sayıldığında **"Sayımı Tamamla"** butonu aktif olur
- Butona bas
- ✅ Stoklar otomatik güncellenir!

## 📊 Örnek Senaryo

### Senaryo: Depo Sayımı
```
1. Ürün: ABC-123 (Mamul Ürün)
   Sistem: 100 adet
   Gerçek: 95 adet
   Fark: -5 (Eksik)

2. Ürün: XYZ-456 (Hammadde)
   Sistem: 50 adet
   Gerçek: 55 adet
   Fark: +5 (Fazla)

3. "Sayımı Tamamla" → Stoklar güncellendi!
```

## ⚡ Kısayollar

### Hızlı İşlemler
- **Ürün Sil**: Kart üzerindeki 🗑️ çöp kutusu ikonu
- **Miktar Düzenle**: Sayılan ürünü tekrar düzenleyebilirsin
- **Kamerayı Kapat**: "Kamerayı Kapat" butonu

### Göstergeler
- 🟡 **Sarı Kart**: Henüz sayılmadı
- ⚪ **Beyaz Kart**: Sayıldı
- ✅ **Yeşil Tick**: Sayım tamamlandı

## ❗ Önemli
1. Sadece **Merkez Depo** için sayım yapılır
2. Aynı ürün iki kere eklenemez
3. Tüm ürünler sayılmadan tamamlayamazsın
4. Sayım kaydedildikten sonra **geri alınamaz**!

## 🔧 Sorun mu Var?

### Ürün Bulunamadı
- Barkod doğru mu?
- Ürün sistemde kayıtlı mı?

### Merkez Depo Bulunamadı
- Admin'den zone kurulumunu kontrol ettir

### Kaydetme Başarısız
- İnternet bağlantını kontrol et
- Yetkin var mı kontrol et (depo/yonetici)

## 📱 Ekran Yapısı

```
┌─────────────────────────────────┐
│  ← Stok Sayım                   │
│  Merkez Depo - 3 ürün           │
│                                 │
│  [Sayılan] [Toplam] [Fark]     │
│     2         3       8         │
├─────────────────────────────────┤
│  📷 Kamera ile Tara            │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ Ürün ABC-123       🗑️  │   │
│  │ Hammadde                │   │
│  │ [Sistem] [Sayım] [Fark] │   │
│  │   100      95      -5   │   │
│  │ [Miktarı Düzenle]       │   │
│  │ ✅ Sayım tamamlandı      │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Ürün XYZ-456       🗑️  │   │
│  │ Mamul                   │   │
│  │ [Sistem] [Sayım] [Fark] │   │
│  │   50       0       -50  │   │
│  │ [Gerçek Miktarı Gir]    │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
│  ⚠️ 1 ürün sayılmadı           │
└─────────────────────────────────┘
│  💾 Sayımı Tamamla             │
└─────────────────────────────────┘
```

## 🎯 İpuçları

### Verimli Sayım İçin
1. **Hazırlık**: Sayım yapacağın alanı temizle
2. **Sıralama**: Ürünleri grup grup say
3. **Kontrol**: Her ürünü iki kere kontrol et
4. **Kaydet**: Düzenli aralıklarla kaydet

### Hız Kazanmak İçin
- Sürekli tarama modunu aç
- Ürünleri önceden sırala
- Aynı anda bir kişi tarsın, bir kişi saysın
- QR etiketlerini düzgün hizala

## 📞 Yardım
Detaylı bilgi: [STOK-SAYIM.md](./STOK-SAYIM.md)