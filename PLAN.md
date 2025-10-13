# Thunder ERP v2 - Üretim Yönetim Sistemi

## Proje Mimarisi

### Teknoloji Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS v4.1
- **Database:** Supabase (PostgreSQL)
- **Real-time:** Supabase Realtime Subscriptions
- **Authentication:** Custom JWT (bcrypt + jsonwebtoken)
- **UI Components:** Shadcn/ui
- **Charts:** Recharts (Shadcn/ui ile entegre)
- **State Management:** Zustand (global state için)
- **Form Validation:** Zod + React Hook Form

### Mimari Prensipleri

- **Clean Architecture:** Feature-based folder structure
- **Server Components:** Mümkün olduğunca Server Components kullan
- **Client Components:** Sadece interaktif bölümler için
- **RBAC:** Middleware + Server-side role kontrolü
- **Real-time:** Supabase Realtime channels ile dashboard güncellemeleri

---

## Dosya Yapısı

```
ThunderV2/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx           # Main dashboard layout + sidebar
│   │   ├── page.tsx             # Ana Sayfa (KPI kartları)
│   │   ├── stok/
│   │   │   ├── page.tsx         # Stok Yönetimi (dropdown: hammadde/yarı/nihai)
│   │   │   └── _components/
│   │   ├── uretim/
│   │   │   ├── yonetim/
│   │   │   ├── operatorler/
│   │   │   └── urun-agaci/
│   │   ├── yonetici/
│   │   │   └── page.tsx         # Yönetici Analytics Dashboard
│   ├── (operator)/
│   │   ├── operator-login/
│   │   └── operator-dashboard/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── stock/route.ts
│   │   ├── production/route.ts
│   │   └── orders/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                      # Shadcn components
│   ├── dashboard/
│   │   ├── kpi-card.tsx
│   │   ├── quick-access-card.tsx
│   │   └── header.tsx
│   ├── stock/
│   ├── production/
│   └── operator/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   ├── auth/
│   │   ├── jwt.ts               # JWT sign/verify
│   │   └── password.ts          # bcrypt hash/compare
│   ├── hooks/
│   │   ├── use-realtime.ts      # Supabase realtime hook
│   │   └── use-barcode.ts       # Barkod input hook
│   └── utils.ts
├── stores/
│   ├── auth-store.ts            # Zustand: user, role
│   └── production-store.ts      # Zustand: active productions
├── types/
│   ├── database.ts              # Supabase generated types
│   └── index.ts
└── middleware.ts                # JWT verification + RBAC
```

---

## Database Şeması (Supabase PostgreSQL)

### Ana Tablolar

**users** (Kullanıcılar)

- id (uuid, PK)
- email (text, unique)
- password_hash (text)
- name (text)
- role (enum: 'yonetici', 'planlama', 'depo', 'operator')
- created_at, updated_at

**raw_materials** (Hammaddeler)

- id (uuid, PK)
- code (text, unique)
- name (text)
- barcode (text, unique, nullable)
- quantity (numeric)
- unit (text)
- unit_price (numeric)
- description (text)
- created_at, updated_at

**semi_finished_products** (Yarı Mamuller)

- id (uuid, PK)
- code (text, unique)
- name (text)
- barcode (text, unique, nullable)
- quantity (numeric)
- unit (text)
- unit_cost (numeric)
- description (text)
- created_at, updated_at

**finished_products** (Nihai Ürünler)

- id (uuid, PK)
- code (text, unique)
- name (text)
- barcode (text, unique, nullable)
- quantity (numeric)
- unit (text)
- sale_price (numeric)
- description (text)
- created_at, updated_at

**bom** (Bill of Materials - Ürün Ağacı)

- id (uuid, PK)
- finished_product_id (uuid, FK -> finished_products)
- material_type (enum: 'raw', 'semi')
- material_id (uuid) -- polymorphic
- quantity_needed (numeric)
- created_at

**orders** (Siparişler)

- id (uuid, PK)
- order_number (text, unique)
- customer_name (text)
- product_id (uuid, FK -> finished_products)
- quantity (numeric)
- delivery_date (date)
- priority (enum: 'dusuk', 'orta', 'yuksek')
- status (enum: 'beklemede', 'uretimde', 'tamamlandi')
- created_by (uuid, FK -> users)
- created_at, updated_at

**production_plans** (Üretim Planları)

