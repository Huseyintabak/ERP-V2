# 🧪 FINAL TESTING GUIDE - ThunderV2 ERP System

## 📋 Test Senaryoları

### 🔐 Authentication & Authorization Tests

#### Test 1: Admin Login
```
URL: http://localhost:3000/login
Credentials: admin@thunder.com / 123456
Expected: Dashboard'a yönlendirme
```

#### Test 2: Operator Login
```
URL: http://localhost:3000/operator-login
Credentials: operator1@thunder.com / 123456
Expected: Operator Dashboard'a yönlendirme
```

#### Test 3: Role-based Access Control
```
Admin (yonetici) → Tüm sayfalara erişim
Planlama (planlama) → Üretim modüllerine erişim
Depo (depo) → Stok modüllerine erişim
Operatör (operator) → Sadece operator dashboard
```

### 📦 Stock Management Tests

#### Test 4: Raw Materials CRUD
```
URL: http://localhost:3000/stok/hammaddeler
Actions:
- Yeni hammadde ekle
- Mevcut hammaddeyi düzenle
- Hammadde sil
- Arama ve filtreleme
```

#### Test 5: Semi-Finished Products
```
URL: http://localhost:3000/stok/yari-mamuller
Actions:
- Yarı mamul ekle
- Düzenle/Sil
- Stok seviyesi kontrolü
```

#### Test 6: Finished Products
```
URL: http://localhost:3000/stok/nihai-urunler
Actions:
- Nihai ürün ekle
- Düzenle/Sil
- Stok takibi
```

### 🏭 Production Management Tests

#### Test 7: Multi-Product Order Creation
```
URL: http://localhost:3000/uretim/siparisler
Actions:
- Yeni sipariş oluştur
- Birden fazla ürün ekle
- Operatör ataması
- Sipariş numarası kontrolü
```

#### Test 8: Order Approval Workflow
```
URL: http://localhost:3000/uretim/yonetim
Actions:
- Bekleyen siparişleri gör
- Sipariş onayla
- Üretim planı oluştur
```

#### Test 9: Production Planning
```
URL: http://localhost:3000/uretim/planlar
Actions:
- Üretim planları listesi
- Plan durumu değişiklikleri
- Operatör atama
```

#### Test 10: BOM Management
```
URL: http://localhost:3000/uretim/bom
Actions:
- Ürün seçimi
- BOM ekleme/çıkarma
- Maliyet hesaplama
```

#### Test 11: Operator Management
```
URL: http://localhost:3000/uretim/operatorler
Actions:
- Operatör ekle/düzenle/sil
- KPI kartları
- Performans takibi
```

### 👨‍🔧 Operator Panel Tests

#### Test 12: Operator Dashboard
```
URL: http://localhost:3000/operator-dashboard
Actions:
- Atanan siparişleri gör
- Aktif üretimleri takip et
- Üretim detayları
```

#### Test 13: Barcode Scanning
```
Actions:
- Barkod okutma simülasyonu
- Üretim kaydı
- Geri alma işlemi
```

### 📊 Admin Dashboard Tests

#### Test 14: Analytics & KPIs
```
URL: http://localhost:3000/dashboard/yonetici
Actions:
- KPI kartları kontrolü
- Production trends chart
- Operator performance
- Stock level analysis
```

### 🔔 Notifications & User Management Tests

#### Test 15: Notification System
```
URL: http://localhost:3000/bildirimler
Actions:
- Bildirim listesi
- Okundu/Okunmadı işaretleme
- Bildirim silme
- Filtreleme
```

#### Test 16: User Management
```
URL: http://localhost:3000/kullanicilar
Actions:
- Kullanıcı ekle/düzenle/sil
- Rol atama
- Aktif/Pasif durumu
```

#### Test 17: Settings
```
URL: http://localhost:3000/ayarlar
Actions:
- Sistem ayarları
- Güvenlik ayarları
- Stok ayarları
- Bildirim ayarları
```

### 📈 Reports Tests

#### Test 18: Comprehensive Reports
```
URL: http://localhost:3000/raporlar
Actions:
- Üretim raporları
- Stok raporları
- Operatör raporları
- Sipariş raporları
- Export işlemleri
```

### ⚡ Real-time Features Tests

#### Test 19: Live Updates
```
Actions:
- Birden fazla tarayıcı sekmesi aç
- Bir sekmede veri değiştir
- Diğer sekmelerde otomatik güncelleme kontrolü
```

#### Test 20: Connection Status
```
Actions:
- Header'daki "Canlı" durumu kontrolü
- Bağlantı kopması simülasyonu
- Yeniden bağlanma
```

## 🎯 Critical Test Points

### ✅ Must Work Features
1. **Authentication Flow** - Login/logout
2. **Multi-Product Orders** - 1 sipariş, birden fazla ürün
3. **Real-time Updates** - Canlı veri güncellemeleri
4. **Role-based Access** - Yetki kontrolü
5. **BOM Management** - Malzeme listesi yönetimi
6. **Production Workflow** - Sipariş → Plan → Üretim
7. **Operator Panel** - Barkod okutma sistemi
8. **Admin Dashboard** - Analytics ve raporlar

### ⚠️ Known Issues to Verify
1. **Yönetici Dashboard** - 404 hatası çözüldü mü?
2. **Real-time Status** - Bağlantı durumu gösterimi
3. **Toast Notifications** - Bildirim popup'ları
4. **Form Validations** - Tüm formlar doğru çalışıyor mu?

## 🚀 Performance Tests

### Load Testing
- Multiple users logging in simultaneously
- Large data sets (300+ products)
- Real-time updates under load

### Browser Compatibility
- Chrome
- Firefox
- Safari
- Edge

## 📝 Test Results Template

```
[ ] Test 1: Admin Login
[ ] Test 2: Operator Login
[ ] Test 3: Role-based Access
[ ] Test 4: Raw Materials CRUD
[ ] Test 5: Semi-Finished Products
[ ] Test 6: Finished Products
[ ] Test 7: Multi-Product Orders
[ ] Test 8: Order Approval
[ ] Test 9: Production Planning
[ ] Test 10: BOM Management
[ ] Test 11: Operator Management
[ ] Test 12: Operator Dashboard
[ ] Test 13: Barcode Scanning
[ ] Test 14: Admin Dashboard
[ ] Test 15: Notifications
[ ] Test 16: User Management
[ ] Test 17: Settings
[ ] Test 18: Reports
[ ] Test 19: Real-time Updates
[ ] Test 20: Connection Status

TOTAL: ___/20 PASSED
```

## 🎉 Success Criteria

- **All 20 tests must pass**
- **No critical errors**
- **Real-time features working**
- **All user roles functional**
- **Complete workflow from order to production**

---

**Test Duration:** ~2-3 hours
**Tester:** Development Team
**Environment:** Localhost (http://localhost:3000)
