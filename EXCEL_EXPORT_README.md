# 📊 Excel Export Sistemi

> **Durum:** ✅ Geliştirme Tamamlandı  
> **Tarih:** 14 Ekim 2025  
> **Versiyon:** 1.0.0

---

## ✨ Özellikler

### ✅ Tamamlanan Özellikler

1. **Çoklu Rapor Export**
   - Üretim raporları (production plans)
   - Stok raporları (hammadde, yarı mamul, nihai)
   - Operatör performans raporları
   - Sipariş raporları

2. **Gelişmiş Excel Formatı**
   - Çoklu worksheet (sayfa) desteği
   - Özet + detay sayfaları
   - Otomatik kolon genişlikleri
   - Formatlı headers

3. **Akıllı Veri İşleme**
   - Otomatik hesaplamalar (toplam, ortalama)
   - Müşteri bazlı analiz
   - Durum filtreleme
   - Tarih aralığı desteği

4. **Kullanıcı Dostu**
   - Tek tıkla indirme
   - "Tümünü İndir" özelliği (4 rapor birden)
   - Otomatik dosya adlandırma

---

## 📋 Export Türleri

### 1. Üretim Raporu
**Endpoint:** `/api/reports/export/production`

**Worksheets:**
- **Özet:** Toplam/tamamlanan/devam eden/iptal planlar
- **Üretim Detay:** Plan kodu, sipariş, ürün, ilerleme, operatör, tarihler

**Örnek Çıktı:**
```
Sheet 1: Özet
├─ Toplam Plan: 45
├─ Tamamlandı: 32
├─ Devam Ediyor: 8
└─ Toplam Üretilen: 1,250 adet

Sheet 2: Üretim Detay
├─ Plan Kodu | Sipariş | Ürün | Hedef | Üretilen | İlerleme% | ...
├─ PLAN-001  | SIP-123 | TRX-1| 100   | 95       | 95%       | ...
└─ ...
```

---

### 2. Stok Raporu
**Endpoint:** `/api/reports/export/stock`

**Worksheets:**
- **Özet:** Toplam ürün sayıları, kritik stoklar, toplam değer
- **Hammaddeler:** 86 adet hammadde + maliyet analizi
- **Yarı Mamüller:** 12 adet yarı mamul + kullanılabilir stok
- **Nihai Ürünler:** 244 adet ürün + kar marjı

**Örnek Çıktı:**
```
Sheet 1: Özet
├─ Hammadde Sayısı: 86
├─ Yarı Mamul Sayısı: 12
├─ Nihai Ürün Sayısı: 244
├─ Kritik Stok (Hammadde): 12
└─ Toplam Stok Değeri: ₺125,450.00

Sheet 2-4: Detaylı listeler
```

---

### 3. Operatör Raporu
**Endpoint:** `/api/reports/export/operators`

**Worksheets:**
- **Özet:** Toplam operatör, aktif/boşta, kapasite kullanımı
- **Operatörler:** Seri, ad, deneyim, kapasite, üretim sayısı, verimlilik

**Örnek Çıktı:**
```
Sheet 1: Özet
├─ Toplam Operatör: 2
├─ Aktif: 1
├─ Toplam Kapasite: 92 saat/gün
└─ Kullanım: 50%

Sheet 2: Operatör Detayları
├─ Seri | Ad | Deneyim | Kapasite | Aktif Üretim | Verimlilik% | ...
├─ thunder | Thunder Op | 5 yıl | 46 saat | 2 | 95% | ...
└─ ...
```

---

### 4. Sipariş Raporu
**Endpoint:** `/api/reports/export/orders`

**Worksheets:**
- **Özet:** Toplam sipariş, durum dağılımı, toplam tutar
- **Sipariş Detay:** Sipariş no, müşteri, ürün, miktar, fiyat, durum
- **Müşteri Analizi:** Müşteri bazlı sipariş sayısı ve toplam tutar

**Örnek Çıktı:**
```
Sheet 1: Özet
├─ Toplam Sipariş: 18
├─ Onay Bekleyen: 3
├─ Tamamlandı: 12
└─ Toplam Tutar: ₺245,000

Sheet 2: Sipariş Detay
Sheet 3: Müşteri Analizi
```

---

## 🚀 Kullanım

### 1. Raporlar Sayfasından İndirme

**Nerede:** `http://localhost:3000/raporlar`

**Yöntem 1: Ana Butonlar (Sağ üst)**
- **"Tümünü İndir"** → 4 rapor birden indirilir (sırayla)
- **"Özet Rapor"** → (Gelecekte eklenecek)