- id (uuid, PK)
- order_id (uuid, FK -> orders)
- product_id (uuid, FK -> finished_products)
- planned_quantity (numeric)
- produced_quantity (numeric, default: 0)
- status (enum: 'planlandi', 'devam_ediyor', 'duraklatildi', 'tamamlandi')
- assigned_operator_id (uuid, FK -> users, nullable)
- started_at (timestamp, nullable)
- completed_at (timestamp, nullable)
- created_at, updated_at

**operators** (Operatörler - Extended user info)

- id (uuid, PK, FK -> users)
- series (enum: 'thunder', 'thunder_pro')
- experience_years (integer)
- daily_capacity (numeric)
- location (text)
- hourly_rate (numeric)
- active_productions_count (integer, default: 0)

**production_logs** (Üretim Kayıtları - Barkod okutma)

- id (uuid, PK)
- plan_id (uuid, FK -> production_plans)
- operator_id (uuid, FK -> users)
- barcode_scanned (text)
- quantity_produced (numeric)
- timestamp (timestamp)

**stock_movements** (Stok Hareketleri)

- id (uuid, PK)
- material_type (enum: 'raw', 'semi', 'finished')
- material_id (uuid)
- movement_type (enum: 'giris', 'cikis', 'uretim', 'sayim')
- quantity (numeric)
- user_id (uuid, FK -> users)
- description (text)
- created_at

**price_history** (Fiyat Geçmişi)

- id (uuid, PK)
- material_type (enum: 'raw', 'semi')
- material_id (uuid)
- price (numeric)
- effective_date (date)
- created_at

**material_reservations** (Malzeme Rezervasyonları)

- id (uuid, PK)
- order_id (uuid, FK -> orders)
- material_type (enum: 'raw', 'semi', 'finished')
- material_id (uuid)
- reserved_quantity (numeric)
- created_at

**production_plan_bom_snapshot** (BOM Snapshot)

- id (uuid, PK)
- plan_id (uuid, FK -> production_plans)
- material_type (enum: 'raw', 'semi')
- material_id (uuid)
- material_code (text)
- material_name (text)
- quantity_needed (numeric)
- created_at

**notifications** (Bildirimler)

- id (uuid, PK)
- type (enum: 'critical_stock', 'production_delay', 'order_update')
- title (text)
- message (text)
- material_type, material_id (opsiyonel)
- severity (enum: 'low', 'medium', 'high', 'critical')
- is_read (boolean)
- user_id (uuid, FK -> users, nullable)
- created_at

**audit_logs** (İşlem Geçmişi)

- id (uuid, PK)
- user_id (uuid, FK -> users)
- action (enum: 'CREATE', 'UPDATE', 'DELETE')
- table_name (text)
- record_id (uuid)
- old_values, new_values (jsonb)
- ip_address, user_agent (text)
- created_at

**system_settings** (Sistem Ayarları)

- key (text, PK)
- value (text)
- description (text)
- updated_by (uuid, FK -> users)
- updated_at

---

## Authentication & Authorization Akışı

### Custom JWT Yapısı

1. `/api/auth/login` → bcrypt ile şifre kontrolü → JWT oluştur (payload: userId, role, exp)
2. JWT'yi `httpOnly` cookie'ye kaydet
3. `middleware.ts` her istekte JWT doğrular
4. Role-based page access kontrolü

### RBAC Matrixi

- **Yönetici:** Tüm sayfalara erişim
- **Planlama:** Ana Sayfa, Üretim (Yönetim, Operatör Takibi, Ürün Ağacı)
- **Depo:** Ana Sayfa, Stok Yönetimi
- **Operatör:** Sadece Operatör Paneli (özel login)

---

## UI/UX Tasarım Detayları

### Ana Sayfa (Dashboard Home)

**4 KPI Kartı** (Shadcn Card + Badge)

- Hammadde Toplam Değer
- Yarı Mamul Toplam Değer
- Nihai Ürün Toplam Değer
- Aktif Üretim Sayısı

**Hızlı Erişim Kartları** (Grid Layout)

- Stok Yönetimi (Icon: Package, Buttons: Stok Giriş / Stok Çıkış)
- Üretim Planlama (Icon: Calendar, Buttons: Üretim Başla / İş Emirleri)
- Raporlama (Icon: BarChart, Buttons: Üretim Raporu / Stok Raporu)

### Stok Yönetimi Sayfası

