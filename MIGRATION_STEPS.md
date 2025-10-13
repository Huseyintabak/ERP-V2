# 🚀 Production Trigger Migration Uygulama Rehberi

## ⚡ Hızlı Özet

Bu migration, production trigger'larını düzeltecek ve sistemin doğru çalışmasını sağlayacak.

## 📝 Adım Adım Uygulama

### 1️⃣ Supabase Dashboard'a Git
```
https://supabase.com
```
- Projenizi açın (thunder-erp-v2)
- Sol menüden **SQL Editor** seçin
- **New Query** butonuna tıklayın

### 2️⃣ Migration SQL'ini Kopyala

**Dosya:** `supabase/fix-production-triggers.sql`

Dosyayı açın ve **TÜM İÇERİĞİNİ** kopyalayın (250 satır).

### 3️⃣ SQL Editor'a Yapıştır ve Çalıştır

1. SQL Editor'da yeni query penceresine yapıştırın
2. **Run** butonuna basın (veya `Ctrl/Cmd + Enter`)
3. ✅ **Success** mesajını bekleyin (~3-5 saniye)

### 4️⃣ Doğrulama Yap

**Dosya:** `supabase/check-after-migration.sql`

Bu dosyanın içeriğini SQL Editor'da çalıştırın ve sonuçları kontrol edin:

**Beklenen Çıktı:**
```sql
status              | stock_movements_ok | notifications_ok | indexes_ok
--------------------|--------------------|------------------|------------
Migration Başarılı! | 1                  | 1                | 2
```

## ✅ Migration Ne Yaptı?

### 1. ✅ consume_materials_on_production() Trigger Düzeltildi
**ÖNCE:** BOM tablosunu kullanıyordu (HATALI)
```sql
FROM bom WHERE finished_product_id = ...
```

**SONRA:** BOM snapshot kullanıyor (DOĞRU)
```sql
FROM production_plan_bom_snapshot WHERE plan_id = ...
```

**Etki:** Artık operatör barkod okuttuğunda, üretim planının **snapshot'ındaki** malzemeler tüketilecek. Bu sayede BOM değişiklikleri devam eden üretimleri etkilemez.

---

### 2. ✅ stock_movements Tablosu Güncellendi
**Yeni Kolon:** `production_log_id UUID`

**Etki:** Her stok hareketi artık hangi production log'dan kaynaklandığını bilecek. Bu sayede:
- Üretim kayıtlarını geri alabiliriz
- Stok hareketlerini production log'lara bağlayabiliriz
- Daha iyi raporlama yapabiliriz

---

### 3. ✅ notifications Tablosu Güncellendi
**Yeni Kolon:** `target_roles TEXT[]`

**Etki:** Bildirimler artık rol bazlı gönderilebilecek:
- Kritik stok bildirimleri → `['planlama', 'yonetici']`
- Operatör bildirimleri → `['operator']`
- Kullanıcı bazlı bildirimler hala `user_id` ile çalışacak

---

### 4. ✅ check_critical_stock() Function Güncellendi
**Önce:** Sadece user_id'ye bildirim gönderiyordu
**Sonra:** target_roles ile rol bazlı bildirim gönderiyor

**Etki:** Hammadde kritik seviyenin altına düştüğünde, **tüm planlama ve yönetici kullanıcıları** otomatik bildirim alacak.

---

### 5. ✅ create_bom_snapshot() Trigger Kontrol Edildi
**Çalışma Mantığı:**
1. Yeni production plan oluşturulur
2. Trigger otomatik tetiklenir
3. İlgili ürünün BOM kayıtları `production_plan_bom_snapshot` tablosuna kopyalanır
4. Snapshot'ta: material_code, material_name, quantity_needed saklanır

**Etki:** BOM değişse bile, devam eden üretimler etkilenmez.

---

## 🔍 Sorun Giderme

### ❌ Hata: "column already exists"
**Neden:** Kolon zaten eklenmiş
**Çözüm:** Normal, migration zaten uygulanmış. `check-after-migration.sql` ile doğrulama yapın.