**Yöntem 2: Tab Bazlı**
1. İstediğin rapor tab'ına git (Üretim/Stok/Operatör/Sipariş)
2. **"Excel İndir"** butonuna tıkla
3. Excel dosyası otomatik indirilir

**Dosya Adları:**
- `production-raporu-2025-10-14.xlsx`
- `stock-raporu-2025-10-14.xlsx`
- `operators-raporu-2025-10-14.xlsx`
- `orders-raporu-2025-10-14.xlsx`

---

### 2. API Kullanımı (Programmatik)

```typescript
// Üretim raporu
const response = await fetch('/api/reports/export/production');
const blob = await response.blob();
// ... download

// Tarih filtreli
fetch('/api/reports/export/production?startDate=2025-10-01&endDate=2025-10-14');

// Durum filtreli
fetch('/api/reports/export/production?status=tamamlandi');

// Kombine
fetch('/api/reports/export/orders?startDate=2025-10-01&status=completed');
```

---

### 3. Curl ile İndirme

```bash
# Üretim raporu
curl http://localhost:3000/api/reports/export/production -o uretim.xlsx

# Stok raporu
curl http://localhost:3000/api/reports/export/stock -o stok.xlsx

# Operatör raporu
curl http://localhost:3000/api/reports/export/operators -o operator.xlsx

# Sipariş raporu (filtreli)
curl "http://localhost:3000/api/reports/export/orders?status=completed" -o siparisler.xlsx
```

---

## 🔌 API Endpoints

### 1. GET `/api/reports/export/production`

**Query Params:**
- `startDate`: YYYY-MM-DD (opsiyonel)
- `endDate`: YYYY-MM-DD (opsiyonel)
- `status`: beklemede/devam_ediyor/tamamlandi/iptal (opsiyonel)

**Response:** Excel file (.xlsx)

---

### 2. GET `/api/reports/export/stock`

**Query Params:** Yok (tüm stokları export eder)

**Response:** Excel file (.xlsx)
- Sheet 1: Özet
- Sheet 2: Hammaddeler (86 adet)
- Sheet 3: Yarı Mamüller (12 adet)
- Sheet 4: Nihai Ürünler (244 adet)

---

### 3. GET `/api/reports/export/operators`

**Query Params:** Yok

**Response:** Excel file (.xlsx)
- Sheet 1: Özet
- Sheet 2: Operatör Detayları (tüm operatörler)

---

### 4. GET `/api/reports/export/orders`

**Query Params:**
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `status`: pending/approved/in_production/completed/cancelled

**Response:** Excel file (.xlsx)
- Sheet 1: Özet
- Sheet 2: Sipariş Detay
- Sheet 3: Müşteri Analizi

---

## 📊 Excel Dosya Yapısı

### Genel Format

```
Excel Dosyası (*.xlsx)
├─ Sheet 1: Özet
│  ├─ Metrik-Değer formatı
│  ├─ Toplam sayılar
│  ├─ Yüzde hesaplamaları
│  └─ Rapor tarihi
│
├─ Sheet 2: Detaylı Veri
│  ├─ Kolon başlıkları (bold)
│  ├─ Tüm kayıtlar
│  ├─ Formatlı sayılar
│  └─ Otomatik kolon genişlikleri
│
└─ Sheet 3+: Ek Analizler (varsa)
   └─ Müşteri analizi, trend, vb.
```

### Örnek: Stok Raporu Yapısı

```excel
📄 stok-raporu-2025-10-14.xlsx

┌─ 📑 Özet
│  Hammadde Sayısı     | 86
│  Yarı Mamul Sayısı   | 12
│  Nihai Ürün Sayısı   | 244
│  Toplam Stok Değeri  | ₺125,450
│
├─ 📑 Hammaddeler
│  Kod    | İsim  | Miktar | Birim | Fiyat | Toplam | Durum
│  HM-001 | Çelik | 100    | kg    | 50    | 5,000  | Normal
│  HM-002 | Alu   | 25     | kg    | 80    | 2,000  | Kritik
│
├─ 📑 Yarı Mamüller
│  ...
│
└─ 📑 Nihai Ürünler
   ...
```

---

## 💾 Teknoloji

### Kullanılan Kütüphaneler
- **xlsx** (SheetJS): Excel dosya oluşturma
- **Next.js API Routes**: Backend export endpoints

### Dosya Yapısı
```
lib/utils/excel-export.ts       ← Utility fonksiyonlar
app/api/reports/export/
├─ production/route.ts          ← Üretim export
├─ stock/route.ts               ← Stok export
├─ operators/route.ts           ← Operatör export
└─ orders/route.ts              ← Sipariş export
```

---

## 🧪 Test Senaryoları

### Test 1: Raporlar Sayfasından İndirme

