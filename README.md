# ⚡ ThunderV2 ERP System

> Modern, gerçek zamanlı üretim yönetimi platformu

**ThunderV2**, üretim şirketleri için tasarlanmış, Next.js 15 ve Supabase ile geliştirilmiş kapsamlı bir ERP sistemidir. Sipariş yönetiminden üretim takibine, stok kontrolünden operatör performansına kadar tüm üretim süreçlerinizi tek platformda yönetin.

---

## ✨ Özellikler

### 🏭 Üretim Yönetimi
- **Çok Ürünlü Sipariş Sistemi** - Tek siparişte birden fazla ürün
- **BOM (Bill of Materials)** - Ürün reçetesi yönetimi ve snapshot sistemi
- **Üretim Planlama** - Otomatik plan oluşturma ve operatör atama
- **Barkod Okuma** - USB barkod okuyucu desteği ile hızlı üretim kaydı
- **Gerçek Zamanlı Takip** - Üretim ilerlemesi canlı güncelleme

### 📦 Stok Yönetimi
- **3 Stok Tipi** - Hammadde, Yarı Mamul, Nihai Ürün
- **Kritik Stok Uyarıları** - Otomatik rol bazlı bildirimler
- **Depo Bölge Yönetimi** - Bölgeler arası transfer sistemi
- **Excel İmport/Export** - Toplu veri aktarımı
- **Stok Hareketleri** - Detaylı hareket geçmişi ve audit log

### 👥 Kullanıcı Rolleri
- **Yönetici** - Tam sistem erişimi, analytics, kullanıcı yönetimi
- **Planlama** - Sipariş ve üretim planlama, BOM yönetimi
- **Depo** - Stok ve depo operasyonları
- **Operatör** - Basitleştirilmiş üretim paneli, barkod okuma

### 📊 Analytics & Raporlama
- **KPI Dashboard'ları** - Rol bazlı performans metrikleri
- **Production Trends** - Recharts ile görselleştirilmiş trendler
- **Operatör Performansı** - Üretim verimlilik analizleri
- **İşlem Geçmişi** - Kapsamlı audit logging sistemi

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+ 
- npm/yarn/pnpm
- Supabase hesabı (ücretsiz tier yeterli)

### Kurulum

1. **Projeyi klonlayın**
```bash
git clone <your-repo-url>
cd ThunderV2
```

2. **Bağımlılıkları yükleyin**
```bash
npm install
```

3. **Environment dosyasını oluşturun**
```bash
cp .env.example .env.local
```

`.env.local` dosyasını düzenleyin:
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

4. **Veritabanını kurun**
- Supabase Dashboard → SQL Editor
- `supabase/migration.sql` dosyasını çalıştırın
- `supabase/seed.sql` ile test verilerini yükleyin

5. **Development sunucusunu başlatın**
```bash
npm run dev
```

Tarayıcınızda `http://localhost:3000` adresini açın.

---

## 🔑 Varsayılan Kullanıcılar

| Email | Şifre | Rol | Erişim |
|-------|-------|-----|--------|
| admin@thunder.com | admin123 | Yönetici | Tam erişim |
| planlama@thunder.com | plan123 | Planlama | Sipariş & Üretim |
| depo@thunder.com | depo123 | Depo | Stok & Depo |
| operator@thunder.com | op123 | Operatör | Üretim Paneli |

> ⚠️ **Güvenlik Notu:** Production'da bu şifreleri mutlaka değiştirin!

---

## 🏗️ Mimari

### Frontend
```
Next.js 15 (App Router)
├── TypeScript (Strict Mode)
├── Tailwind CSS v4.1
├── Shadcn/ui Components
├── Zustand (State Management)
├── React Hook Form + Zod
└── Recharts (Visualizations)
```

### Backend
```
Next.js API Routes
├── Supabase PostgreSQL
├── JWT Authentication (JOSE)
├── Edge Runtime Compatible
├── Real-time Subscriptions
└── XLSX (Excel Processing)
```

