# 🧪 ThunderV2 Testing Guide

## 📋 Test Stratejisi

### Test Kategorileri
1. **Unit Tests** - Bireysel fonksiyonlar
2. **Integration Tests** - API endpoint'leri
3. **E2E Tests** - Kullanıcı senaryoları
4. **Performance Tests** - Yük testleri
5. **Security Tests** - Güvenlik testleri

## 🔧 Test Environment Setup

### Gereksinimler
```bash
# Test dependencies
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D supertest
```

### Environment Variables
```env
# .env.test
NEXT_PUBLIC_SUPABASE_URL=your-test-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
JWT_SECRET=test-jwt-secret-key
```

## 🧪 Manual Testing Scenarios

### 1. Authentication Tests

**Test 1.1: Admin Login**
```bash
# Test Steps:
1. http://localhost:3001/login aç
2. Email: admin@thunder.com
3. Password: admin123
4. Login butonuna bas
5. Dashboard'a yönlendirildi mi?
6. Sidebar'da tüm menüler görünüyor mu?
```

**Test 1.2: Role-based Access**
```bash
# Test Steps:
1. Planlama rolü ile login ol
2. Sadece üretim + ana sayfa menüleri görünüyor mu?
3. Stok menüsü görünmüyor mu?
4. Yönetici menüsü görünmüyor mu?
```

**Test 1.3: Operator Login**
```bash
# Test Steps:
1. http://localhost:3001/operator-login aç
2. Operatör seç (dropdown'dan)
3. Şifre gir
4. Operatör dashboard'a yönlendirildi mi?
```

### 2. Stock Management Tests

**Test 2.1: Raw Materials CRUD**
```bash
# Test Steps:
1. Stok → Hammadde tab'ına git
2. "Yeni Hammadde Ekle" butonuna bas
3. Form doldur:
   - Kod: TEST001
   - İsim: Test Hammadde
   - Miktar: 100
   - Birim: kg
   - Birim Fiyat: 50
4. Kaydet
5. Tabloda görünüyor mu?
6. Düzenle butonuna bas, değişiklik yap, kaydet
7. Sil butonuna bas, onayla
```

**Test 2.2: Excel Import/Export**
```bash
# Test Steps:
1. Excel Export butonuna bas
2. Dosya indirildi mi?
3. Excel Import butonuna bas
4. Test dosyası yükle
5. Hatalı satırlar skip edildi mi?
6. Geçerli veriler eklendi mi?
```

**Test 2.3: Critical Stock Notification**
```bash
# Test Steps:
1. Hammadde stok miktarını kritik seviyenin altına düşür
2. Stok hareketi yap (çıkış)
3. Bildirim geldi mi? (planlama, yönetici rolleri)
4. Toast notification göründü mü?
```

### 3. Production Management Tests

**Test 3.1: Order Creation & Approval**
```bash
# Test Steps:
1. Üretim → Sipariş Yönetimi
2. "Yeni Sipariş Ekle" butonuna bas
3. Form doldur:
   - Müşteri: Test Müşteri
   - Ürün: Endüstriyel Kapı Model A
   - Miktar: 5
   - Teslim Tarihi: Bugün + 7 gün
4. Kaydet
5. Sipariş "Beklemede" durumunda mı?
6. "Onayla" butonuna bas
7. Stok yeterli mi kontrol edildi mi?
8. Production plan oluşturuldu mu?
9. BOM snapshot alındı mı?
```

**Test 3.2: BOM Management**
```bash
# Test Steps:
1. Üretim → Ürün Ağacı
2. Ürün seç (dropdown'dan)
3. BOM listesi görünüyor mu?
4. "BOM Ekle" butonuna bas
5. Malzeme seç, miktar gir
6. Kaydet
7. BOM tablosunda görünüyor mu?
8. Excel import/export çalışıyor mu?
```

**Test 3.3: Operator Assignment**
```bash
# Test Steps:
1. Üretim → Planlama
2. Aktif planlar tablosunda plan var mı?
3. "Operatör Ata" butonuna bas
4. Operatör seç (dropdown'dan)
5. Ata
6. Plan operatöre atandı mı?
```

### 4. Operator Panel Tests

**Test 4.1: Production Acceptance**
```bash
# Test Steps:
1. Operatör login ol
2. Atanan siparişler tablosunda plan var mı?
3. "Kabul Et" butonuna bas
4. Aktif üretimler tablosuna geçti mi?
```

