# Thunder ERP v2 - İş Akışları

## 1. Sipariş → Üretim → Teslim Akışı

```mermaid
flowchart TD
    A[Planlama: Sipariş Ekle] --> B{Sipariş Oluşturuldu<br/>Status: beklemede}
    B --> C[Planlama: Onayla Butonuna Bas]
    C --> D{BOM Kontrolü<br/>Malzeme İhtiyacı Hesapla}
    D --> E{Stok Yeterli mi?}
    E -->|Hayır| F[Toast: Stok Yetersiz<br/>Eksik Malzemeler Listesi]
    F --> G[Sipariş Beklemede Kalır]
    E -->|Evet| H[Production Plan Oluştur<br/>Status: planlandi]
    H --> I[Sipariş Status: uretimde]
    I --> J{Operatör Ataması}
    J -->|Manuel| K[İş Emirleri Ekranında<br/>Planlama Personeli Atar]
    J -->|Otomatik| L[En Az Yüklü Operatör<br/>Otomatik Atanır]
    K --> M[Operatör: Atanan Siparişleri Görür]
    L --> M
    M --> N[Operatör: Kabul Et]
    N --> O[Plan Status: devam_ediyor<br/>Aktif Üretimler Tabına Düşer]
    O --> P[Operatör: Görüntüle<br/>Barkod Okutma Modal]
    P --> Q{Barkod Okut}
    Q --> R[Production Log Kaydet]
    R --> S[Stok Otomatik Güncelle<br/>finished_products.quantity++]
    S --> T[Plan produced_quantity++]
    T --> U{Hedef Tamamlandı mı?}
    U -->|Hayır| Q
    U -->|Evet| V[Operatör: Tamamla Butonu Aktif]
    V --> W[Plan Status: tamamlandi]
    W --> X[Sipariş Status: tamamlandi]
    X --> Y[Tamamlanan Siparişler Tabına Düşer]
```

---

## 2. Stok Giriş/Çıkış Akışı

```mermaid
flowchart TD
    A[Depo Personeli: Stok Ekranı] --> B{İşlem Seç}
    B -->|Manuel Form| C[Hammadde/Yarı/Nihai Form Doldur]
    B -->|Barkod Okutma| D[Barkod Okut + Miktar Gir]
    B -->|Excel Import| E[Excel Dosyası Yükle]
    C --> F[Validasyon: Kod/Barkod Unique]
    D --> F
    E --> G[Validasyon: Format + Unique]
    F --> H[İlgili Tabloya Kaydet]
    G --> H
    H --> I[Stock Movement Kaydet<br/>movement_type: giris]
    I --> J[Real-time: Tüm Dashboard'lar Güncellenir]
    
    K[Stok Çıkış] --> L[Malzeme Seç + Miktar Gir]
    L --> M{Stok Yeterli mi?}
    M -->|Hayır| N[Toast: Yetersiz Stok]
    M -->|Evet| O[Stok Azalt]
    O --> P[Stock Movement Kaydet<br/>movement_type: cikis]
    P --> J
```

---

## 3. Envanter Sayım Akışı

```mermaid
flowchart TD
    A[Depo: Export Butonuna Bas] --> B[Tüm Stok Verilerini Excel İndir]
    B --> C[Fiziksel Sayım Yap<br/>Excel'de Güncel Miktarları Yaz]
    C --> D[Excel'i Import Et]
    D --> E[Sistem: Farkları Hesapla<br/>Excel Quantity - DB Quantity]
    E --> F{Her Satır İçin}
    F --> G{Fark Var mı?}
    G -->|Hayır| H[Atla]
    G -->|Evet| I[Stock Movement Kaydet<br/>movement_type: sayim]
    I --> J[İlgili Tabloda Quantity Güncelle]
    J --> K[Fark Raporu Göster]
    H --> L[Import Tamamlandı]
    K --> L
```

---

## 4. BOM (Ürün Ağacı) Yönetimi