### Veritabanı
- **16 Tablo** - Normalized schema
- **20+ Trigger** - Automatic workflows
- **3 View** - Optimized analytics
- **RLS Policies** - Row-level security

---

## 📂 Proje Yapısı

```
ThunderV2/
├── app/
│   ├── (auth)/              # Auth pages (login)
│   ├── (dashboard)/         # Main app pages
│   ├── (operator)/          # Operator panel
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # Shadcn/ui components
│   ├── stock/               # Stock management
│   ├── production/          # Production features
│   ├── operator/            # Operator components
│   └── layout/              # Layout components
├── lib/
│   ├── auth/                # JWT & password utils
│   ├── supabase/            # DB clients
│   ├── hooks/               # Custom hooks
│   └── utils/               # Utility functions
├── stores/                  # Zustand stores
├── types/                   # TypeScript definitions
└── supabase/                # Database migrations
```

---

## 🔄 Workflow'lar

### Sipariş → Üretim Akışı
```
1. Sipariş Oluşturma (Planlama)
   ↓
2. Stok Kontrolü & Onay
   ↓
3. BOM Snapshot Alınır
   ↓
4. Üretim Planı Oluşturulur
   ↓
5. Operatör Ataması
   ↓
6. Barkod ile Üretim Kaydı
   ↓
7. Otomatik Stok Güncelleme
   ↓
8. Tamamlanma & Raporlama
```

### Kritik Stok Bildirimi
```
Stock Movement Trigger
   ↓
Stok Seviyesi < Kritik Seviye?
   ↓ (Evet)
Bildirim Oluştur (target_roles: ['planlama', 'yonetici'])
   ↓
Real-time Broadcast
   ↓
Kullanıcılara Toast Notification
```

---

## 🧪 Test

### Manuel Test
```bash
# Test verilerini yükle
npm run seed-test-data

# Development'ta test et
npm run dev
```

Test senaryoları için `REAL_TEST_GUIDE.md` dosyasına bakın.

### Production Build
```bash
npm run build
npm start
```

---

## 📚 Dokümantasyon

| Dosya | İçerik |
|-------|--------|
| `PROJECT_SUMMARY.md` | Proje özeti ve mimari |
| `API_REFERENCE.md` | 40+ API endpoint dokümantasyonu |
| `DATABASE_SCHEMA.md` | Tablo yapıları ve ilişkiler |
| `WORKFLOWS.md` | İş akışları ve diyagramlar |
| `IMPLEMENTATION_CHECKLIST.md` | 850+ satır development roadmap |
| `MIGRATION_SUCCESS_REPORT.md` | Migration test sonuçları |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling:** [Tailwind CSS v4.1](https://tailwindcss.com/)
- **UI Library:** [Shadcn/ui](https://ui.shadcn.com/)
- **State:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Forms:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Excel:** [SheetJS](https://sheetjs.com/)

---

## 🚢 Deployment

### Vercel (Önerilen)
```bash
# Vercel CLI ile
vercel

# Veya GitHub'a push edin, Vercel otomatik deploy eder
```

### Environment Variables
Production'da şu değişkenleri ayarlayın:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET` (min 32 karakter)

---

## 🔒 Güvenlik

- ✅ JWT-based authentication
- ✅ httpOnly cookies
- ✅ Role-based access control (RBAC)
- ✅ Row-level security (RLS) policies
- ✅ Input validation with Zod
- ✅ SQL injection protection (Supabase)
- ✅ XSS protection (React)

---

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit'leyin (`git commit -m 'feat: Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

---

## 📝 Lisans

Bu proje özel kullanım içindir. Ticari kullanım için lütfen iletişime geçin.

---

## 📧 İletişim

**Proje Sahibi:** Thunder Team  
**Email:** info@thunder-erp.com

---

## 🎉 Teşekkürler

ThunderV2'yi seçtiğiniz için teşekkürler! Sorularınız için [Issues](https://github.com/your-repo/issues) açabilirsiniz.

---

**⚡ Built with Thunder - Made in Turkey 🇹🇷**
