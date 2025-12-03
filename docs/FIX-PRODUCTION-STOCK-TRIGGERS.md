# Production Stock Triggers Düzeltme Rehberi

## 🎯 Amaç

Production log oluşturulduğunda **otomatik olarak**:
1. Nihai ürün stokunu artırmak
2. Malzeme stoklarını düşürmek (BOM snapshot'tan)
3. Tüm stok hareketlerini kaydetmek
4. Hataları yakalamak ve loglamak

## 🔧 Kurulum

### 1. Migration Dosyasını Çalıştır

Supabase Dashboard'da SQL Editor'ü açın ve `supabase/FIX-PRODUCTION-STOCK-TRIGGERS-ROBUST.sql` dosyasını çalıştırın.

Bu dosya:
- Mevcut trigger'ları temizler
- Yeni, hata yakalayan trigger'ları oluşturur
- Trigger'ların aktif olduğunu doğrular

### 2. Trigger'ları Kontrol Et

```sql
-- Trigger'ların varlığını kontrol et
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'production_logs'
  AND trigger_name IN (
    'trigger_update_stock_on_production',
    'trigger_consume_materials_on_production'
  );
```

### 3. Test Et

```sql
-- Test production log oluştur
INSERT INTO production_logs (plan_id, operator_id, barcode_scanned, quantity_produced)
VALUES (
  'PLAN_ID_BURAYA',
  'OPERATOR_ID_BURAYA',
  'BARCODE_BURAYA',
  1
);

-- Stok hareketlerini kontrol et
SELECT * FROM stock_movements 
WHERE description LIKE '%Plan #PLAN_ID_BURAYA%'
ORDER BY created_at DESC;
```

## 🛡️ Özellikler

### Hata Yakalama

- Her trigger kendi hata yakalama bloğuna sahip
- Bir malzeme için hata olsa bile diğer malzemeler işlenir
- Hatalar WARNING olarak loglanır (production_log kaydı engellenmez)

### Güvenlik

- NULL değerler kontrol edilir
- Negatif stoklar engellenir (GREATEST(0, ...))
- Plan ve malzeme varlığı doğrulanır

### Performans

- Tek sorguda tüm BOM snapshot'ı alınır
- Her malzeme için ayrı UPDATE yerine direkt güncelleme yapılır

## 📊 API Değişiklikleri

`app/api/production/log/route.ts` dosyasına trigger doğrulama eklendi:

- Production log insert edildikten sonra 500ms beklenir
- Nihai ürün stok hareketi kontrol edilir
- Malzeme tüketim hareketleri kontrol edilir
- Trigger çalışmamışsa uyarı loglanır

## ✅ Doğrulama

Trigger'ların çalışıp çalışmadığını kontrol etmek için:

```bash
node scripts/verify-triggers-active.mjs
```

Veya manuel olarak:

```sql
-- Son production log için stok hareketlerini kontrol et
SELECT 
  sm.*,
  pp.product_id,
  fp.name as product_name
FROM production_logs pl
JOIN production_plans pp ON pl.plan_id = pp.id
JOIN finished_products fp ON pp.product_id = fp.id
LEFT JOIN stock_movements sm ON (
  sm.material_type = 'finished' 
  AND sm.material_id = pp.product_id
  AND sm.description LIKE '%Plan #' || pl.plan_id || '%'
)
WHERE pl.id = (SELECT MAX(id) FROM production_logs)
ORDER BY sm.created_at DESC;
```

## 🐛 Sorun Giderme

### Trigger çalışmıyor

1. Trigger'ların aktif olduğundan emin olun
2. Function'ların doğru tanımlandığını kontrol edin
3. PostgreSQL loglarını kontrol edin (WARNING mesajları)

### Stok hareketleri oluşmuyor

1. BOM snapshot'ın mevcut olduğundan emin olun
2. Plan'ın geçerli olduğundan emin olun
3. Operator ID'nin users tablosunda olduğundan emin olun

### Hata mesajları

Trigger'lar hata durumunda WARNING verir ama production_log kaydını engellemez. 
WARNING'leri görmek için PostgreSQL loglarını kontrol edin.

## 📝 Notlar

- Trigger'lar **AFTER INSERT** olarak çalışır
- Transaction içinde çalışırlar (rollback durumunda tüm işlemler geri alınır)
- Trigger'lar sırayla çalışır:
  1. `trigger_update_stock_on_production` (nihai ürün)
  2. `trigger_consume_materials_on_production` (malzemeler)