```mermaid
flowchart TD
    A[Planlama: Ürün Ağacı Ekranı] --> B{Giriş Yöntemi}
    B -->|Manuel| C[Nihai Ürün Seç]
    B -->|Excel Import| D[Template Excel İndir]
    C --> E[Drag-Drop Görsel Ağaç]
    E --> F[Hammadde/Yarı Mamul Ekle<br/>Miktar Belirt]
    F --> G[BOM Kaydı Oluştur]
    D --> H[Excel Doldur:<br/>product_code | material_type | material_code | qty]
    H --> I[Excel Import Et]
    I --> J[Validasyon: Ürün/Malzeme Kodları Var mı?]
    J --> K[Toplu BOM Kayıtları Oluştur]
    G --> L[BOM Tamamlandı]
    K --> L
    L --> M[Sipariş Onayında Kullanılır]
```

---

## 5. Operatör Çoklu Üretim Akışı

```mermaid
flowchart TD
    A[Operatör Login] --> B[Atanan Siparişler Listesi]
    B --> C{Sipariş 1: Kabul Et}
    C --> D[Aktif Üretimler Tabına Ekle]
    B --> E{Sipariş 2: Kabul Et}
    E --> D
    D --> F[Aktif Üretimler: 2 Satır]
    F --> G{Sipariş 1 Görüntüle}
    G --> H[Barkod Okutma Modal 1]
    H --> I[Üretim Yap...]
    F --> J{Sipariş 2 Görüntüle}
    J --> K[Barkod Okutma Modal 2]
    K --> L[Üretim Yap...]
    I --> M{Sipariş 1 Tamamlandı}
    M --> N[Plan Status: tamamlandi<br/>Aktif Listeden Kaldır]
    L --> O{Sipariş 2 Devam Ediyor}
    O --> P[Mesai Bitimi: Duraklat]
    P --> Q[Plan Status: duraklatildi<br/>Yarın Kaldığı Yerden Devam]
```

---

## 6. Fiyat Güncelleme & Yıllık Ortalama

```mermaid
flowchart TD
    A[Depo: Hammadde Düzenle] --> B[Birim Fiyat Güncelle<br/>50 TL → 55 TL]
    B --> C[Database Trigger Tetiklenir]
    C --> D[price_history Tablosuna Kayıt<br/>material_id, price: 55, effective_date: bugün]
    D --> E[raw_materials.unit_price Güncellenir]
    E --> F[Dashboard: Yıllık Ortalama Fiyat Göster<br/>SELECT AVG(price) FROM price_history<br/>WHERE effective_date >= CURRENT_DATE - 1 year]
    F --> G[Ortalama: 52.5 TL Gösterilir]
```

---

## 7. Authentication & RBAC

```mermaid
flowchart TD
    A[Kullanıcı: /login] --> B[Email + Şifre Gir]
    B --> C[POST /api/auth/login]
    C --> D{Bcrypt Şifre Kontrolü}
    D -->|Yanlış| E[401 Error: Invalid Credentials]
    D -->|Doğru| F[JWT Oluştur<br/>Payload: userId, role, exp: 7 days]
    F --> G[httpOnly Cookie Set:<br/>thunder_token=jwt]
    G --> H[Client: Redirect Based on Role]
    H --> I{Role?}
    I -->|yonetici| J[/dashboard Ana Sayfa]
    I -->|planlama| K[/dashboard/uretim]
    I -->|depo| L[/dashboard/stok]
    I -->|operator| M[/operator-dashboard]
    
    N[Her Sayfa İsteği] --> O[Middleware.ts: JWT Verify]
    O --> P{JWT Valid?}
    P -->|Hayır| Q[Redirect /login]
    P -->|Evet| R{Role Check}
    R -->|Unauthorized| S[403 Forbidden Page]
    R -->|Authorized| T[Sayfa Render]
```

---

## 8. Real-time Dashboard Güncellemesi

```mermaid
flowchart TD
    A[Operatör: Barkod Okut] --> B[POST /api/production/logs]
    B --> C[Database: production_logs INSERT]
    C --> D[Trigger: Stock & Plan Güncelle]
    D --> E[Supabase Realtime: Broadcast Event<br/>Table: production_logs, Event: INSERT]
    E --> F[Yönetici Dashboard:<br/>Supabase Channel Dinliyor]
    F --> G[Zustand Store Güncelle<br/>production_store.addLog]
    G --> H[React Re-render<br/>KPI Kartları Güncellenir]
    E --> I[Planlama Dashboard:<br/>Üretim Planları Dinliyor]
    I --> J[Plan produced_quantity Güncellenir<br/>İlerleme Bar Animasyonu]
```

