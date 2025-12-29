# 🔧 REZERVASYON SİSTEMİ DÜZELTME MİGRATİON

**Tarih:** 29 Ocak 2025  
**Migration Dosyası:** `20250129_fix_reservation_stock_flow.sql`

## 📋 ÖZET

Bu migration, stok rezervasyon sistemini doğru stok yönetimi prensiplerine göre düzeltir.

### ❌ ESKİ SİSTEM (YANLIŞ)
1. **Rezervasyon yapıldığında:**
   - `quantity` düşüyordu ❌
   - `reserved_quantity` artıyordu ✅
   - Stok fiziksel olarak çıkış yapılmış gibi görünüyordu

2. **Üretim yapıldığında:**
   - `quantity` değişmiyordu (zaten düşmüştü)
   - Sadece `reserved_quantity` düşüyordu
   - **SORUN:** Stok rezervasyon aşamasında çıkmış oluyordu

### ✅ YENİ SİSTEM (DOĞRU)
1. **Rezervasyon yapıldığında:**
   - `quantity` aynı kalır ✅ (fiziksel stok hala depoda)
   - `reserved_quantity` artar ✅ (rezerve edilmiş olarak işaretlenir)
   - Kullanılabilir stok = `quantity - reserved_quantity`

2. **Üretim yapıldığında:**
   - `quantity` düşer ✅ (fiziksel stok tüketilir)
   - `reserved_quantity` düşer ✅ (rezervasyon serbest bırakılır)
   - `consumed_quantity` artar ✅ (tüketim kaydedilir)

## 🎯 DEĞİŞTİRİLEN FONKSİYONLAR

### 1. `create_material_reservations(p_order_id, p_product_id, p_quantity)`
- **Amaç:** Nihai ürün üretim planları için malzeme rezervasyonu
- **Değişiklik:** Rezervasyon yapılırken artık `quantity` düşürülmüyor

### 2. `create_semi_order_reservations(p_order_id)`
- **Amaç:** Yarı mamul üretim siparişleri için malzeme rezervasyonu
- **Değişiklik:** Rezervasyon yapılırken artık `quantity` düşürülmüyor

### 3. `consume_materials_on_production()`
- **Amaç:** Nihai ürün üretiminde malzeme tüketimi
- **Değişiklik:** Artık HEM `quantity` HEM `reserved_quantity` düşürülüyor

### 4. `consume_materials_on_semi_production()`
- **Amaç:** Yarı mamul üretiminde malzeme tüketimi
- **Değişiklik:** Artık HEM `quantity` HEM `reserved_quantity` düşürülüyor

### 5. `release_reservations_on_plan_cancel()`
- **Amaç:** Plan iptalinde rezervasyonları serbest bırakma
- **Değişiklik:** Artık sadece `reserved_quantity` azaltılıyor (quantity değişmiyor)

## 📊 STOK HAREKETLERİ

### Yeni Movement Tipleri
- `rezervasyon`: Malzeme rezerve edildiğinde
- `rezervasyon_iptali`: Rezervasyon iptal edildiğinde veya plan iptal olduğunda
- `uretim`: Üretim yapıldığında (malzeme tüketimi)

### Eski Sistem vs Yeni Sistem

| İşlem | Eski Sistem | Yeni Sistem |
|-------|-------------|-------------|
| Rezervasyon | `movement_type: 'cikis'` | `movement_type: 'rezervasyon'` |
| Rezervasyon İptali | `movement_type: 'giris'` | `movement_type: 'rezervasyon_iptali'` |
| Üretim | Stok hareketi yok (zaten düşmüş) | `movement_type: 'uretim'` |

## 🔄 MEVCUTVERİ DÜZELTMESİ

Migration, aktif rezervasyonlar için otomatik stok düzeltmesi yapar:

1. Tüm aktif (`status = 'active'`) rezervasyonları bulur
2. Her malzeme için `reserved_quantity - consumed_quantity` değerini hesaplar
3. Bu değeri ilgili malzemenin `quantity`'sine **EKLER**
   - Çünkü eski sistemde rezervasyon yapılırken quantity düşürülmüştü
   - Yeni sistemde quantity düşürülmemeli, bu yüzden geri ekliyoruz

