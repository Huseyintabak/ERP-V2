# 🚀 ThunderV2 ERP - Nice-to-Have Features Roadmap

> **Durum:** Production'da çalışan sisteme eklenebilecek iyileştirmeler ve yeni özellikler  
> **Son Güncelleme:** 14 Ekim 2025

---

## 📊 Priority Matrix

| Öncelik | Feature Count | Toplam Süre |
|---------|---------------|-------------|
| 🔴 Yüksek (High) | 3 | ~4-5 saat |
| 🟡 Orta (Medium) | 4 | ~8-10 saat |
| 🟢 Düşük (Low) | 8 | ~20-30 saat |

---

## 🔴 YÜKSEK ÖNCELİK (Quick Wins)

### 1. ✨ Envanter Sayımı Modülü
**Nerede:** Depo Dashboard → Quick Actions  
**Süre:** 30-40 dakika  
**Impact:** ⭐⭐⭐ (Yüksek)  
**Zorluk:** 🔨 (Kolay)

#### Özellikler:
- Fiziki envanter sayımı başlatma
- Barkod okutarak hızlı sayım
- Sistem stoğu vs fiziki stok fark analizi
- Otomatik stok düzeltme önerisi
- Sayım raporu (PDF/Excel export)

#### Database Schema:
```sql
CREATE TABLE inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_type TEXT NOT NULL,
  material_id UUID NOT NULL,
  system_quantity NUMERIC(12, 2) NOT NULL,
  physical_quantity NUMERIC(12, 2) NOT NULL,
  difference NUMERIC(12, 2) GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,
  counted_by UUID REFERENCES users(id),
  notes TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id)
);
```

#### Implementation:
- `/components/stock/inventory-count-dialog.tsx` (yeni component)
- `/app/api/stock/count/route.ts` (yeni API)
- Depo dashboard'a entegre et

---

### 2. 📥 Excel Export İyileştirmeleri
**Nerede:** Raporlar, Stok sayfaları  
**Süre:** 1 saat  
**Impact:** ⭐⭐⭐ (Yüksek)  
**Zorluk:** 🔨 (Kolay)

#### Eklenecekler:
- Tüm raporları Excel'e export (Production, Stock, Operator, Order)
- Özel tarih aralığı seçimi
- Grafikleri Excel'e ekleme (chart images)
- Çoklu sayfa (worksheets) export
- Formatlı Excel (renkli headers, borders)

#### Dosyalar:
```typescript
// lib/utils/excel-export.ts
export const exportProductionReport = (data: any[], dateRange: any) => {
  const workbook = XLSX.utils.book_new();
  
  // Worksheet 1: Summary
  const summarySheet = XLSX.utils.json_to_sheet([...]);
  
  // Worksheet 2: Detailed data
  const detailSheet = XLSX.utils.json_to_sheet(data);
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detay');
  
  XLSX.writeFile(workbook, `uretim-raporu-${date}.xlsx`);
};
```

#### Entegrasyon:
- Raporlar sayfasına "Excel İndir" butonu ekle
- Her rapor tipi için ayrı export fonksiyonu

---

### 3. 💰 Fiyatlandırma & Maliyet Sistemi
**Nerede:** BOM, Orders, Products  
**Süre:** 2-3 saat  
**Impact:** ⭐⭐⭐ (Yüksek)  
**Zorluk:** 🔨🔨 (Orta)

#### Özellikler:
- Ürün fiyatlandırma sistemi (dinamik)
- Gerçek BOM maliyet hesaplama
- Kar marjı hesaplama ve takibi
- Fiyat geçmişi ve trend analizi
- Müşteri bazlı özel fiyatlandırma

#### Database Changes:
```sql
-- Product pricing
ALTER TABLE finished_products ADD COLUMN cost_price NUMERIC(12, 2);
ALTER TABLE finished_products ADD COLUMN profit_margin NUMERIC(5, 2) DEFAULT 20;
ALTER TABLE finished_products ADD COLUMN last_price_update TIMESTAMPTZ;

-- Customer pricing
CREATE TABLE customer_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES finished_products(id) ON DELETE CASCADE,
  special_price NUMERIC(12, 2) NOT NULL,
  valid_from DATE NOT NULL,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### API Endpoints:
- `POST /api/pricing/calculate` - BOM maliyeti hesapla
- `GET /api/pricing/history/[productId]` - Fiyat geçmişi
- `POST /api/pricing/customer-special` - Müşteriye özel fiyat

---

## 🟡 ORTA ÖNCELİK

### 4. 📧 Email Notification Sistemi
**Süre:** 2-3 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨

#### Email Senaryoları:
- ✉️ Kritik stok uyarısı → Planlama & Yönetici
- ✉️ Sipariş onayı → Müşteri
- ✉️ Production tamamlandı → Planlama
- ✉️ Gecikmeli sipariş uyarısı → Yönetici
- ✉️ Günlük özet raporu → Yönetici

#### Implementation:
```typescript
// lib/email/sendgrid.ts (veya AWS SES, Resend)
import sgMail from '@sendgrid/mail';