---

## State Machine Diyagramları

### Sipariş Status

```mermaid
stateDiagram-v2
    [*] --> beklemede: Sipariş Oluşturuldu
    beklemede --> uretimde: Onaylandı (Stok Yeterli)
    beklemede --> beklemede: Onaylandı (Stok Yetersiz - Hata)
    uretimde --> tamamlandi: Üretim Tamamlandı
    tamamlandi --> [*]
```

### Production Plan Status

```mermaid
stateDiagram-v2
    [*] --> planlandi: Plan Oluşturuldu
    planlandi --> devam_ediyor: Operatör Kabul Etti
    planlandi --> iptal_edildi: İptal (Rezervasyon İade)
    devam_ediyor --> duraklatildi: Mesai Bitti / Duraklat
    duraklatildi --> devam_ediyor: Devam Et
    devam_ediyor --> tamamlandi: Hedef Tamamlandı
    devam_ediyor --> iptal_edildi: İptal (Kısmi Üretim Var)
    duraklatildi --> iptal_edildi: İptal
    tamamlandi --> [*]
    iptal_edildi --> [*]
```

---

## 9. Hammadde/Yarı Mamul Otomatik Tüketim Akışı

```mermaid
flowchart TD
    A[Operatör: Barkod Okut] --> B[Nihai Ürün Barkodu Tanındı]
    B --> C[Production Log Kaydet]
    C --> D[Finished Product Stock Artır]
    D --> E[BOM Snapshot Tablosunu Oku]
    E --> F{Her Malzeme İçin}
    F --> G[Malzeme Tipi: raw?]
    G -->|Evet| H[raw_materials stok azalt<br/>quantity -= bom.quantity_needed * produced_qty]
    G -->|Hayır| I[semi_finished_products stok azalt]
    H --> J[Stock Movement Kaydet<br/>movement_type: uretim, quantity: negatif]
    I --> J
    J --> K[Real-time: Tüm Dashboard Güncelle]
    K --> L{Stok <= Critical Level?}
    L -->|Evet| M[Kritik Seviye Bildirimi Oluştur]
    L -->|Hayır| N[İşlem Tamamlandı]
```

---

## 10. Hatalı Üretim Kaydı Geri Alma Akışı

```mermaid
flowchart TD
    A[Operatör/Admin: Aktif Üretim Ekranı] --> B[Hatalı Kayıt Seç]
    B --> C{Kullanıcı Rolü?}
    C -->|Operatör| D[Sadece Son 5dk İçindeki Kayıtlar]
    C -->|Admin/Planlama| E[Tüm Kayıtlar Erişilebilir]
    D --> F[Geri Al Butonu]
    E --> F
    F --> G[Onay Dialog:<br/>Bu kayıt silinecek ve stoklar düzeltilecek]
    G --> H{Onayla}
    H -->|Hayır| I[İptal]
    H -->|Evet| J[Production Log SİL]
    J --> K[Finished Product Stok Azalt]
    K --> L[BOM Snapshot'a Göre Hammadde/Yarı Mamul Geri Ekle]
    L --> M[Tersine Stock Movement Kaydet<br/>description: Geri alma - Log ID]
    M --> N[Plan produced_quantity Düşür]
    N --> O[Toast: Kayıt Başarıyla Geri Alındı]
```

---

## 11. Sipariş Düzenleme/İptal Akışı (Durum Bazlı)