**Dropdown (Shadcn Tabs):** Hammadde | Yarı Mamul | Nihai Ürün

**Her Tab İçin:**

- Form (Shadcn Form + Input + Button)
- DataTable (Shadcn Table + sortable columns)
- İşlemler: Edit (Dialog açar), Delete (Alert Dialog)

### Üretim Yönetimi

**Sipariş Yönetimi:**

- DataTable: Üretimdeki Siparişler + Tamamlanan Siparişler
- "Yeni Sipariş Ekle" → Dialog Form
- Sipariş onaylandığında otomatik `production_plans` oluştur

**Üretim Planlama:**

- Aktif Planlar DataTable
- Tamamlanan Planlar DataTable
- Kaynak Yönetimi Tab: Operatör Listesi (Cards)

**Operatör Takibi:**

- 4 KPI Kart: Aktif Operatör, Aktif Üretim, Bugün Tamamlanan, Verimlilik
- Operatör Kartları (Thunder vs ThunderPro serisi)

### Operatör Paneli

**Login:** Operatör seçimi + şifre

**Dashboard:**

- Atanan Siparişler (DataTable, Kabul Et butonu)
- Aktif Üretimler (DataTable, Görüntüle butonu)

**Üretim Detay Modal:**

- Ürün bilgileri
- Barkod Input (autoFocus, `useBarcode` hook ile USB okuyucu dinle)
- İlerleme Bar (produced / planned)
- Tamamla / Duraklat butonları

### Yönetici Analytics Dashboard

- Gelişmiş KPI'lar (Recharts: LineChart, BarChart, PieChart)
- Üretim trendleri
- Operatör performans karşılaştırması
- Stok seviye uyarıları

---

## Real-time Özellikler (Supabase Realtime)

### Channel Subscriptions

1. **`production_plans` tablo değişiklikleri** → Yönetici dashboard'ı güncelle
2. **`production_logs` INSERT** → KPI kartlarını güncelle
3. **`stock_movements` INSERT** → Stok seviyelerini canlı güncelle
4. **`orders` UPDATE** → Sipariş durumu değişikliklerini yansıt

### Implementation

- `useRealtime` custom hook
- Supabase client `subscribe()` ile channel dinle
- Zustand store'u güncelle → UI otomatik re-render

---

## Kritik Özellikler & Edge Cases

### Barkod Okutma & Anlık Stok Güncelleme

- `useBarcode` hook: keypress event listener
- Enter tuşuna basıldığında barkod tamamlanmış sayılır
- BOM kontrolü: Barkod doğru ürüne ait mi?
- **Her barkod okutmada:** Anlık stok güncelleme (production_logs + stock_movements)
- Real-time: Stok seviyeleri tüm dashboard'larda canlı güncellenir

### Otomatik Üretim Planlaması & Stok Kontrolü

- **Sipariş Akışı:**
  1. Planlama personeli sipariş ekler (status: 'beklemede')
  2. "Onayla" butonuna basar → Stok kontrolü tetiklenir
  3. BOM'dan hammadde/yarı mamul ihtiyacı hesaplanır
  4. **Stok YETERLİ:** Status 'uretimde' olur + production_plan oluşur
  5. **Stok YETERSİZ:** Toast notification gösterilir + sipariş 'beklemede' kalır + eksik malzemeler listelenir

- Operatör ataması: Manuel (İş Emirleri ekranından) veya otomatik (en az yüklü operatör)

### Excel Import/Export Özellikleri

**Stok Yönetimi:**

- **Export:** Hammadde/Yarı/Nihai ürün listelerini Excel'e aktar (xlsx format)
- **Import:** Excel'den toplu stok ekleme/güncelleme (template dosyası sağlanır)
- **Validasyon:** Import sırasında kod/barkod unique kontrolü, format kontrolü

**Envanter Sayım:**

- Tüm stok verilerini Excel'e aktar
- Fiziksel sayım sonrası Excel'de düzenle
- Import et → Sistem farkını hesaplar + stock_movements otomatik oluşur

**BOM Import:**

- Template Excel: finished_product_code | material_type | material_code | quantity_needed
- Drag-drop Excel file veya file picker

### Fiyat Yönetimi & Yıllık Ortalama

**Yeni Tablo:** `price_history`

- id, material_type, material_id, price, effective_date, created_at

**Fiyat Güncelleme:**