export const sendCriticalStockAlert = async (material: any, recipients: string[]) => {
  const msg = {
    to: recipients,
    from: 'noreply@thunder-erp.com',
    subject: `⚠️ Kritik Stok Uyarısı: ${material.name}`,
    html: `
      <h2>Kritik Stok Seviyesi Tespit Edildi</h2>
      <p>Malzeme: <strong>${material.name}</strong></p>
      <p>Mevcut Stok: <strong>${material.quantity} ${material.unit}</strong></p>
      <p>Kritik Seviye: <strong>${material.critical_level} ${material.unit}</strong></p>
      <p>Lütfen acil sipariş verin!</p>
    `
  };
  await sgMail.send(msg);
};
```

#### Environment Variables:
```env
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@thunder-erp.com
```

---

### 5. 🔒 HTTPS/SSL Sertifikası
**Süre:** 30 dakika (domain varsa)  
**Impact:** ⭐⭐  
**Zorluk:** 🔨

#### Gereksinimler:
- Domain adı (örn: erp.yourcompany.com)
- DNS ayarları (A record → server IP)

#### Kurulum:
```bash
# Sunucuda
sudo apt install certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d erp.yourcompany.com

# Otomatik yenileme testi
sudo certbot renew --dry-run

# Cron job (otomatik yenileme)
sudo crontab -e
# Ekle: 0 3 * * * /usr/bin/certbot renew --quiet
```

#### Nginx Config Güncellemesi:
```nginx
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name erp.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    server_name erp.yourcompany.com;
    
    ssl_certificate /etc/letsencrypt/live/erp.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourcompany.com/privkey.pem;
    
    # ... existing config
}
```

#### Cookie Güncelleme:
```typescript
// app/api/auth/login/route.ts
secure: process.env.NODE_ENV === 'production', // true yap
```

---

### 6. ⏰ Son Kullanma Tarihi Takibi
**Süre:** 1-2 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨

#### Database Migration:
```sql
-- Hammaddelere expiry date ekle
ALTER TABLE raw_materials ADD COLUMN expiry_date DATE;
ALTER TABLE raw_materials ADD COLUMN batch_number TEXT;

-- Yarı mamullere
ALTER TABLE semi_finished_products ADD COLUMN expiry_date DATE;
ALTER TABLE semi_finished_products ADD COLUMN batch_number TEXT;

-- Expired stock view
CREATE VIEW v_expired_stock AS
SELECT 
  'raw' as material_type,
  id,
  code,
  name,
  quantity,
  expiry_date,
  CASE 
    WHEN expiry_date < CURRENT_DATE THEN 'expired'
    WHEN expiry_date < CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as status
FROM raw_materials
WHERE expiry_date IS NOT NULL
UNION ALL
SELECT 
  'semi' as material_type,
  id,
  code,
  name,
  quantity,
  expiry_date,
  CASE 
    WHEN expiry_date < CURRENT_DATE THEN 'expired'
    WHEN expiry_date < CURRENT_DATE + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as status
FROM semi_finished_products
WHERE expiry_date IS NOT NULL;