```mermaid
flowchart TD
    A[Kullanıcı: Sipariş Listesi] --> B[Sipariş Seç + Düzenle/İptal]
    B --> C{Sipariş Status?}
    
    C -->|beklemede| D[Düzenle/İptal Butonu Aktif<br/>Planlama Yetkisi]
    D --> E{İşlem?}
    E -->|Düzenle| F[Miktar, Tarih, Öncelik Değiştir]
    E -->|İptal| G[Sipariş SİL]
    
    C -->|uretimde| H{Production Plan Status?}
    H -->|planlandi| I[Planlama: Düzenle İzni Var]
    I --> J[Plan SİL + Rezervasyon İptal]
    J --> K[reserved_quantity Düşür]
    K --> L[Sipariş Düzenle]
    L --> M[Yeni Plan Oluştur + Stok Kontrolü]
    
    H -->|devam_ediyor/duraklatildi| N{Kullanıcı Admin mi?}
    N -->|Hayır| O[Toast: Sadece Admin Düzenleyebilir]
    N -->|Evet| P[Kısmi Üretim Var Uyarısı<br/>Üretilen: X / Planlanan: Y]
    P --> Q{Onayla}
    Q -->|Evet| R[Üretilen miktar stokta kalır]
    R --> S[Rezervasyon İptal: Kalan malzemeler serbest]
    S --> T[Plan Status: iptal_edildi]
    T --> U[Sipariş Status: beklemede]
    
    C -->|tamamlandi| V[Düzenle/İptal Butonu DİSABLED]
    V --> W[Toast: Tamamlanan Sipariş Düzenlenemez]
```

---

## 12. Malzeme Soft Rezervasyon Mekanizması

```mermaid
flowchart TD
    A[Sipariş Onayla Butonu] --> B[BOM Snapshot Oluştur<br/>Mevcut BOM Kayıtlarını Kopyala]
    B --> C[Gerekli Malzemeleri Hesapla<br/>qty * bom.quantity_needed]
    C --> D{Her Malzeme İçin}
    D --> E[Available = quantity - reserved_quantity]
    E --> F{Available >= Needed?}
    F -->|Hayır| G[Eksik Malzeme Listesi Oluştur]
    F -->|Evet| H[reserved_quantity += needed]
    H --> I[material_reservations Tablosuna Kaydet<br/>order_id, material_type, material_id, qty]
    I --> J[Production Plan Oluştur<br/>Status: planlandi]
    J --> K[Sipariş Status: uretimde]
    
    G --> L[Toast: Stok Yetersiz<br/>Eksik Malzemeler Göster]
    L --> M[Sipariş Beklemede Kalır]
    
    N[Plan Tamamlandı/İptal] --> O[Reservation Kayıtlarını Bul<br/>WHERE plan.order_id]
    O --> P{Her Rezervasyon İçin}
    P --> Q[reserved_quantity -= reservation.qty]
    Q --> R[Reservation Kaydını SİL]
    R --> S[Real-time: Stok Dashboard Güncelle]
```

---

## 13. Üretim Planı İptal Akışı

```mermaid
flowchart TD
    A[Admin/Planlama: Plan İptal] --> B{Plan Status?}
    B -->|planlandi| C[Rezervasyonları İptal Et<br/>reserved_quantity Düşür]
    C --> D[Plan Status: iptal_edildi]
    D --> E[Sipariş Status: beklemede]
    
    B -->|devam_ediyor/duraklatildi| F{produced_quantity > 0?}
    F -->|Hayır| C
    F -->|Evet| G[Onay Dialog:<br/>Kısmi üretim var!<br/>Üretilen: X adet<br/>Üretilen ürünler stokta kalacak]
    G --> H{Onayla}
    H -->|Hayır| I[İptal]
    H -->|Evet| J[NOT: Tüketilen hammadde GERİ ALINMAZ<br/>Finished product stokta kalır]
    J --> K[Rezervasyon İPTAL<br/>Kalan malzemeler için reserved_quantity düşür]
    K --> L[Plan Status: iptal_edildi]
    L --> M[Sipariş Kalan Miktar Hesapla<br/>order.quantity - produced_quantity]
    M --> N[Sipariş Status: beklemede<br/>Miktar Güncellendi]
    
    B -->|tamamlandi| O[İptal Butonu DİSABLED]
    O --> P[Toast: Tamamlanan Plan İptal Edilemez]
```

---

## 14. Stok Kritik Seviye Uyarı Sistemi