- Hammadde/Yarı mamul fiyat güncellendiğinde → price_history tablosuna kayıt
- Dashboard'larda "Yıllık Ortalama Fiyat" gösterimi
- SQL: `AVG(price) WHERE effective_date >= NOW() - INTERVAL '1 year'`

### Operatör Çoklu Üretim

- Operatör aynı anda N adet üretim kabul edebilir (limit yok)
- "Aktif Üretimler" tablosunda tüm kabul edilenler listelenir
- Her üretim için ayrı barkod okutma modal'ı (tab'lar veya ayrı sayfalar)

### Rol Bazlı Sidebar

- `middleware.ts` role kontrolü
- `layout.tsx` içinde conditional rendering
- Unauthorized access → 403 page

---

## Implementasyon Sırası

### Phase 1: Proje Kurulumu

- Next.js 14 + TypeScript projesi oluştur
- Tailwind CSS v4.1 yapılandır
- Shadcn/ui kurulumu (tüm gerekli componentler)
- Supabase projesi + Cloud setup
- Database migration + seed data

### Phase 2: Authentication

- JWT utils (sign, verify)
- Login API route + middleware
- Auth store (Zustand)
- Login sayfası
- Role-based routing

### Phase 3: Ana Sayfa & Layout

- Dashboard layout + sidebar (role-based)
- KPI kartları (Shadcn Card)
- Hızlı erişim kartları
- Header component

### Phase 4: Stok Yönetimi

- Hammadde CRUD (Form + Table)
- Yarı Mamul CRUD
- Nihai Ürün CRUD
- Stok Giriş/Çıkış modals
- Excel Import/Export (hatalı satırlar skip)
- Kritik seviye uyarıları
- Rezervasyon görüntüleme
- Real-time stok güncellemeleri

### Phase 5: Üretim Modülü

- Sipariş yönetimi (CRUD + Düzenleme/İptal logic)
- Otomatik üretim planlaması (stok kontrolü + rezervasyon)
- BOM snapshot mekanizması
- Operatör yönetimi
- Operatör takip dashboard
- Ürün Ağacı (BOM) yönetimi + Excel import

### Phase 6: Operatör Paneli

- Operatör login
- Atanan siparişler listesi
- Üretim kabul etme (çoklu üretim desteği)
- Barkod okutma modal (useBarcode hook)
- Otomatik hammadde/yarı mamul tüketimi
- Üretim tamamlama/duraklama
- Hatalı kayıt geri alma (5dk window)

### Phase 7: Yönetici Dashboard

- Analytics sayfası
- Recharts entegrasyonu
- Gelişmiş KPI'lar
- Real-time charts

### Phase 8: Admin & Advanced Features

- Kullanıcı yönetimi (CRUD, şifre sıfırlama)
- System settings yönetimi
- Audit log viewer
- Bildirim sistemi
- Real-time subscriptions (8 tablo)

### Phase 9: Polish & Testing

- Error handling & validation
- Error Boundary component
- Loading states (Skeleton)
- Toast notifications (Shadcn Sonner)
- Final testing
- Transaction safety kontrolü

---

## Önemli Notlar

**Tailwind v4.1:** CSS-first configuration kullan, `@theme` directive

**Shadcn/ui:** CLI ile component'leri tek tek ekle: `npx shadcn@latest add card table button form...`

**Supabase Cloud:** Web dashboard'tan proje oluştur, credentials .env.local'e ekle

**USB Barkod:** Fiziksel okuyucu keyboard input gibi davranır, special handling gerekmez

**Localhost Deployment:** `npm run dev` yeterli, production build gerekmez

---

## Tasarım Sistemi Kuralları

- **Spacing:** Tailwind'in 4pt grid sistemi (gap-4, p-6, etc.)
- **Colors:** Primary (Blue), Success (Green), Warning (Yellow), Danger (Red)
- **Typography:** Inter font, heading hierarchy
- **Components:** Shadcn'nin default variant'larını kullan, custom CSS minimum
- **Responsiveness:** Desktop-first (localhost ERP, mobil önceliği yok)
- **Accessibility:** ARIA labels, keyboard navigation, focus states

**CASPER UYARISI:** Bu plan, temiz kod ve sürdürülebilir mimari prensipleriyle hazırlandı. Hiçbir "God Component" kabul edilmeyecek. Her modül kendi sorumluluğunu taşıyacak. Real-time özellikleri doğru implement etmek kritik—yanlış yapılırsa performans cehennemi yaşarsın.