-- Expired stock notification trigger
CREATE OR REPLACE FUNCTION check_expired_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date < CURRENT_DATE + INTERVAL '7 days' THEN
    INSERT INTO notifications (
      type, title, message, material_type, material_id, severity, target_roles
    )
    VALUES (
      'critical_stock',
      'Son Kullanma Tarihi Yaklaşıyor',
      format('%s (%s) stok son kullanma tarihi yaklaşıyor: %s', NEW.name, NEW.code, NEW.expiry_date),
      TG_TABLE_NAME,
      NEW.id,
      'high',
      ARRAY['depo', 'yonetici']
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 7. 🔍 Gelişmiş Filtreleme Sistemi
**Süre:** 2 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨

#### Özellikler:
- Multi-select filters (status, priority, etc.)
- Date range picker (from-to)
- Price range slider
- Stock level range
- Saved filter presets
- Export filtered data

#### Component:
```typescript
// components/ui/advanced-filter.tsx
interface FilterConfig {
  dateRange?: { from: Date; to: Date };
  status?: string[];
  priority?: string[];
  priceRange?: { min: number; max: number };
  stockRange?: { min: number; max: number };
}

export function AdvancedFilter({
  onFilterChange,
  config
}: {
  onFilterChange: (filters: FilterConfig) => void;
  config: FilterConfig;
}) {
  // Filter UI with date picker, multi-select, range sliders
}
```

---

## 🟢 DÜŞÜK ÖNCELİK (Long-term Features)

### 8. 📅 Production Scheduling & Gantt Chart
**Süre:** 3-4 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨🔨

#### Özellikler:
- Gantt chart görünümü (react-gantt-chart)
- Otomatik operatör atama (kapasite bazlı)
- Shift yönetimi (sabah/öğleden sonra/gece)
- Makine/ekipman takibi
- Kapasite planlaması

#### Libraries:
```bash
npm install react-gantt-chart
npm install date-fns
```

---

### 9. ✅ Kalite Kontrol Modülü
**Süre:** 4-5 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨🔨

#### Database Schema:
```sql
CREATE TABLE quality_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_plan_id UUID REFERENCES production_plans(id),
  checkpoint_name TEXT NOT NULL,
  checked_by UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('passed', 'failed', 'pending')),
  defect_count INTEGER DEFAULT 0,
  notes TEXT,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE defect_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('minor', 'major', 'critical')),
  description TEXT
);

CREATE TABLE quality_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id UUID REFERENCES quality_checkpoints(id),
  defect_type_id UUID REFERENCES defect_types(id),
  quantity INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 10. 💳 Müşteri Portal
**Süre:** 8-10 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨🔨🔨

#### Özellikler:
- Müşteri login sistemi (ayrı authentication)
- Sipariş takibi (order tracking)
- Üretim durumu canlı görüntüleme
- Fatura görüntüleme/indirme
- Online teklif alma
- Sipariş geçmişi

#### Yeni Roller:
```sql
-- users tablosuna yeni rol ekle
ALTER TABLE users ALTER COLUMN role TYPE TEXT;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('yonetici', 'planlama', 'depo', 'operator', 'customer'));

-- Customer users için
CREATE TABLE customer_users (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{"view_orders": true, "create_orders": false}'::jsonb
);
```

---

### 11. 🔔 Push Notifications
**Süre:** 1-2 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨

#### Implementation:
```typescript
// lib/notifications/push.ts
export const requestNotificationPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const sendBrowserNotification = (title: string, body: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/thunder-icon.png',
      badge: '/thunder-badge.png'
    });
  }
};

// Real-time hook'a entegre et
useEffect(() => {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'notifications' 
    }, (payload) => {
      sendBrowserNotification(payload.new.title, payload.new.message);
    })
    .subscribe();
}, []);
```

---

### 12. 🔐 Rate Limiting & Security
**Süre:** 1-2 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨

#### Implementation:
```typescript
// middleware.ts - Rate limiting
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  // ... existing middleware logic
}
```

#### Dependencies:
```bash
npm install @upstash/ratelimit @upstash/redis
```

---

### 13. 💾 Database Backup Automation
**Süre:** 1 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨

#### Strateji:
- Supabase otomatik backup zaten var
- Ekstra backup script (cron job)
- Point-in-time recovery

#### Server Script:
```bash
#!/bin/bash
# /home/vipkrom/backup-thunder.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/vipkrom/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/thunder-app-$DATE.tar.gz /var/www/thunder-erp

# Backup environment
cp /var/www/thunder-erp/.env.local $BACKUP_DIR/env-backup-$DATE.txt

# Keep only last 7 backups
ls -t $BACKUP_DIR/thunder-app-*.tar.gz | tail -n +8 | xargs rm -f

echo "✅ Backup completed: $DATE"
```

#### Cron Job:
```bash
# Günlük 3:00'da backup
crontab -e
0 3 * * * /home/vipkrom/backup-thunder.sh >> /home/vipkrom/backup.log 2>&1
```

---

### 14. 🎨 Advanced UI/UX Features
**Süre:** 3-4 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨

#### Özellikler:
- Dark mode (sistem/manuel)
- Drag & drop (BOM ağacı, zone transfer)
- Keyboard shortcuts (Ctrl+K command palette)
- Customizable dashboard widgets
- User preferences (dil, tema, layout)
- Print-friendly layouts

#### Implementation:
```typescript
// Dark mode
// tailwind.config.ts
export default {
  darkMode: 'class',
  // ...
}

// app/layout.tsx
import { ThemeProvider } from 'next-themes';