```mermaid
flowchart TD
    A[Stok Değişikliği<br/>Üretim/Giriş/Çıkış/Rezervasyon] --> B{quantity <= critical_level?}
    B -->|Hayır| C[Normal İşlem Devam]
    B -->|Evet| D[Notification Kayıt Oluştur]
    D --> E[type: critical_stock<br/>severity: high]
    E --> F[Planlama Rolündeki Tüm Kullanıcılara]
    F --> G[Dashboard: Kırmızı Badge + Bell Icon]
    G --> H[Bildirim İçeriği:<br/>Malzeme: [Kod - Ad]<br/>Mevcut: X<br/>Kritik Seviye: Y<br/>Fark: Z]
    
    I[Planlama: Bildirim Listesi Aç] --> J{Bildirim Seç}
    J --> K[Detayları Görüntüle]
    K --> L{İşlem?}
    L -->|Stok Gir| M[Stok Giriş Ekranına Yönlendir]
    L -->|Okundu İşaretle| N[is_read: TRUE]
    
    M --> O[Manuel Stok Girişi Yap]
    O --> P{quantity > critical_level?}
    P -->|Evet| Q[İlgili Bildirimi Otomatik Kapat<br/>is_read: TRUE]
    P -->|Hayır| R[Bildirim Aktif Kalır]
```

---

## 15. Kullanıcı Yönetimi Akışı

```mermaid
flowchart TD
    A[Admin: Kullanıcılar Sayfası] --> B{Yeni Kullanıcı Ekle}
    B --> C[Form: Email, Ad, Rol, Şifre]
    C --> D[Validasyon: Email Unique, Rol Geçerli]
    D --> E[Kullanıcı Oluştur + Şifre Hash'le]
    E --> F[Email Bildirimi Gönder]
    
    G[Kullanıcı Düzenle] --> H[Mevcut Bilgileri Yükle]
    H --> I[Form Düzenle + Kaydet]
    
    J[Şifre Sıfırlama] --> K[Geçici Şifre Oluştur]
    K --> L[Hash'le + Güncelle]
    L --> M[Email ile Gönder]
    
    N[Kullanıcı Deaktive] --> O[is_active: FALSE]
    O --> P[Mevcut Session'ları Sonlandır]
    
    Q[Kullanıcı Aktivasyon] --> R[is_active: TRUE]
    R --> S[Kullanıcı Tekrar Giriş Yapabilir]
```

---

## 16. Sistem Ayarları Yönetimi Akışı

```mermaid
flowchart TD
    A[Admin: Ayarlar Sayfası] --> B{Ayar Kategorisi}
    B -->|Genel| C[Şirket Bilgileri, Logo]
    B -->|Stok| D[Kritik Seviye Varsayılanları]
    B -->|Üretim| E[Varsayılan Operatör Atama]
    B -->|Bildirim| F[Email/SMS Ayarları]
    C --> G[Ayar Kaydet]
    D --> G
    E --> G
    F --> G
    G --> H[Real-time: Tüm Kullanıcılara Broadcast]
    
    I[Ayar Değişikliği] --> J[settings Tablosunu Güncelle]
    J --> K[Cache Temizle]
    K --> L[Tüm Aktif Session'larda Yenile]
```

---

## 17. Raporlama & Analytics Akışı

```mermaid
flowchart TD
    A[Kullanıcı: Raporlar Sayfası] --> B{Rapor Tipi}
    B -->|Üretim| C[Tarih Aralığı + Operatör Filtresi]
    B -->|Stok| D[Malzeme Tipi + Seviye Filtresi]
    B -->|Sipariş| E[Durum + Müşteri Filtresi]
    C --> F[SQL Query Oluştur]
    D --> F
    E --> F
    F --> G[Veri Çek + İşle]
    G --> H[Chart/Table Render]
    H --> I{Export?}
    I -->|Excel| J[Excel Dosyası İndir]
    I -->|PDF| K[PDF Rapor Oluştur]
    
    L[Real-time Dashboard] --> M[Recharts ile Canlı Grafik]
    M --> N[Supabase Realtime ile Güncelleme]
    N --> O[KPI Kartları Animasyon]
```

---

## 18. İşlem Geçmişi & Audit Log Akışı