1. `http://localhost:3000/raporlar` git
2. **"Üretim Raporları"** tab'ına git
3. **"Excel İndir"** butonuna tıkla
4. **Beklenen:** `production-raporu-2025-10-14.xlsx` indirilir ✅

**Dosyayı Excel'de aç ve kontrol et:**
- ✅ "Özet" sayfası var mı?
- ✅ "Üretim Detay" sayfası var mı?
- ✅ Veriler doğru mu?

---

### Test 2: Tümünü İndirme

1. Raporlar sayfasında sağ üstteki **"Tümünü İndir"** tıkla
2. **Beklenen:** 4 Excel dosyası sırayla indirilir:
   - `production-raporu-*.xlsx`
   - `stock-raporu-*.xlsx`
   - `operators-raporu-*.xlsx`
   - `orders-raporu-*.xlsx`

---

### Test 3: API Doğrudan Test

```bash
# Curl ile test
curl http://localhost:3000/api/reports/export/production -o test.xlsx

# Dosya boyutunu kontrol et
ls -lh test.xlsx  # 15-50 KB arası olmalı

# Excel'de aç
open test.xlsx  # macOS
start test.xlsx # Windows
```

---

### Test 4: Filtreleme Testi

```bash
# Sadece tamamlanan üretimler
curl "http://localhost:3000/api/reports/export/production?status=tamamlandi" -o tamamlanan.xlsx

# Tarih aralığı
curl "http://localhost:3000/api/reports/export/orders?startDate=2025-10-01&endDate=2025-10-14" -o ekim.xlsx
```

---

## 🎯 Kullanım Senaryoları

### Senaryo 1: Aylık Üretim Raporu

```typescript
// Ay sonu raporlama
const exportMonthlyProduction = async () => {
  const firstDay = new Date(2025, 9, 1).toISOString().split('T')[0];
  const lastDay = new Date(2025, 9, 31).toISOString().split('T')[0];
  
  const url = `/api/reports/export/production?startDate=${firstDay}&endDate=${lastDay}`;
  window.open(url, '_blank');
};
```

---

### Senaryo 2: Kritik Stok Raporu

```typescript
// Sadece kritik stokları export et (özel filtreleme)
// Not: Şu an tüm stokları export eder, 
// kritik olanlar Excel'de filtrelenebilir
const url = '/api/reports/export/stock';
window.open(url, '_blank');
```

---

### Senaryo 3: Müşteri Sipariş Özeti

```typescript
// Belirli müşterinin siparişleri
// Not: Gelecekte customerId parametresi eklenebilir
const url = '/api/reports/export/orders';
window.open(url, '_blank');
```

---

## 🔧 Geliştirici Notları

### Yeni Rapor Türü Ekleme

```typescript
// 1. API endpoint oluştur
// app/api/reports/export/custom/route.ts
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  const workbook = XLSX.utils.book_new();
  
  // Veriyi hazırla
  const data = await fetchCustomData();
  
  // Worksheet oluştur
  const worksheet = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Veri');
  
  // Buffer döndür
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="custom-rapor.xlsx"`
    }
  });
}

// 2. exportReport fonksiyonuna ekle
case 'custom':
  url = '/api/reports/export/custom';
  break;

// 3. UI'ye buton ekle
<Button onClick={() => exportReport('custom')}>
  Özel Rapor İndir
</Button>
```

---

## 🐛 Troubleshooting

### Problem 1: "XLSX is not defined"
**Çözüm:** xlsx package eksik.
```bash
npm install xlsx
```

### Problem 2: Dosya indirilmiyor
**Çözüm:** Browser pop-up blocker. İzin ver veya `window.open` yerine:
```typescript
const a = document.createElement('a');
a.href = downloadUrl;
a.download = filename;
a.click();
```

### Problem 3: "Network Error" (Production'da)
**Çözüm:** API timeout. Büyük raporlar için timeout artır:
```typescript
// next.config.ts
export default {
  api: {
    responseLimit: '10mb',
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
}
```

---

## 📈 Gelecek İyileştirmeler

- [ ] PDF export desteği
- [ ] Tarih aralığı seçici (date picker UI)
- [ ] Grafikleri Excel'e ekleme (chart export)
- [ ] Şablonlu export (template-based)
- [ ] Scheduled export (otomatik aylık rapor)
- [ ] Email ile gönderim
- [ ] Zip ile toplu indirme

---

## 📞 Destek

**Dokümantasyon:** Bu dosya  
**GitHub:** https://github.com/Huseyintabak/ERP-V2  
**Issues:** https://github.com/Huseyintabak/ERP-V2/issues

---

**✅ Sistem hazır! Raporlar sayfasından test et!** 🚀

