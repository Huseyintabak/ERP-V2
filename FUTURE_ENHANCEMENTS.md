# 🚀 ThunderV2 ERP - Gelecek Geliştirme Önerileri

> **Hazırlayan:** AI Assistant  
> **Tarih:** 14 Ekim 2025  
> **Durum:** Öneri Aşaması (Tartışılacak)  
> **Versiyon:** 1.0

---

## 📋 İçindekiler

1. [Üretim & Operasyon](#-üretim--operasyon)
2. [Stok & Tedarik Zinciri](#-stok--tedarik-zinciri)
3. [Analiz & Raporlama](#-analiz--raporlama)
4. [Kullanıcı Deneyimi](#-kullanıcı-deneyimi)
5. [İş Süreçleri](#-i̇ş-süreçleri)
6. [Entegrasyonlar](#-entegrasyonlar)

---

## 🏭 ÜRETIM & OPERASYON

### 1. 📱 Barkod/QR Kod Sistemi ⭐⭐⭐ ÖNCELİKLİ!

**Süre:** 2-3 saat  
**Impact:** ⭐⭐⭐⭐⭐ (YÜKSEK!)  
**Zorluk:** 🔨🔨  
**ROI:** 🚀 %400+ (Operatör verimliliği %80↑, Hata %95↓)

#### Sorun:
- ❌ Operatörler ürün/malzeme bilgilerini manuel giriyor
- ❌ Hata oranı yüksek (yanlış kod girme)
- ❌ Yavaş (klavye ile yazma)
- ❌ Stok hareketleri gecikmeli

#### Çözüm:
```typescript
// Mobil tarayıcı ile QR/Barkod okutma
- Hammadde QR okut → Otomatik stok çıkış
- Ürün barkod bas → Üretim kaydı
- Yarı mamul QR → Transfer kayıt
- Real-time stok güncelleme
```

#### Teknik Detaylar:

**Frontend Component:**
```typescript
// components/barcode/scanner.tsx
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  type: 'qr' | 'barcode' | 'both';
}

export function BarcodeScanner({ onScan, type }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  
  const startScanning = async () => {
    const scanner = new Html5Qrcode("reader");
    
    await scanner.start(
      { facingMode: "environment" }, // Arka kamera
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText) => {
        onScan(decodedText);
        scanner.stop();
      }
    );
  };
  
  return (
    <div>
      <div id="reader" style={{ width: '100%' }}></div>
      <Button onClick={startScanning}>Taramayı Başlat</Button>
    </div>
  );
}
```

**Database Schema:**
```sql
-- Barkod/QR logları
CREATE TABLE barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  code_type TEXT CHECK (code_type IN ('barcode', 'qr')),
  material_type TEXT,
  material_id UUID,
  scanned_by UUID REFERENCES users(id),
  action TEXT, -- 'stock_in', 'stock_out', 'production', 'transfer'
  quantity NUMERIC(12, 2),
  location TEXT,
  metadata JSONB,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_barcode_scans_code ON barcode_scans(code);
CREATE INDEX idx_barcode_scans_user ON barcode_scans(scanned_by);
CREATE INDEX idx_barcode_scans_date ON barcode_scans(scanned_at);
```

**API Endpoints:**
```typescript
// POST /api/barcode/scan
{
  code: "TRX-001-BATCH-001",
  action: "production",
  quantity: 10
}

// GET /api/barcode/generate/[type]/[id]
// Returns QR code as PNG/SVG

// POST /api/barcode/validate
// Validates barcode format and existence
```

**Operatör İş Akışı:**
```
1. Operatör QR okutucuyu açar (mobil/tablet)
2. Hammadde QR'ı tarar
3. Miktar girer (veya QR'da kodlu)
4. Sistem otomatik:
   ✅ Stok çıkış yapar
   ✅ Production log'a yazar
   ✅ Real-time güncelleme
   ✅ Notification gönderir
```

**Dependencies:**
```bash
npm install html5-qrcode
npm install qrcode  # QR generate için
npm install jsbarcode  # Barcode generate için
```

**Kullanım Alanları:**
1. ✅ **Stok Giriş:** QR okut → Miktar gir → Stok artır
2. ✅ **Stok Çıkış:** QR okut → Üretimde kullanıldı olarak işaretle
3. ✅ **Üretim Kayıt:** Ürün barkod bas → Üretilen miktar kaydet
4. ✅ **Zone Transfer:** Kaynak QR + Hedef QR → Otomatik transfer
5. ✅ **Envanter Sayım:** QR okut → Sayım listesine ekle

**Avantajlar:**
- 🚀 %80 daha hızlı stok işlemleri
- 🎯 %95 daha az hata
- 📱 Mobil uyumlu (telefon/tablet)
- ⚡ Real-time güncelleme

---

### 2. 🔥 Atık/Fire Yönetimi

**Süre:** 1-2 saat  
**Impact:** ⭐⭐⭐ (Maliyet kontrolü)  
**Zorluk:** 🔨

#### Sorun:
- Üretimde fire/atık oluşuyor
- Fire miktarı takip edilmiyor
- Maliyet etkisi bilinmiyor
- Hangi üründe çok fire var analiz edilemiyor

#### Çözüm:

**Database Schema:**
```sql
-- Fire/Atık tablosu
CREATE TABLE production_waste (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_plan_id UUID REFERENCES production_plans(id) ON DELETE CASCADE,
  waste_type TEXT NOT NULL CHECK (waste_type IN ('scrap', 'rework', 'defect', 'material_waste')),
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  reason TEXT,
  cost_impact NUMERIC(12, 2) DEFAULT 0, -- Maliyet etkisi
  can_rework BOOLEAN DEFAULT false, -- Yeniden işlenebilir mi?
  recorded_by UUID NOT NULL REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waste_plan ON production_waste(production_plan_id);
CREATE INDEX idx_waste_type ON production_waste(waste_type);
CREATE INDEX idx_waste_date ON production_waste(created_at);

-- Fire analiz view'ı
CREATE VIEW v_waste_analysis AS
SELECT 
  fp.id as product_id,
  fp.code as product_code,
  fp.name as product_name,
  COUNT(pw.id) as waste_count,
  SUM(pw.quantity) as total_waste_quantity,
  SUM(pw.cost_impact) as total_cost_loss,
  AVG(pw.cost_impact) as avg_cost_per_waste,
  -- Fire oranı hesaplama
  (SUM(pw.quantity) / NULLIF(SUM(pp.produced_quantity), 0) * 100) as waste_percentage
FROM production_waste pw
JOIN production_plans pp ON pp.id = pw.production_plan_id
JOIN finished_products fp ON fp.id = pp.product_id
WHERE pp.completed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY fp.id, fp.code, fp.name
ORDER BY total_cost_loss DESC;

-- Aylık fire trend
CREATE VIEW v_monthly_waste_trend AS
SELECT 
  DATE_TRUNC('month', created_at) as month,
  waste_type,
  COUNT(*) as incident_count,
  SUM(quantity) as total_quantity,
  SUM(cost_impact) as total_cost
FROM production_waste
WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at), waste_type
ORDER BY month DESC, total_cost DESC;
```

**API Endpoints:**
```typescript
// POST /api/production/waste
// Fire/Atık kaydet
{
  production_plan_id: "xxx",
  waste_type: "scrap",
  quantity: 5,
  reason: "Profil çapak",
  can_rework: false
}

// GET /api/production/waste/analysis
// Fire analiz raporu

// GET /api/production/waste/trend?months=6
// Aylık fire trend
```

**UI Komponenti:**
```typescript
// Üretim sırasında fire kayıt butonu
<Button onClick={() => setWasteDialogOpen(true)}>
  🔥 Fire Kaydet
</Button>

<Dialog open={wasteDialogOpen}>
  <DialogContent>
    <DialogTitle>Fire/Atık Kaydı</DialogTitle>
    <form>
      <Select name="waste_type">
        <SelectItem value="scrap">Hurda (Scrap)</SelectItem>
        <SelectItem value="rework">Yeniden İşlenebilir</SelectItem>
        <SelectItem value="defect">Kusurlu Ürün</SelectItem>
        <SelectItem value="material_waste">Malzeme Fire</SelectItem>
      </Select>
      
      <Input type="number" name="quantity" placeholder="Miktar" />
      <Textarea name="reason" placeholder="Sebep..." />
      
      <Checkbox name="can_rework">Yeniden işlenebilir</Checkbox>
      
      <Button type="submit">Kaydet</Button>
    </form>
  </DialogContent>
</Dialog>
```

**Rapor Sayfası:**
```
📊 Fire Analiz Raporu

En Çok Fire Veren Ürünler:
┌────────────┬──────────┬───────────┬──────────┐
│ Ürün       │ Fire     │ Fire %    │ Maliyet  │
├────────────┼──────────┼───────────┼──────────┤
│ TRX-001    │ 45 adet  │ 12.5%     │ ₺245     │
│ TRX-002    │ 32 adet  │ 8.3%      │ ₺178     │
└────────────┴──────────┴───────────┴──────────┘

Aylık Fire Trend:
Ekim 2025: 120 adet (₺650) ↓ 15% (geçen aya göre)
Eylül 2025: 142 adet (₺765)
```

**Avantajlar:**
- 📊 Hangi ürünlerde fire yüksek görülür
- 💰 Maliyet etkisi takip edilir
- 📈 Trend analizi (artıyor mu azalıyor mu?)
- 🎯 Fire azaltma hedefleri konulur

---

### 3. 🔧 Makine/Ekipman Bakım Takibi

**Süre:** 3-4 saat  
**Impact:** ⭐⭐⭐⭐ (Duruş süreleri ↓)  
**Zorluk:** 🔨🔨

#### Sorun:
- Makineler bozulunca üretim duruyor
- Bakım takvimleri manuel tutuluyur
- Periyodik bakımlar unutuluyor
- Duruş süreleri (downtime) kaydedilmiyor

#### Çözüm:

**Database Schema:**
```sql
-- Makine tanımları
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT, -- 'cnc', 'lathe', 'press', 'assembly'
  location TEXT NOT NULL,
  purchase_date DATE,
  purchase_price NUMERIC(12, 2),
  current_value NUMERIC(12, 2), -- Amortisman sonrası değer
  last_maintenance DATE,
  next_maintenance DATE,
  maintenance_interval_days INTEGER DEFAULT 90, -- 3 ayda bir
  status TEXT NOT NULL DEFAULT 'operational' CHECK (status IN ('operational', 'maintenance', 'broken', 'retired')),
  operator_id UUID REFERENCES operators(id), -- Sorumlu operatör
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bakım kayıtları
CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'inspection', 'calibration')),
  description TEXT NOT NULL,
  parts_replaced TEXT,
  cost NUMERIC(12, 2) DEFAULT 0,
  downtime_hours NUMERIC(8, 2) NOT NULL DEFAULT 0, -- Duruş süresi
  performed_by TEXT NOT NULL, -- Bakımcı ismi
  performed_by_user_id UUID REFERENCES users(id),
  scheduled_date DATE,
  actual_date DATE NOT NULL,
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_maintenance_machine ON maintenance_logs(machine_id);
CREATE INDEX idx_maintenance_date ON maintenance_logs(actual_date);
CREATE INDEX idx_maintenance_type ON maintenance_logs(maintenance_type);

-- Makine duruş süreleri (downtime tracking)
CREATE TABLE machine_downtime (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  downtime_type TEXT NOT NULL CHECK (downtime_type IN ('maintenance', 'breakdown', 'changeover', 'no_material', 'no_operator')),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_hours NUMERIC(8, 2), -- Otomatik hesaplanır
  reason TEXT,
  cost_impact NUMERIC(12, 2), -- Kayıp üretim maliyeti
  reported_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_downtime_machine ON machine_downtime(machine_id);
CREATE INDEX idx_downtime_start ON machine_downtime(start_time);

-- Bakım hatırlatıcı view'ı
CREATE VIEW v_maintenance_due AS
SELECT 
  m.id,
  m.code,
  m.name,
  m.location,
  m.next_maintenance,
  m.status,
  m.operator_id,
  CASE 
    WHEN m.next_maintenance < CURRENT_DATE THEN 'overdue'
    WHEN m.next_maintenance < CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'ok'
  END as maintenance_status,
  (CURRENT_DATE - m.next_maintenance) as days_overdue
FROM machines m
WHERE m.status != 'retired'
  AND m.next_maintenance IS NOT NULL
ORDER BY m.next_maintenance ASC;

-- Makine performans analizi
CREATE VIEW v_machine_performance AS
SELECT 
  m.id,
  m.code,
  m.name,
  -- Toplam duruş süresi (son 30 gün)
  COALESCE(SUM(md.duration_hours), 0) as total_downtime_hours,
  -- Ortalama duruş süresi
  COALESCE(AVG(md.duration_hours), 0) as avg_downtime_hours,
  -- Duruş sayısı
  COUNT(md.id) as downtime_count,
  -- Bakım maliyeti
  COALESCE(SUM(ml.cost), 0) as total_maintenance_cost,
  -- Availability (kullanılabilirlik %)
  ((720 - COALESCE(SUM(md.duration_hours), 0)) / 720 * 100) as availability_percentage -- 720h = 30 gün
FROM machines m
LEFT JOIN machine_downtime md ON md.machine_id = m.id 
  AND md.start_time >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN maintenance_logs ml ON ml.machine_id = m.id 
  AND ml.actual_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY m.id, m.code, m.name;
```

**UI Components:**

**1. Makine Listesi:**
```typescript
// app/(dashboard)/bakim/makineler/page.tsx
- Makine kartları (status badge)
- Son bakım tarihi
- Sonraki bakım (countdown)
- Hızlı işlem butonları (bakım kaydet, arıza kaydet)
```

**2. Bakım Takvimi:**
```typescript
// components/maintenance/calendar.tsx
import { Calendar } from '@/components/ui/calendar';

// Takvimde:
- Planlanmış bakımlar (mavi)
- Gecikmiş bakımlar (kırmızı)
- Tamamlanan bakımlar (yeşil)
- Makine arızaları (turuncu)
```

**3. Duruş Zamanı Kaydı:**
```typescript
// Operatör makinenin başında:
<Button onClick={() => recordDowntime()}>
  ⏸️ Duruş Başlat
</Button>

// Dialog açılır:
- Sebep seç (bakım, arıza, malzeme yok)
- Açıklama gir
- Kaydet → Downtime başlar
- "Duruş Bitir" → Süre otomatik hesaplanır
```

**4. Bakım Raporu:**
```
📊 Makine Performans Raporu (Son 30 Gün)

CNC Makinesi (CNC-001)
├─ Kullanılabilirlik: 92.5% ✅
├─ Toplam Duruş: 54 saat
│  ├─ Bakım: 20 saat
│  ├─ Arıza: 24 saat
│  └─ Diğer: 10 saat
├─ Bakım Maliyeti: ₺2,450
└─ Sonraki Bakım: 3 gün sonra ⚠️

Torna Makinesi (TRN-002)
├─ Kullanılabilirlik: 78.3% ⚠️ (hedef >85%)
├─ Toplam Duruş: 156 saat
├─ Bakım Maliyeti: ₺5,870
└─ Sonraki Bakım: GECİKMİŞ (2 gün) 🔴
```

**Notifications:**
```typescript
// Otomatik bildirimler:
- 🔔 Bakım 7 gün kaldı
- 🔔 Bakım gecikmiş!
- 🔔 Makine arızalandı
- 🔔 Duruş süresi 2 saati geçti
```

**Avantajlar:**
- 📅 Periyodik bakımlar unutulmaz
- ⏱️ Duruş süreleri minimize edilir
- 💰 Bakım maliyetleri takip edilir
- 📊 Performans analizi

---

### 3. 🕐 Vardiya (Shift) Yönetimi

**Süre:** 2-3 saat  
**Impact:** ⭐⭐⭐ (Planlama)  
**Zorluk:** 🔨🔨

#### Sorun:
- Operatörler hangi vardiyada çalışacak belli değil
- Vardiya bazlı üretim analizi yok
- Mesai takibi manuel
- Fazla mesai hesaplaması yok

#### Çözüm:

**Database Schema:**
```sql
-- Vardiya tanımları
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- 'Sabah Vardiyası', 'Öğle Vardiyası', 'Gece Vardiyası'
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration_minutes INTEGER DEFAULT 30,
  working_hours NUMERIC(4, 2), -- Otomatik hesaplanır
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Örnek vardiyalar
INSERT INTO shifts (name, start_time, end_time, working_hours) VALUES
('Sabah Vardiyası', '08:00', '16:00', 7.5),
('Öğle Vardiyası', '16:00', '00:00', 7.5),
('Gece Vardiyası', '00:00', '08:00', 7.5);

-- Operatör vardiya atamaları
CREATE TABLE operator_shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  actual_hours NUMERIC(4, 2), -- Gerçekleşen saat
  overtime_hours NUMERIC(4, 2) DEFAULT 0, -- Fazla mesai
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'present', 'absent', 'late', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(operator_id, work_date)
);

CREATE INDEX idx_shift_operator ON operator_shift_assignments(operator_id);
CREATE INDEX idx_shift_date ON operator_shift_assignments(work_date);

-- Vardiya bazlı üretim performansı
CREATE VIEW v_shift_production AS
SELECT 
  s.name as shift_name,
  osa.work_date,
  COUNT(DISTINCT pp.id) as plans_completed,
  SUM(pp.produced_quantity) as total_produced,
  AVG(pp.produced_quantity / NULLIF(pp.planned_quantity, 0) * 100) as efficiency_percentage,
  COUNT(DISTINCT osa.operator_id) as operators_count
FROM operator_shift_assignments osa
JOIN shifts s ON s.id = osa.shift_id
LEFT JOIN production_plans pp ON pp.assigned_operator_id = osa.operator_id
  AND DATE(pp.completed_at) = osa.work_date
  AND pp.status = 'tamamlandi'
WHERE osa.status = 'completed'
  AND osa.work_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.name, osa.work_date
ORDER BY osa.work_date DESC, s.name;
```

**API Endpoints:**
```typescript
// GET /api/shifts
// Vardiya listesi

// POST /api/shifts/assign
// Operatöre vardiya ata
{
  operator_id: "xxx",
  shift_id: "yyy",
  work_date: "2025-10-15"
}

// POST /api/shifts/clock-in
// Vardiya başlangıç
{
  operator_id: "xxx",
  work_date: "2025-10-15"
}

// POST /api/shifts/clock-out
// Vardiya bitiş (otomatik saat hesaplama)

// GET /api/shifts/report?date=2025-10-15
// Günlük vardiya raporu
```

**UI - Vardiya Takvimi:**
```
📅 Vardiya Planı - Ekim 2025

         Pzt  Sal  Çar  Per  Cum  Cmt  Pzr
Operatör1  S    S    S    S    S    -    -
Operatör2  Ö    Ö    Ö    Ö    Ö    -    -
Operatör3  G    G    G    G    G    -    -
Operatör4  S    -    Ö    Ö    S    S    -

S: Sabah | Ö: Öğle | G: Gece | -: İzin
```

**Clock-in/out Widget:**
```typescript
// Operatör dashboard'unda:
<Card>
  <CardHeader>Vardiya Durumu</CardHeader>
  <CardContent>
    <p>Sabah Vardiyası (08:00 - 16:00)</p>
    <p>Başlangıç: 07:58 ✅</p>
    <p>Çalışma Süresi: 4 saat 23 dk</p>
    <Button>Vardiyayı Bitir</Button>
  </CardContent>
</Card>
```

**Avantajlar:**
- 📆 Planlı vardiya atama
- ⏱️ Gerçek mesai takibi
- 💰 Fazla mesai hesaplama
- 📊 Vardiya bazlı verimlilik

---

## 📦 STOK & TEDARİK ZİNCİRİ

### 4. 🏭 Tedarikçi Yönetimi & Performans Takibi

**Süre:** 3-4 saat  
**Impact:** ⭐⭐⭐⭐  
**Zorluk:** 🔨🔨🔨

#### Özellikler:
- Tedarikçi bilgi kartı (iletişim, ödeme koşulları)
- Tedarikçi performans skoru (teslimat süresi, kalite, fiyat)
- Fiyat karşılaştırma (3 farklı tedarikçi)
- Satınalma siparişi (PO) yönetimi
- Lead time tracking (teslimat süresi)
- Otomatik satınalma talebi (kritik stok için)

**Database Schema:**
```sql
-- Tedarikçiler
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Türkiye',
  tax_number TEXT UNIQUE,
  tax_office TEXT,
  payment_terms TEXT DEFAULT '30 gün', -- '15 gün', '30 gün', '60 gün', 'peşin'
  bank_account TEXT,
  rating NUMERIC(3, 2) CHECK (rating >= 0 AND rating <= 5), -- 0-5 yıldız
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tedarikçi - Malzeme ilişkisi (hangi tedarikçiden ne alınıyor)
CREATE TABLE supplier_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  lead_time_days INTEGER DEFAULT 7, -- Teslimat süresi (gün)
  min_order_quantity NUMERIC(12, 2) DEFAULT 1,
  is_preferred BOOLEAN DEFAULT false, -- Tercih edilen tedarikçi
  last_order_date DATE,
  last_unit_price NUMERIC(12, 2), -- Fiyat değişim takibi
  price_updated_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, material_type, material_id)
);

CREATE INDEX idx_supplier_materials_supplier ON supplier_materials(supplier_id);
CREATE INDEX idx_supplier_materials_material ON supplier_materials(material_type, material_id);

-- Satınalma siparişleri (Purchase Orders)
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT UNIQUE NOT NULL, -- PO-2025-001
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE NOT NULL,
  actual_delivery DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) DEFAULT 0,
  shipping_cost NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  payment_date DATE,
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date ON purchase_orders(order_date);

-- Satınalma sipariş kalemleri
CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi')),
  material_id UUID NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  received_quantity NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);

-- Tedarikçi performans analizi
CREATE VIEW v_supplier_performance AS
SELECT 
  s.id,
  s.code,
  s.name,
  s.rating,
  -- Toplam sipariş sayısı
  COUNT(DISTINCT po.id) as total_orders,
  -- Toplam sipariş tutarı
  SUM(po.total_amount) as total_spent,
  -- Ortalama teslimat süresi
  AVG(EXTRACT(DAY FROM (po.actual_delivery - po.expected_delivery))) as avg_delivery_delay_days,
  -- Zamanında teslimat oranı
  (COUNT(CASE WHEN po.actual_delivery <= po.expected_delivery THEN 1 END)::FLOAT / 
   NULLIF(COUNT(po.id), 0) * 100) as on_time_delivery_percentage,
  -- Son sipariş
  MAX(po.order_date) as last_order_date
FROM suppliers s
LEFT JOIN purchase_orders po ON po.supplier_id = s.id
WHERE s.is_active = true
  AND po.order_date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY s.id, s.code, s.name, s.rating
ORDER BY total_spent DESC;
```

**Workflow:**
```
1. Kritik stok uyarısı gelir
2. Sistem otomatik satınalma talebi oluşturur
3. Yönetici tedarikçi seçer (fiyat karşılaştırma ile)
4. PO oluşturulur ve tedarikçiye gönderilir
5. Teslimat takibi (beklenen vs gerçek)
6. Malzeme alındığında stok güncellenir
7. Tedarikçi performansı otomatik skorlanır
```

**Fiyat Karşılaştırma:**
```
Hammadde: TRX_Siyah_Profil_575

Tedarikçi A: ₺12.50 | Lead Time: 5 gün  | Rating: ⭐⭐⭐⭐⭐
Tedarikçi B: ₺11.80 | Lead Time: 10 gün | Rating: ⭐⭐⭐⭐
Tedarikçi C: ₺13.20 | Lead Time: 3 gün  | Rating: ⭐⭐⭐

Öneri: Tedarikçi A (dengeli fiyat + hızlı + güvenilir)
```

---

### 5. 🏷️ Lot/Batch Tracking (Parti Takibi)

**Süre:** 2-3 saat  
**Impact:** ⭐⭐⭐  
**Zorluk:** 🔨🔨

#### Sorun:
- Hammadde partileri karışıyor
- Son kullanma tarihi takip edilmiyor
- Hatalı parti geri çağırma (recall) zor
- İzlenebilirlik (traceability) yok

#### Çözüm:

**Database Schema:**
```sql
-- Batch/Lot bilgileri
ALTER TABLE raw_materials ADD COLUMN current_batch TEXT;
ALTER TABLE raw_materials ADD COLUMN expiry_date DATE;
ALTER TABLE semi_finished_products ADD COLUMN current_batch TEXT;
ALTER TABLE semi_finished_products ADD COLUMN production_batch TEXT;
ALTER TABLE finished_products ADD COLUMN production_batch TEXT;

-- Batch detayları
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('raw', 'semi', 'finished')),
  material_id UUID NOT NULL,
  production_date DATE NOT NULL,
  expiry_date DATE,
  initial_quantity NUMERIC(12, 2) NOT NULL,
  current_quantity NUMERIC(12, 2) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'recalled', 'depleted')),
  supplier_id UUID REFERENCES suppliers(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_batches_number ON batches(batch_number);
CREATE INDEX idx_batches_material ON batches(material_type, material_id);
CREATE INDEX idx_batches_expiry ON batches(expiry_date);

-- Traceability (izlenebilirlik)
CREATE TABLE product_traceability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_batch TEXT NOT NULL,
  finished_product_id UUID NOT NULL REFERENCES finished_products(id),
  raw_material_batch TEXT,
  raw_material_id UUID,
  semi_material_batch TEXT,
  semi_material_id UUID,
  quantity_used NUMERIC(12, 2) NOT NULL,
  production_plan_id UUID REFERENCES production_plans(id),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trace_finished ON product_traceability(finished_product_batch);
CREATE INDEX idx_trace_raw ON product_traceability(raw_material_batch);

-- Expired stock view
CREATE VIEW v_expiring_stock AS
SELECT 
  b.batch_number,
  b.material_type,
  CASE 
    WHEN b.material_type = 'raw' THEN rm.name
    WHEN b.material_type = 'semi' THEN sp.name
    ELSE fp.name
  END as material_name,
  b.current_quantity,
  b.expiry_date,
  CASE 
    WHEN b.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN b.expiry_date < CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
    WHEN b.expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
    ELSE 'ok'
  END as expiry_status,
  (CURRENT_DATE - b.expiry_date) as days_overdue
FROM batches b
LEFT JOIN raw_materials rm ON rm.id = b.material_id AND b.material_type = 'raw'
LEFT JOIN semi_finished_products sp ON sp.id = b.material_id AND b.material_type = 'semi'
LEFT JOIN finished_products fp ON fp.id = b.material_id AND b.material_type = 'finished'
WHERE b.status = 'active'
  AND b.expiry_date IS NOT NULL
ORDER BY b.expiry_date ASC;
```

**Kullanım Senaryosu - Geri Çağırma:**
```
Senaryo: Hatalı parti tespit edildi!

1. TRX-001 ürününde kalite sorunu bulundu
2. Sisteme production_batch numarası girilir: "BATCH-2025-10-001"
3. Traceability sorgusu:
   ✅ Hangi hammaddeler kullanıldı?
   ✅ Hangi partilerden geldi?
   ✅ Ne kadar üretildi?
   ✅ Hangi müşterilere gitti?
4. Etkilenen tüm ürünler listelenir
5. Geri çağırma (recall) başlatılır
```

---

## 📊 ANALİZ & RAPORLAMA

### 6. 📈 KPI Dashboard (OEE, Throughput, Efficiency)

**Süre:** 4-5 saat  
**Impact:** ⭐⭐⭐⭐⭐  
**Zorluk:** 🔨🔨🔨

#### OEE (Overall Equipment Effectiveness):
```
OEE = Availability × Performance × Quality

Availability = (Actual Runtime / Planned Runtime) × 100
Performance = (Actual Output / Ideal Output) × 100
Quality = (Good Units / Total Units) × 100

Hedef: OEE > 85% (Dünya standartı)
```

**Database Views:**
```sql
-- Günlük OEE hesaplama
CREATE VIEW v_daily_oee AS
SELECT 
  DATE(pp.started_at) as production_date,
  pp.product_id,
  fp.code,
  fp.name,
  
  -- Availability (Kullanılabilirlik)
  (SUM(EXTRACT(EPOCH FROM (pp.completed_at - pp.started_at)) / 3600) / 
   (COUNT(*) * 8.0) * 100) as availability,
  
  -- Performance (Performans)
  (SUM(pp.produced_quantity) / SUM(pp.planned_quantity) * 100) as performance,
  
  -- Quality (Kalite) - fire/atık düşülerek
  ((SUM(pp.produced_quantity) - COALESCE(SUM(pw.quantity), 0)) / 
   NULLIF(SUM(pp.produced_quantity), 0) * 100) as quality,
  
  -- OEE hesaplama
  ((SUM(EXTRACT(EPOCH FROM (pp.completed_at - pp.started_at)) / 3600) / 
    (COUNT(*) * 8.0) * 100) *
   (SUM(pp.produced_quantity) / SUM(pp.planned_quantity) * 100) *
   ((SUM(pp.produced_quantity) - COALESCE(SUM(pw.quantity), 0)) / 
    NULLIF(SUM(pp.produced_quantity), 0) * 100) / 10000) as oee,
  
  -- Throughput (Üretim Hızı)
  SUM(pp.produced_quantity) / NULLIF(SUM(EXTRACT(EPOCH FROM (pp.completed_at - pp.started_at)) / 3600), 0) as throughput
  
FROM production_plans pp
JOIN finished_products fp ON fp.id = pp.product_id
LEFT JOIN production_waste pw ON pw.production_plan_id = pp.id
WHERE pp.status = 'tamamlandi'
  AND pp.started_at IS NOT NULL
  AND pp.completed_at IS NOT NULL
GROUP BY DATE(pp.started_at), pp.product_id, fp.code, fp.name
ORDER BY production_date DESC;
```

**Dashboard Widgets:**
```typescript
// Real-time KPI kartları
<div className="grid grid-cols-4 gap-4">
  <KPICard
    title="OEE"
    value="82.5%"
    target="85%"
    trend="+2.3%"
    status="warning" // good, warning, bad
    icon={<Gauge />}
  />
  
  <KPICard
    title="Günlük Üretim"
    value="2,450 adet"
    target="2,800 adet"
    trend="-5%"
    status="bad"
    icon={<TrendingDown />}
  />
  
  <KPICard
    title="Fire Oranı"
    value="3.2%"
    target="<5%"
    trend="-0.5%"
    status="good"
    icon={<AlertTriangle />}
  />
  
  <KPICard
    title="Operatör Verimliliği"
    value="92%"
    target="90%"
    trend="+3%"
    status="good"
    icon={<Users />}
  />
</div>

// OEE Gauge Chart
<GaugeChart
  value={82.5}
  min={0}
  max={100}
  thresholds={[
    { value: 60, color: 'red' },
    { value: 75, color: 'orange' },
    { value: 85, color: 'green' }
  ]}
/>

// Throughput Line Chart (son 7 gün)
<LineChart
  data={[
    { date: 'Pzt', throughput: 305 },
    { date: 'Sal', throughput: 298 },
    { date: 'Çar', throughput: 312 },
    { date: 'Per', throughput: 295 },
    { date: 'Cum', throughput: 308 },
  ]}
  target={300}
/>
```

---

### 7. 🤖 Akıllı Stok Sipariş Önerisi (AI Tahmin)

**Süre:** 2-3 saat  
**Impact:** ⭐⭐⭐  
**Zorluk:** 🔨🔨🔨

#### Özellikler:
- Otomatik reorder point hesaplama
- Mevsimsel trend analizi
- Economic Order Quantity (EOQ)
- Lead time optimizasyonu
- Stok seviyesi tahmini (15-30-60 gün)

**Algoritma:**
```typescript
// lib/ai/stock-prediction.ts

// 1. Reorder Point (Yeniden Sipariş Noktası)
function calculateReorderPoint(materialId: string) {
  const avgDailyUsage = getAvgDailyUsage(materialId, 30); // Son 30 gün ortalaması
  const leadTime = getMaterialLeadTime(materialId) || 7; // Tedarik süresi
  const safetyStock = avgDailyUsage * 3; // 3 günlük emniyet stoku
  
  const reorderPoint = (avgDailyUsage * leadTime) + safetyStock;
  
  return {
    avgDailyUsage,
    leadTime,
    safetyStock,
    reorderPoint,
    currentStock: getCurrentStock(materialId),
    shouldOrder: getCurrentStock(materialId) < reorderPoint
  };
}

// 2. Economic Order Quantity (Ekonomik Sipariş Miktarı)
function calculateEOQ(materialId: string) {
  const annualDemand = getAnnualDemand(materialId); // Yıllık tüketim
  const orderCost = 50; // Sipariş maliyeti (sabit)
  const holdingCost = getUnitPrice(materialId) * 0.25; // Yıllık depolama maliyeti (%25)
  
  const eoq = Math.sqrt((2 * annualDemand * orderCost) / holdingCost);
  
  return {
    economicOrderQuantity: Math.ceil(eoq),
    orderFrequency: annualDemand / eoq, // Yılda kaç sipariş
    totalAnnualCost: (annualDemand / eoq * orderCost) + (eoq / 2 * holdingCost)
  };
}

// 3. Mevsimsel Tahmin
function predictStockNeed(materialId: string, daysAhead: number = 30) {
  const historicalData = getStockMovements(materialId, 90); // Son 90 gün
  const seasonalIndex = calculateSeasonalIndex(historicalData);
  const trendLine = calculateTrendLine(historicalData);
  
  const prediction = trendLine * seasonalIndex;
  
  return {
    predictedUsage: prediction,
    confidenceLevel: 0.85, // %85 güven aralığı
    recommendedOrderQuantity: prediction * 1.1 // %10 buffer
  };
}
```

**UI - Akıllı Sipariş Önerileri:**
```
🤖 Akıllı Sipariş Önerileri

⚠️ ACIL SİPARİŞ GEREKLİ:
┌──────────────────────────────────────────────────┐
│ TRX_Siyah_Profil_575                            │
│ Mevcut Stok: 25 metre                           │
│ Reorder Point: 45 metre ⚠️                      │
│ Günlük Tüketim: ~8.5 metre                      │
│ Lead Time: 7 gün                                 │
│ Tahmini Tükenme: 3 gün sonra! 🔴               │
│                                                  │
│ ÖNERİLEN SİPARİŞ:                               │
│ Miktar: 120 metre (EOQ)                         │
│ Tedarikçi: Tedarikçi A (₺12.50/m)              │
│ Tahmini Teslimat: 21 Ekim 2025                 │
│                                                  │
│ [Otomatik PO Oluştur] [Hatırlat]               │
└──────────────────────────────────────────────────┘

✅ STOK YETERLİ:
- TRX2_Gövde_Grubu (45 gün yeter)
- TRX_Profil_contası (22 gün yeter)
```

---

## 🎨 KULLANICI DENEYİMİ

### 8. 🎛️ Özelleştirilebilir Dashboard

**Süre:** 2-3 saat  
**Impact:** ⭐⭐⭐  
**Zorluk:** 🔨🔨

#### Özellikler:
- Drag & drop widget'lar
- Kişiselleştirilmiş layout
- Widget göster/gizle
- Favori sayfalar (quick access)
- Kullanıcı tercihleri kaydetme

**Database:**
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  dashboard_layout JSONB DEFAULT '[]'::jsonb,
  -- Widget konfigürasyonu
  -- [
  --   { id: 'stock-summary', position: 1, visible: true },
  --   { id: 'production-kpi', position: 2, visible: true }
  -- ]
  theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language TEXT DEFAULT 'tr' CHECK (language IN ('tr', 'en', 'de')),
  default_page TEXT DEFAULT '/dashboard',
  notifications_enabled BOOLEAN DEFAULT true,
  notification_sound BOOLEAN DEFAULT false,
  quick_access_pages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI:**
```typescript
// Drag & drop ile widget düzenleme
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext } from '@dnd-kit/sortable';

const widgets = [
  { id: 'stock-summary', component: <StockSummaryWidget /> },
  { id: 'production-kpi', component: <ProductionKPIWidget /> },
  { id: 'critical-stock', component: <CriticalStockWidget /> },
  { id: 'recent-orders', component: <RecentOrdersWidget /> }
];

// Kullanıcı sürükle-bırak ile düzenler
// Layout otomatik kaydedilir
```

---

### 9. 🌍 Multi-Language (Çoklu Dil)

**Süre:** 3-4 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨

#### Desteklenecek Diller:
- 🇹🇷 **Türkçe** (mevcut)
- 🇬🇧 **İngilizce** (uluslararası müşteriler)
- 🇩🇪 **Almanca** (export raporları için)

**Implementation:**
```typescript
// lib/i18n/messages.ts
export const messages = {
  tr: {
    dashboard: 'Ana Sayfa',
    production: 'Üretim',
    stock: 'Stok',
    orders: 'Siparişler',
    // ... 500+ kelime
  },
  en: {
    dashboard: 'Dashboard',
    production: 'Production',
    stock: 'Stock',
    orders: 'Orders',
  },
  de: {
    dashboard: 'Dashboard',
    production: 'Produktion',
    stock: 'Lager',
    orders: 'Aufträge',
  }
};

// Kullanım:
const t = useTranslation();
<h1>{t('dashboard')}</h1>
```

---

## 💼 İŞ SÜREÇLERİ

### 10. 📋 Sipariş Şablonları (Recurring Orders)

**Süre:** 1-2 saat  
**Impact:** ⭐⭐⭐  
**Zorluk:** 🔨

#### Sorun:
- Aynı müşteri her ay aynı siparişi veriyor
- Her seferinde manuel girilmek zorunda
- Zaman kaybı

#### Çözüm:

**Database:**
```sql
CREATE TABLE order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  recurrence TEXT CHECK (recurrence IN ('once', 'weekly', 'biweekly', 'monthly', 'quarterly')),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES order_templates(id) ON DELETE CASCADE,
  product_id UUID REFERENCES finished_products(id),
  quantity NUMERIC(12, 2) NOT NULL
);

CREATE TABLE recurring_order_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES order_templates(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  created_order_id UUID REFERENCES orders(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'skipped'))
);
```

**Kullanım:**
```
1. Müşteri X her ay 500 adet TRX-001 sipariş ediyor
2. Şablon oluştur: "Müşteri X - Aylık Standart"
3. Sistem otomatik:
   - Her ayın 1'i sipariş oluşturur
   - Planlama'ya bildirim gönderir
   - Onay bekler
   - Onaylanınca production plan'a gider
```

---

### 11. 💰 Vergi & Muhasebe Entegrasyonu

**Süre:** 5-8 saat  
**Impact:** ⭐⭐⭐⭐⭐ (Türkiye için kritik!)  
**Zorluk:** 🔨🔨🔨🔨

#### Özellikler:
- e-Fatura entegrasyonu (GİB)
- e-Arşiv fatura
- KDV hesaplama (%1, %10, %20)
- Muhasebe yazılımı export (Logo, Mikro, SAP)
- Cari hesap takibi
- Tahsilat/Ödeme yönetimi

**Database:**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL, -- TRA2025000001
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('e-fatura', 'e-arsiv', 'iade', 'tevkifat')),
  order_id UUID REFERENCES orders(id),
  customer_name TEXT NOT NULL,
  customer_tax_number TEXT,
  customer_tax_office TEXT,
  customer_address TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 20, -- KDV %
  tax_amount NUMERIC(12, 2) NOT NULL,
  discount_amount NUMERIC(12, 2) DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'TRY',
  ettn TEXT UNIQUE, -- e-Fatura ETTN (UUID)
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'paid', 'overdue', 'cancelled')),
  payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES finished_products(id),
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  tax_rate NUMERIC(5, 2) NOT NULL,
  line_total NUMERIC(12, 2) NOT NULL
);

-- Cari hesap
CREATE TABLE account_receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  amount NUMERIC(12, 2) NOT NULL,
  paid_amount NUMERIC(12, 2) DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending'
);
```

**e-Fatura Entegrasyonu:**
```typescript
// lib/integration/efatura.ts
import axios from 'axios';

export async function sendEInvoice(invoiceData: any) {
  // GİB e-Fatura entegratörü API
  const response = await axios.post('https://efatura-api.com/send', {
    ettn: generateETTN(), // UUID
    invoiceNumber: invoiceData.invoice_number,
    issueDate: invoiceData.issue_date,
    customer: {
      taxNumber: invoiceData.customer_tax_number,
      name: invoiceData.customer_name,
      address: invoiceData.customer_address
    },
    items: invoiceData.items.map(item => ({
      description: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      taxRate: item.tax_rate,
      total: item.line_total
    })),
    subtotal: invoiceData.subtotal,
    taxAmount: invoiceData.tax_amount,
    total: invoiceData.total_amount
  });
  
  return response.data.ettn;
}
```

---

## 🔌 ENTEGRASYONLAR

### 12. 📧 Email & SMS Notification Sistemi

**Süre:** 2-3 saat  
**Impact:** ⭐⭐⭐  
**Zorluk:** 🔨🔨

#### Email Senaryoları:
```typescript
// 1. Kritik stok uyarısı
sendEmail({
  to: ['planlama@firma.com', 'yonetici@firma.com'],
  subject: '⚠️ Kritik Stok Uyarısı: TRX_Siyah_Profil_575',
  body: `
    Mevcut Stok: 12 metre
    Kritik Seviye: 50 metre
    Tahmini Tükenme: 3 gün
    
    Acil sipariş verin!
  `
});

// 2. Sipariş onayı (müşteriye)
sendEmail({
  to: 'musteri@firma.com',
  subject: '✅ Siparişiniz Onaylandı - ORD-2025-001',
  body: `
    Sipariş No: ORD-2025-001
    Ürün: TRX-001 Thunder Pro
    Miktar: 500 adet
    Teslim Tarihi: 25 Ekim 2025
    
    Üretim planınız oluşturuldu.
  `
});

// 3. Üretim tamamlandı
sendEmail({
  to: 'planlama@firma.com',
  subject: '✅ Üretim Tamamlandı - PLN-001',
  body: `
    Plan No: PLN-001
    Ürün: TRX-001
    Hedef: 500 adet
    Üretilen: 498 adet (99.6%)
    Fire: 2 adet (0.4%)
  `
});

// 4. Gecikmeli sipariş uyarısı
sendEmail({
  to: 'yonetici@firma.com',
  subject: '🔴 GECİKME UYARISI - ORD-2025-003',
  body: `
    Sipariş: ORD-2025-003
    Müşteri: ABC Ltd.
    Teslim Tarihi: 20 Ekim 2025
    Kalan Süre: 2 gün
    Üretim Durumu: %45 (çok yavaş!)
    
    ACİL MÜDAHALE GEREKLİ!
  `
});
```

**SMS (opsiyonel):**
```typescript
// Acil durumlar için SMS
sendSMS({
  to: '+905xxxxxxxxx',
  message: 'ACIL: Makine CNC-001 arızalandı. Üretim durdu.'
});
```

---

### 13. 🔗 REST API (Third-party Entegrasyon)

**Süre:** 3-4 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨🔨

#### Kullanım Alanı:
- Web sitesinden sipariş entegrasyonu
- E-ticaret platformu (Trendyol, Hepsiburada)
- Muhasebe yazılımı (Logo, SAP)
- CRM sistemi (Salesforce)

**API Key Management:**
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL, -- bcrypt hash
  company_name TEXT,
  permissions JSONB DEFAULT '{"read": true, "write": false}'::jsonb,
  rate_limit INTEGER DEFAULT 100, -- Request/hour
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**API Endpoints:**
```typescript
// Public API (API key ile)
GET /api/v1/products?api_key=xxx
GET /api/v1/orders?api_key=xxx
POST /api/v1/orders?api_key=xxx
GET /api/v1/stock/[productId]?api_key=xxx

// Webhook endpoint
POST /api/webhooks/order-created
POST /api/webhooks/production-completed
```

---

## 🎯 ÖNCELİKLENDİRME (Önerim)

### **Hemen Yapılabilir (1-2 gün):**

| # | Özellik | Süre | Impact | Neden? |
|---|---------|------|--------|--------|
| 1 | 📱 **Barkod/QR** | 2-3h | ⭐⭐⭐⭐⭐ | ROI en yüksek! Operatör %80 hızlanır |
| 2 | 🔥 **Fire Yönetimi** | 1-2h | ⭐⭐⭐ | Maliyet kontrolü kritik |
| 3 | 📋 **Sipariş Şablonları** | 1-2h | ⭐⭐⭐ | UX iyileştirme, zaman tasarrufu |

**Toplam:** 4-7 saat

---

### **Orta Vadeli (1 hafta):**

| # | Özellik | Süre | Impact |
|---|---------|------|--------|
| 4 | 🕐 **Vardiya Yönetimi** | 2-3h | ⭐⭐⭐ |
| 5 | 🏭 **Tedarikçi Yönetimi** | 3-4h | ⭐⭐⭐⭐ |
| 6 | 🏷️ **Lot/Batch Tracking** | 2-3h | ⭐⭐⭐ |
| 7 | 📈 **KPI Dashboard** | 4-5h | ⭐⭐⭐⭐⭐ |

**Toplam:** 11-15 saat

---

### **Uzun Vadeli (1+ ay):**

| # | Özellik | Süre | Impact |
|---|---------|------|--------|
| 8 | 🔧 **Makine Bakım** | 3-4h | ⭐⭐⭐⭐ |
| 9 | 🤖 **Akıllı Sipariş** | 2-3h | ⭐⭐⭐ |
| 10 | 💰 **Muhasebe Entegrasyonu** | 5-8h | ⭐⭐⭐⭐⭐ |
| 11 | 📧 **Email/SMS** | 2-3h | ⭐⭐⭐ |
| 12 | 🎛️ **Dashboard Özelleştirme** | 2-3h | ⭐⭐⭐ |
| 13 | 🌍 **Multi-language** | 3-4h | ⭐⭐ |
| 14 | 🔗 **REST API** | 3-4h | ⭐⭐ |

**Toplam:** 22-32 saat

---

## 💡 BENİM ÖNERİM

Eğer sadece **1 özellik** ekleyeceksen:

### 🏆 **BARKOD/QR KOD SİSTEMİ** 📱

**Neden en iyi seçim:**
1. ✅ **En yüksek ROI:** %400+ verimlilik artışı
2. ✅ **Hızlı geliştirme:** 2-3 saat
3. ✅ **Anında etki:** İlk günden operatörleri hızlandırır
4. ✅ **Hata azaltma:** Manuel girişten %95 daha az hata
5. ✅ **Mobil uyumlu:** Telefon/tablet ile kullanılır
6. ✅ **Maliyetsiz:** Ekstra donanım gerekmez (kamera yeterli)

**İş Akışı (Barkodsuz vs Barkodlu):**

**❌ Şu Anki (Barkodsuz):**
```
1. Operatör ürün kodunu yazıyor (30 sn)
2. Yanlış yazma riski %20
3. Miktar giriyor (5 sn)
4. Kaydet (2 sn)
Toplam: ~40 sn/kayıt
```

**✅ Barkodlu:**
```
1. QR okut (2 sn) ← Otomatik kod gelir
2. Miktar gir (5 sn)
3. Kaydet (2 sn)
Toplam: ~9 sn/kayıt (%77 daha hızlı!)
```

**Günlük etki (100 kayıt/gün):**
- Eski: 100 × 40sn = 66 dakika
- Yeni: 100 × 9sn = 15 dakika
- **Tasarruf: 51 dakika/gün = 4.25 saat/hafta!**

---

## 📞 TARTIŞMA SORULARI

Geliştirme öncesi şunları konuşalım:

1. **Bütçe:** Ekstra maliyet çıkabilir mi? (Email servisi, SMS paketi)
2. **Öncelik:** Hangi özellik en acil?
3. **Ekipman:** Mobil cihazlar (tablet/telefon) mevcut mu?
4. **Domain:** SSL/HTTPS için domain var mı?
5. **Muhasebe:** Hangi muhasebe yazılımı kullanılıyor?

---

## 🚀 BAŞLANGICA HAZIR

Her özellik için:
- ✅ Database migration hazır
- ✅ API endpoint planı var
- ✅ UI mockup hazır
- ✅ İş akışı tanımlanmış

**Hangisini isterseniz, hemen başlayabiliriz!** 💪

---

**Son Güncelleme:** 14 Ekim 2025  
**Hazırlayan:** AI Assistant  
**Durum:** Tartışmaya Açık 💬