```mermaid
flowchart TD
    A[Kullanıcı: İşlem Geçmişi] --> B{Filtre Seçenekleri}
    B --> C[Tarih Aralığı]
    B --> D[Kullanıcı]
    B --> E[İşlem Tipi]
    C --> F[audit_logs Tablosunu Query Et]
    D --> F
    E --> F
    F --> G[Sayfalama ile Göster]
    G --> H{Detay Görüntüle?}
    H --> I[İşlem Detayları Modal]
    I --> J[JSON Payload Göster]
    
    K[Her İşlem] --> L[audit_logs INSERT]
    L --> M[user_id, action, table_name, old_values, new_values]
    M --> N[Real-time: Audit Dashboard Güncelle]
```

---

## 19. Bildirim Yönetimi Akışı

```mermaid
flowchart TD
    A[Kullanıcı: Bildirimler Sayfası] --> B[Bildirim Listesi]
    B --> C{Bildirim Seç}
    C --> D[Detayları Görüntüle]
    D --> E{İşlem?}
    E -->|Okundu İşaretle| F[is_read: TRUE]
    E -->|İlgili Sayfaya Git| G[URL'e Redirect]
    E -->|Tümünü Okundu İşaretle| H[Toplu Güncelleme]
    
    I[Yeni Bildirim Oluştu] --> J[Real-time Push]
    J --> K[Dashboard'da Badge Artır]
    K --> L[Bildirim Bell Icon'u Animasyon]
    
    M[Otomatik Bildirim] --> N{Kritik Seviye?}
    N -->|Evet| O[Planlama Rolüne Gönder]
    N -->|Hayır| P[İlgili Kullanıcılara Gönder]
```

---

## 20. Excel Import/Export Hata Yönetimi Akışı

```mermaid
flowchart TD
    A[Kullanıcı: Excel Import] --> B[Dosya Yükle]
    B --> C[Format Validasyonu]
    C --> D{Geçerli mi?}
    D -->|Hayır| E[Hata: Format Uyumsuz]
    D -->|Evet| F[Satır Satır İşle]
    F --> G{Her Satır}
    G --> H{Validasyon Geçti mi?}
    H -->|Hayır| I[Hatalı Satırları Listele]
    H -->|Evet| J[Veritabanına Kaydet]
    I --> K[Kullanıcıya Hata Raporu Göster]
    K --> L{Devam Et?}
    L -->|Evet| J
    L -->|Hayır| M[İşlemi İptal Et]
    
    N[Excel Export] --> O[Template Oluştur]
    O --> P[Veri Doldur]
    P --> Q[Dosya İndir]
```

---

## 21. Sistem Bakım & Temizlik Akışı

```mermaid
flowchart TD
    A[Admin: Sistem Bakımı] --> B{Bakım Tipi}
    B -->|Veri Temizliği| C[Eski Logları Sil]
    B -->|Performans| D[Index Optimizasyonu]
    B -->|Yedekleme| E[DB Backup Oluştur]
    C --> F[30+ günlük audit_logs sil]
    D --> G[VACUUM ANALYZE çalıştır]
    E --> H[PostgreSQL dump al]
    F --> I[Bakım Tamamlandı]
    G --> I
    H --> I
    
    J[Otomatik Bakım] --> K[Cron Job: Her Gece 02:00]
    K --> L[Log Temizliği + Optimizasyon]
    L --> M[Bakım Raporu Email Gönder]
```

---

## 22. Multi-tenant & Şirket Yönetimi Akışı (Gelecek için)

```mermaid
flowchart TD
    A[Super Admin: Şirket Yönetimi] --> B{Yeni Şirket Ekle}
    B --> C[Şirket Bilgileri + Database Schema]
    C --> D[Varsayılan Admin Kullanıcı Oluştur]
    D --> E[Şirket'e Özel Ayarlar]
    E --> F[Şirket Aktifleştir]
    
    G[Şirket Deaktive] --> H[Tüm Kullanıcıları Deaktive Et]
    H --> I[Veri Arşivle]
    I --> J[Şirket Pasif Duruma Geç]
    
    K[Şirket Düzenle] --> L[Şirket Bilgileri Güncelle]
    L --> M[Logo + Tema Ayarları]
    M --> N[Şirket Ayarlarını Kaydet]
```

