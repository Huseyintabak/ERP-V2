# Supabase Database Setup

## Adım 1: Supabase Projesi Oluştur

1. https://supabase.com adresine git ve login ol
2. **"New Project"** butonuna tıkla
3. Proje bilgilerini gir:
   - **Name:** `thunder-erp-v2`
   - **Database Password:** Güçlü bir şifre belirle (MUTLAKA KAYDET!)
   - **Region:** **Europe West (Frankfurt)** seç
   - **Pricing Plan:** Free tier yeterli
4. **"Create new project"** butonuna tıkla
5. ~2 dakika bekle (database provisioning)

## Adım 2: API Credentials Al

Proje hazır olunca:

1. Sol menüden **Settings** → **API** seç
2. Şu değerleri kopyala:

   **Project URL:**
   ```
   https://xxxxxxxxxxxxx.supabase.co
   ```

   **Anon (public) Key:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

   **Service Role Key:** (Show butonuna bas)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. ThunderV2 klasöründe `.env.local` dosyası oluştur:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
JWT_SECRET=thunder-erp-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=development
```

## Adım 3: Database Schema Oluştur

1. Supabase Dashboard'da sol menüden **SQL Editor** seç
2. **"New Query"** butonuna tıkla
3. `supabase/migration.sql` dosyasının **TÜM İÇERİĞİNİ** kopyala
4. SQL Editor'a yapıştır
5. **"Run"** (veya Ctrl+Enter) ile çalıştır
6. ✅ Başarılı mesajı gelene kadar bekle (~10 saniye)

**KONTROL:**
- Sol menüden **Table Editor** → 16 tablo görünmeli
- **Database** → **Functions** → 17 function görünmeli

## Adım 4: Seed Data Ekle

1. SQL Editor'da **yeni bir query** aç
2. `supabase/seed.sql` dosyasının **TÜM İÇERİĞİNİ** kopyala
3. SQL Editor'a yapıştır
4. **"Run"** ile çalıştır
5. ✅ Başarılı mesajı gelene kadar bekle

**KONTROL:**
- Table Editor → **users** → 5 kullanıcı görünmeli
- Table Editor → **raw_materials** → 5 hammadde görünmeli
- Table Editor → **finished_products** → 3 ürün görünmeli
- Table Editor → **bom** → 5 BOM kaydı görünmeli

## Adım 5: Realtime Kontrolü

1. **Database** → **Replication** menüsüne git
2. **supabase_realtime** publication'ı seç
3. Şu tablolar listede olmalı:
   - production_plans
   - production_logs
   - stock_movements
   - orders
   - notifications
   - raw_materials
   - semi_finished_products
   - finished_products

## ✅ Setup Tamamlandı!

Artık:
- ✅ 16 tablo oluşturuldu
- ✅ 17 function aktif
- ✅ 23 trigger çalışıyor
- ✅ 3 view kullanıma hazır
- ✅ 5 test kullanıcısı var
- ✅ Örnek stok verileri yüklendi
- ✅ Realtime aktif

## Varsayılan Kullanıcılar

| Email | Şifre | Rol |
|-------|-------|-----|
| admin@thunder.com | 123456 | Yönetici |
| planlama@thunder.com | 123456 | Planlama |
| depo@thunder.com | 123456 | Depo |
| operator1@thunder.com | 123456 | Operatör |
| operator2@thunder.com | 123456 | Operatör |

**NOT:** Tüm şifreler geçici olarak `123456` kullanıyor!

## Sorun Giderme

### Migration Hatası
- Tablolar sırayla mı oluşturuldu? (Foreign key dependencies)
- Sequence önce mi oluşturuldu?
- Function'lar trigger'lardan önce mi?

### Seed Data Hatası
- Migration tamamlandı mı?
- Users tablosu boş mu? (Duplicate error önlemek için)

### Realtime Çalışmıyor
- ALTER PUBLICATION komutları çalıştırıldı mı?
- Tablolar publication'a eklendi mi kontrol et