### Örnek:
```sql
-- ÖNCESİ (Eski Sistem):
-- Hammadde A: quantity = 100, reserved_quantity = 30
-- Toplam stok = 130 (100 serbest + 30 rezerve)
-- Kullanılabilir = 100 - 30 = 70 ❌ YANLIŞ!

-- SONRASI (Yeni Sistem):
-- Migration çalıştıktan sonra:
-- Hammadde A: quantity = 130, reserved_quantity = 30
-- Toplam stok = 130
-- Kullanılabilir = 130 - 30 = 100 ✅ DOĞRU!
```

## 🚀 MİGRATİON NASIL UYGULANIR?

### Seçenek 1: Supabase Dashboard (Önerilen)
1. [Supabase Dashboard](https://app.supabase.com) > Projenizi seçin
2. **SQL Editor** sekmesine gidin
3. `20250129_fix_reservation_stock_flow.sql` dosyasının içeriğini kopyalayın
4. SQL Editor'a yapıştırın
5. **Run** butonuna tıklayın
6. Çıktıları kontrol edin (✅ başarılı mesajları göreceksiniz)

### Seçenek 2: Supabase CLI (Gelişmiş)
```bash
# Migration dosyasını çalıştır
supabase db push

# Veya sadece bu migration'ı uygula
psql $DATABASE_URL -f supabase/migrations/20250129_fix_reservation_stock_flow.sql
```

## ✅ DOĞRULAMA

Migration başarılı olduktan sonra aşağıdaki kontrolleri yapın:

### 1. Stok Kontrolü
```sql
-- Hammadde stok durumunu kontrol et
SELECT 
  code,
  name,
  quantity AS toplam_stok,
  reserved_quantity AS rezerve,
  quantity - reserved_quantity AS kullanilabilir,
  CASE 
    WHEN quantity < reserved_quantity THEN '❌ HATA: Rezerve > Toplam'
    ELSE '✅ OK'
  END AS durum
FROM raw_materials
ORDER BY code;
```

### 2. Rezervasyon Kontrolü
```sql
-- Aktif rezervasyonları kontrol et
SELECT 
  mr.order_type,
  mr.material_type,
  CASE 
    WHEN mr.material_type = 'raw' THEN rm.name
    ELSE sfp.name
  END AS malzeme,
  mr.reserved_quantity,
  mr.consumed_quantity,
  mr.reserved_quantity - COALESCE(mr.consumed_quantity, 0) AS bekleyen,
  mr.status
FROM material_reservations mr
LEFT JOIN raw_materials rm ON mr.material_type = 'raw' AND mr.material_id = rm.id
LEFT JOIN semi_finished_products sfp ON mr.material_type = 'semi' AND mr.material_id = sfp.id
WHERE mr.status = 'active'
ORDER BY mr.created_at DESC;
```

### 3. Stok Hareketleri
```sql
-- Son stok hareketlerini kontrol et
SELECT 
  movement_type,
  material_type,
  quantity,
  description,
  created_at
FROM stock_movements
ORDER BY created_at DESC
LIMIT 20;
```

## ⚠️ DİKKAT EDİLMESİ GEREKENLER

1. **Yedek Alın:** Migration öncesi mutlaka veritabanı yedeği alın
2. **Test Ortamında Deneyin:** Önce test/staging ortamında uygulayın
3. **Aktif Üretim:** Migration çalışırken aktif üretim olmamalı (kısa süre duraklatın)
4. **Logları İnceleyin:** Migration sonrası RAISE NOTICE mesajlarını kontrol edin

## 🐛 SORUN GİDERME

### Hata: "quantity cannot be negative"
- **Sebep:** Bazı malzemelerde negatif stok var
- **Çözüm:** Migration öncesi negatif stokları düzeltin:
```sql
UPDATE raw_materials SET quantity = 0 WHERE quantity < 0;
UPDATE semi_finished_products SET quantity = 0 WHERE quantity < 0;
```

### Hata: "reserved_quantity > quantity"
- **Sebep:** Migration sonrası rezerve miktar toplam stoktan fazla
- **Çözüm:** Bu normaldir çünkü stoklar düzeltiliyor. Migration'ın tamamlanmasını bekleyin.

## 📞 DESTEK

Sorun yaşarsanız:
1. Migration loglarını kontrol edin
2. Yukarıdaki doğrulama sorgularını çalıştırın
3. Hata mesajlarını kaydedin
4. Geliştirici ekip ile iletişime geçin

---

**SON GÜNCELLEME:** 29 Ocak 2025  
**VERSİYON:** 1.0  
**DURUM:** ✅ Üretime Hazır