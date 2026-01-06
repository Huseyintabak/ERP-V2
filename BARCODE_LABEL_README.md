# Barkod Etiket Yazdırma Sistemi 🏷️

## Genel Bakış

Barkod etiket yazdırma sistemi, ürünler için profesyonel barkod etiketleri oluşturmanıza ve yazdırmanıza olanak tanır. Sistem hem PDF hem de Zebra ZPL formatlarını destekler.

## Özellikler

### ✨ Temel Özellikler

- **Toplu Etiket Basımı**: Birden fazla ürün için aynı anda etiket oluşturun
- **Çoklu Format Desteği**: PDF (evrensel) ve ZPL (Zebra termal yazıcılar)
- **Esnek Etiket Boyutları**: 40x30mm, 50x40mm, 100x50mm
- **QR Kod Desteği**: Ek veri için QR kod ekleyin
- **Fiyat Gösterimi**: İsteğe bağlı fiyat bilgisi
- **Kopya Kontrolü**: Her ürün için birden fazla etiket basın
- **Canlı Önizleme**: Basmadan önce etiketleri görün

### 📋 Desteklenen Barkod Formatları

- **CODE128** (Önerilen): En yaygın ve esnek format
- **EAN13**: Perakende ürünleri için standart
- **CODE39**: Endüstriyel uygulamalar
- **ITF14**: Lojistik ve paketleme

### 📦 Ürün Tipleri

Sistem tüm ürün tiplerini destekler:
- Mamul Ürünler (Finished Products)
- Yarı Mamul Ürünler (Semi-Finished Products)
- Hammaddeler (Raw Materials)

## Kullanım

### 1. Ürün Seçimi

```
Depo > Barkod Etiket Yazdırma
```

1. Arama çubuğunu kullanarak ürün bulun (ad, kod veya barkod ile)
2. Ürün tipi filtrelerini kullanın
3. Tek tek seçim yapın veya "Tümünü Seç" butonunu kullanın
4. Seçili ürünler sağ tarafta görüntülenir

### 2. Etiket Ayarları

#### Format Seçimi
- **PDF**: Tüm yazıcılarla uyumlu, doğrudan yazdırma veya indirme
- **ZPL**: Zebra termal yazıcılar için optimize edilmiş

#### Etiket Boyutu
- **Küçük (40x30mm)**: Kompakt ürünler için
- **Orta (50x40mm)**: Standart kullanım (önerilen)
- **Büyük (100x50mm)**: Detaylı bilgi gereken ürünler

#### Barkod Tipi
- CODE128 çoğu kullanım için idealdir
- Özel gereksinimler için diğer formatları seçin

#### Ek Seçenekler
- **QR Kod**: Ürün kodu, barkod ve tip bilgilerini içerir
- **Fiyat Bilgisi**: Etiket üzerinde fiyat gösterir
- **Kopya Sayısı**: Her ürün için kaç etiket basılacak (1-100)

### 3. Yazdırma

#### Doğrudan Yazdırma (Sadece PDF)
```
"Yazdır" butonuna tıklayın
→ Tarayıcı yazdırma penceresi açılır
→ Yazıcınızı seçin ve yazdırın
```

#### İndirme
```
"İndir" butonuna tıklayın
→ Dosya otomatik indirilir
→ İstediğiniz zaman yazdırabilirsiniz
```

## Etiket İçeriği

Her etiket şunları içerir:

```
┌─────────────────────┐
│  ÜRÜN ADI          │  <- Ürün adı (kalın)
│  URN-CODE-001      │  <- Ürün kodu
│  [QR KOD]          │  <- Opsiyonel QR kod
│  ||||||||||||||||  │  <- Barkod
│  123456789012      │  <- Barkod numarası
│  ₺99.99            │  <- Opsiyonel fiyat
│  Kategori | Birim │  <- Alt bilgi
└─────────────────────┘
```

## Teknik Detaylar

### API Endpoint

```typescript
GET /api/products/all-with-barcodes
```

Tüm barkodlu ürünleri döndürür:

```json
{
  "success": true,
  "products": [
    {
      "id": "uuid",
      "code": "URN-001",
      "name": "Ürün Adı",
      "barcode": "123456789012",
      "type": "finished",
      "unit": "Adet",
      "category": "Kategori",
      "price": 99.99
    }
  ],
  "count": 42
}
```

### Bileşenler

#### `ProductSelector`
Ürün seçimi ve filtreleme için kullanılır.

```tsx
<ProductSelector
  selectedProducts={selectedProducts}
  onSelectionChange={setSelectedProducts}
/>
```

#### `LabelPreview`
Etiketin canlı önizlemesini gösterir.

```tsx
<LabelPreview
  product={product}
  options={options}
/>
```

### Utility Fonksiyonlar

```typescript
// PDF etiketleri oluştur
const blob = await generatePDFLabels(products, options);

// ZPL etiketleri oluştur
const zpl = generateZPLLabels(products, options);

// Dosya indir
downloadLabels(content, filename, format);

// Doğrudan yazdır (PDF)
printPDFLabels(blob);

// Barkod doğrula
const isValid = validateBarcode(barcode, type);
```

## Zebra Yazıcı Kullanımı