**Test 4.2: Barcode Scanning**
```bash
# Test Steps:
1. Aktif üretimler → "Görüntüle" butonuna bas
2. Modal açıldı mı?
3. Barkod input'a focus ol
4. Test barkodu yaz (Enter tuşu)
5. Production log oluşturuldu mu?
6. Stoklar otomatik güncellendi mi?
7. İlerleme bar güncellendi mi?
```

**Test 4.3: Production Completion**
```bash
# Test Steps:
1. Planlanan miktara ulaş
2. "Tamamla" butonuna bas
3. Plan "Tamamlandı" durumuna geçti mi?
4. Operatör aktif üretim sayısı azaldı mı?
```

### 5. Real-time Features Tests

**Test 5.1: Live Updates**
```bash
# Test Steps:
1. İki farklı tarayıcıda farklı rollerle login ol
2. Bir tarayıcıda stok ekle
3. Diğer tarayıcıda otomatik güncellendi mi?
4. Operatör barkod okut
5. Yönetici dashboard'da canlı güncellendi mi?
```

**Test 5.2: Notifications**
```bash
# Test Steps:
1. Kritik stok seviyesine düşür
2. Bildirim geldi mi?
3. Bell icon'da badge görünüyor mu?
4. Bildirimi okundu işaretle
5. Badge sayısı azaldı mı?
```

## 🔍 API Testing

### Postman Collection
```json
{
  "info": {
    "name": "ThunderV2 API Tests",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"admin@thunder.com\",\n  \"password\": \"admin123\"\n}"
            },
            "url": "http://localhost:3001/api/auth/login"
          }
        }
      ]
    }
  ]
}
```

### API Test Scripts
```bash
# Test all endpoints
npm run test:api

# Test specific module
npm run test:api -- --grep "stock"
```

## 📊 Performance Testing

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load test
artillery run load-test.yml
```

**load-test.yml:**
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Login and Dashboard"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "admin@thunder.com"
            password: "admin123"
      - get:
          url: "/api/dashboard/kpis"
```

### Database Performance
```sql
-- Query performance test
EXPLAIN ANALYZE 
SELECT * FROM production_plans 
WHERE status = 'devam_ediyor';

-- Index optimization
CREATE INDEX CONCURRENTLY idx_production_plans_status 
ON production_plans(status);
```

## 🔒 Security Testing

### Authentication Security
```bash
# Test JWT validation
curl -H "Authorization: Bearer invalid-token" \
  http://localhost:3001/api/dashboard/kpis

# Test role-based access
curl -H "Authorization: Bearer operator-token" \
  http://localhost:3001/api/users
```

### SQL Injection Tests
```bash
# Test input validation
curl -X POST http://localhost:3001/api/stock/raw \
  -H "Content-Type: application/json" \
  -d '{"name": "Test\"; DROP TABLE users; --"}'
```

## 🐛 Bug Reporting

### Bug Report Template
```markdown
## Bug Report

**Title:** [Kısa açıklama]

**Description:** [Detaylı açıklama]

**Steps to Reproduce:**
1. [Adım 1]
2. [Adım 2]
3. [Adım 3]

**Expected Behavior:** [Beklenen davranış]

**Actual Behavior:** [Gerçek davranış]

**Environment:**
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- Version: [Sürüm]

**Screenshots:** [Varsa ekran görüntüleri]

**Console Logs:** [Hata mesajları]
```

## ✅ Test Checklist

### Pre-deployment Tests
- [ ] Tüm API endpoint'leri çalışıyor
- [ ] Authentication/Authorization çalışıyor
- [ ] Real-time features çalışıyor
- [ ] Excel import/export çalışıyor
- [ ] Barcode scanning çalışıyor
- [ ] Notifications çalışıyor
- [ ] Role-based access çalışıyor
- [ ] Database triggers çalışıyor
- [ ] Performance kabul edilebilir
- [ ] Security testleri geçti

### Post-deployment Tests
- [ ] Production URL'de çalışıyor
- [ ] SSL sertifikası aktif
- [ ] Database connection stabil
- [ ] Real-time subscriptions çalışıyor
- [ ] Error monitoring aktif
- [ ] Backup stratejisi çalışıyor

## 📈 Test Metrics

### Coverage Targets
- **Unit Tests:** %80+
- **Integration Tests:** %90+
- **E2E Tests:** %70+
- **API Tests:** %95+

### Performance Targets
- **Page Load Time:** < 2 saniye
- **API Response Time:** < 500ms
- **Database Query Time:** < 100ms
- **Real-time Update:** < 1 saniye

---

**🎯 Test tamamlandı!** Sistem production'a hazır.