<ThemeProvider attribute="class" defaultTheme="system">
  {children}
</ThemeProvider>

// components/ui/theme-toggle.tsx
import { useTheme } from 'next-themes';
```

---

### 15. 📊 Advanced Analytics & BI
**Süre:** 4-5 saat  
**Impact:** ⭐⭐  
**Zorluk:** 🔨🔨🔨

#### Özellikler:
- Predictive analytics (AI tahmin)
- Trend forecasting
- ABC analizi (stok sınıflandırma)
- Cost center analysis
- Profit margin by product/customer
- Seasonal analysis

---

### 16. 🧪 Automated Testing Suite
**Süre:** 5-8 saat  
**Impact:** ⭐  
**Zorluk:** 🔨🔨🔨

#### Test Stack:
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @playwright/test
npm install --save-dev vitest
```

#### Test Kategorileri:
- Unit tests (utilities, helpers)
- Component tests (React Testing Library)
- API tests (endpoint validation)
- E2E tests (Playwright - full user flows)

#### CI/CD Pipeline:
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

---

### 17. 📱 Mobile App (React Native)
**Süre:** 3-4 hafta  
**Impact:** ⭐⭐⭐  
**Zorluk:** 🔨🔨🔨🔨🔨

#### Özellikler:
- iOS & Android native apps
- Native barcode scanner
- Offline mode (SQLite)
- Push notifications
- Camera integration
- Fingerprint auth

#### Tech Stack:
```
React Native + Expo
- expo-barcode-scanner
- expo-camera
- expo-sqlite
- expo-notifications
- React Navigation
- Zustand (state)
```

---

### 18. 🔄 Webhook & Integration APIs
**Süre:** 2-3 saat  
**Impact:** ⭐  
**Zorluk:** 🔨🔨

#### Özellikler:
- Webhook system (order created, production completed)
- REST API for external systems
- Third-party integrations (accounting software, CRM)
- API key management
- Rate limiting per API key

---

## 🎯 ÖNERİLEN UYGULAMA SIRASI

### **Faz 1: Quick Wins (1 hafta)**
```
1. Envanter Sayımı Modal ✅ (40 dk)
2. Excel Export İyileştirmeleri ✅ (1 saat)
3. Pricing System ✅ (2-3 saat)
4. HTTPS/SSL Setup ✅ (30 dk - domain varsa)
```

### **Faz 2: Core Improvements (2-3 hafta)**
```
5. Email Notifications (2-3 saat)
6. Expired Stock Tracking (1-2 saat)
7. Advanced Filtering (2 saat)
8. Push Notifications (1-2 saat)
9. Rate Limiting (1-2 saat)
10. Database Backup (1 saat)
```

### **Faz 3: Advanced Features (1-2 ay)**
```
11. Production Scheduling & Gantt
12. Quality Control Module
13. Advanced Analytics
14. Advanced UI/UX (dark mode, shortcuts)
15. Automated Testing
```

### **Faz 4: Expansion (3+ ay)**
```
16. Customer Portal
17. Mobile App
18. Webhook & Integration APIs
```

---

## 📝 IMPLEMENTATION NOTLARI

### Genel Prensipler:
- ✅ Her özellik için branch oluştur (`feature/inventory-count`)
- ✅ Test et, sonra main'e merge et
- ✅ Database migration'ları ayrı SQL dosyalarında sakla
- ✅ Changelog.md güncelle
- ✅ API documentation'ı güncelle

### Testing Checklist:
- [ ] Local'de test et
- [ ] Production'da test et
- [ ] Different roles ile test et
- [ ] Edge cases test et
- [ ] Performance test et

---

## 🔗 İlgili Dosyalar

- `PROJECT_SUMMARY.md` - Mevcut özellikler
- `IMPLEMENTATION_CHECKLIST.md` - Tamamlanan checklist
- `API_REFERENCE.md` - API documentation
- `DATABASE_SCHEMA.md` - Database structure
- `WORKFLOWS.md` - Business process flows

---

## 📞 Destek

Feature eklerken sorun yaşarsan:
- GitHub Issues: https://github.com/Huseyintabak/ERP-V2/issues
- Documentation'a bak
- AI assistant'a sor 😊

---

**🎯 SONUÇ:** ThunderV2 şu anda tam fonksiyonel bir production sistemi. Bu dosyadaki özellikler "bonus" iyileştirmeler - sistem bunlar olmadan da mükemmel çalışıyor!

**Ne zaman eklemeye başlamak isterseniz, bu dosyayı referans alın!** ⚡