### ZPL Format

ZPL (Zebra Programming Language) termal yazıcılar için optimize edilmiş bir komut dilidir.

#### Avantajları
- ✅ Hızlı baskı
- ✅ Yüksek kalite
- ✅ Düşük maliyet (termal kağıt)
- ✅ Kompakt etiketler

#### Kullanım
1. Format olarak "ZPL" seçin
2. Etiketleri indirin (.zpl uzantılı dosya)
3. Dosyayı Zebra yazıcıya gönderin:
   - Zebra Setup Utilities kullanın
   - Veya doğrudan yazıcının IP adresine gönderin

### Ağ Üzerinden Yazdırma

Gelecek özellik: Doğrudan ağ yazıcısına gönderme

```typescript
// Not: Sunucu taraflı endpoint gerektirir
await sendToZebraPrinter(zpl, '192.168.1.100', 9100);
```

## En İyi Uygulamalar

### 📏 Etiket Boyutu Seçimi

- **Küçük ürünler**: 40x30mm
- **Standart kullanım**: 50x40mm (önerilen)
- **Rafta görünürlük önemli**: 100x50mm

### 🎯 Barkod Formatı

- **Genel kullanım**: CODE128
- **Perakende (13 haneli)**: EAN13
- **Eski sistemler**: CODE39

### 💡 İpuçları

1. **QR Kod**: Mobil okuma yapacaksanız ekleyin
2. **Fiyat**: Fiyat değişkenliği düşükse ekleyin
3. **Kopya**: Yedek etiket için 2-3 kopya basın
4. **Önizleme**: Her zaman önizlemeyi kontrol edin
5. **Test**: Yeni boyut/format için önce test basımı yapın

## Sorun Giderme

### Barkod Okunamıyor

**Çözümler:**
- Daha büyük etiket boyutu deneyin
- Barkod formatını CODE128 yapın
- Yazıcı çözünürlüğünü artırın
- Etiket kalitesini kontrol edin

### PDF Yazdırılamıyor

**Çözümler:**
- Tarayıcınızın pop-up'ları engellemediğinden emin olun
- Dosyayı indirip sonra yazdırmayı deneyin
- Farklı PDF okuyucu kullanın

### Etiket Kesiliyor

**Çözümler:**
- Yazıcı ayarlarından kenar boşluklarını kontrol edin
- "Gerçek boyut" veya "100% ölçek" seçin
- Yazıcı kağıt boyutunu doğrulayın

### QR Kod Okunamıyor

**Çözümler:**
- Daha büyük etiket boyutu kullanın
- QR kod bölgesinin temiz basıldığından emin olun
- Mobil uygulamanın QR okuyucusunu test edin

## Geliştirme

### Yeni Barkod Formatı Ekleme

1. `lib/utils/barcode-label.ts` dosyasını açın
2. Barkod tipini ekleyin:

```typescript
export type BarcodeType = 'CODE128' | 'EAN13' | 'YENI_FORMAT';
```

3. Doğrulama ekleyin:

```typescript
const patterns: Record<string, RegExp> = {
  // ...
  YENI_FORMAT: /^[A-Z0-9]+$/,
};
```

4. ZPL komutu ekleyin (Zebra yazıcı için):

```typescript
const commands: Record<string, string> = {
  // ...
  YENI_FORMAT: 'BXN', // ZPL komutu
};
```

### Özel Etiket Boyutu

`LABEL_SIZES` objesine yeni boyut ekleyin:

```typescript
const LABEL_SIZES = {
  // ...
  custom: {
    width: 60,
    height: 40,
    margin: 2,
    barcodeHeight: 15,
    fontSize: 8,
  },
};
```

## Güvenlik

- ✅ RLS (Row Level Security) ile korunmuştur
- ✅ Sadece yetkili kullanıcılar erişebilir (depo, yönetici)
- ✅ Tüm istekler doğrulanır
- ✅ Hassas bilgiler loglanmaz

## Performans

- ⚡ Binlerce etiket saniyeler içinde oluşturulabilir
- ⚡ Tarayıcı tarafında işleme (sunucu yükü yok)
- ⚡ Önizleme gerçek zamanlıdır
- ⚡ Optimize edilmiş PDF boyutu

## Sınırlamalar

- Maksimum 1000 ürün aynı anda seçilebilir
- QR kod küçük etiketlerde (40x30mm) okunabilirliği azaltabilir
- ZPL formatı sadece Zebra yazıcılar ile uyumludur
- Doğrudan Zebra yazıcıya gönderme için sunucu endpoint gerekir

## Gelecek Özellikler

- [ ] Özel etiket tasarımları (template)
- [ ] Logo ekleme
- [ ] Toplu barkod oluşturma
- [ ] Etiket geçmişi ve yeniden basım
- [ ] Doğrudan ağ yazıcı entegrasyonu
- [ ] Etiket stok takibi
- [ ] Mobil uygulama entegrasyonu

## Destek

Sorularınız için:
- Dokümantasyonu kontrol edin
- Sistem yöneticinize başvurun
- GitHub Issues açın

---

**Sürüm:** 1.0.0  
**Son Güncelleme:** Ocak 2025  
**Geliştirici:** Thunder ERP Team