### ❌ Hata: "permission denied"
**Neden:** Service role yetkisi gerekiyor
**Çözüm:** Supabase Dashboard'da SQL Editor kullanın (otomatik service role yetkisi var)

### ❌ Hata: "trigger already exists"
**Neden:** Trigger zaten oluşturulmuş
**Çözüm:** Normal, `DROP TRIGGER IF EXISTS` komutu bunu handle ediyor.

---

## 🧪 Test Senaryoları

### Test 1: Operatör Barkod Okutma
1. Operatör dashboard'a git
2. Bir production plan'ı kabul et
3. Barkod okut (finished product)
4. **Kontrol:**
   - ✅ finished_products.quantity artmalı
   - ✅ raw_materials/semi_finished_products.quantity azalmalı
   - ✅ stock_movements'e 3 kayıt eklenmeli (1 finished, 2 raw/semi)
   - ✅ stock_movements kayıtlarında `production_log_id` dolu olmalı

### Test 2: Kritik Stok Bildirimi
1. Bir hammaddeyi critical_level'ın altına çek
2. **Kontrol:**
   - ✅ notifications tablosuna kayıt eklenmeli
   - ✅ target_roles: `{planlama,yonetici}` olmalı
   - ✅ Planlama/Yönetici kullanıcıları bildirimi görmeli

### Test 3: Production Plan Oluşturma
1. Yeni sipariş oluştur ve onayla
2. **Kontrol:**
   - ✅ production_plans tablosuna kayıt eklenmeli
   - ✅ production_plan_bom_snapshot'a BOM kayıtları kopyalanmalı
   - ✅ Snapshot'taki quantity_needed = bom.quantity_needed * plan.planned_quantity olmalı

---

## 📊 Migration Etkisi

| Özellik | Önce | Sonra |
|---------|------|-------|
| Malzeme Tüketimi | ❌ Anlık BOM | ✅ BOM Snapshot |
| Stok Takibi | ❌ Kaynak belirsiz | ✅ Production log bağlantılı |
| Bildirimler | ❌ Sadece user_id | ✅ Rol bazlı |
| Kritik Stok Uyarısı | ❌ Manuel | ✅ Otomatik (rol bazlı) |
| Geri Alma | ❌ Zor | ✅ Kolay (production_log_id ile) |

---

## ✅ Başarı Kriterleri

Migration başarılı sayılır eğer:

- [x] `check-after-migration.sql` tüm testlerden geçti
- [x] Operatör barkod okutunca stoklar doğru güncelleniyor
- [x] Kritik stok bildirimleri geldiğinde target_roles dolu
- [x] stock_movements kayıtlarında production_log_id var

---

## 🔄 Geri Alma (Acil Durum)

Eğer bir sorun olursa (ki olmamalı):

```sql
-- 1. Yeni kolonları kaldır
ALTER TABLE stock_movements DROP COLUMN IF EXISTS production_log_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS target_roles;

-- 2. Index'leri sil
DROP INDEX IF EXISTS idx_stock_movements_production_log;
DROP INDEX IF EXISTS idx_notifications_target_roles;

-- 3. Eski function'ları restore et (backup'tan)
-- NOT: Eski versiyonları yoksa bu adım atlanabilir
```

**⚠️ UYARI:** Geri alma işlemi sadece **acil durumlarda** yapılmalıdır. Migration güvenle uygulanabilir.

---

## 🎉 Sonuç

Bu migration uygulandıktan sonra:

✅ Production sistemi **DAHA STABIL** çalışacak
✅ BOM değişiklikleri devam eden üretimleri **ETKİLEMEYECEK**
✅ Stok hareketleri **İZLENEBİLİR** olacak
✅ Bildirimler **ROL BAZLI** çalışacak
✅ Sistem **PRODUCTION READY** olacak

---

**Hazırsınız! Migration'ı uygulayın ve sistemin iyileştiğini görün.** 🚀

