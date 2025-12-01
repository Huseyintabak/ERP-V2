# ⚡ Hızlı Test Başlangıç Rehberi
## AI Agent Sistemini 5 Dakikada Test Et

**Versiyon:** 1.0.0  
**Tarih:** 2025-11-17

---

## 🚀 5 Dakikada Test

### Adım 1: Hazırlık (1 dakika)

```bash
# 1. Server çalışıyor mu?
npm run dev
# http://localhost:3000 açık olmalı

# 2. Login yap
# - Yönetici veya Planlama rolü ile giriş yap
# - Email: admin@thunder.com (veya planlama@thunder.com)
# - Password: admin123 (veya plan123)
```

### Adım 2: AI Dashboard Kontrolü (30 saniye)

```
1. Sidebar → "AI Yönetimi" → "AI Dashboard"
2. Kontrol et:
   ✅ Aktif Agent'lar görünüyor mu? (6 agent olmalı)
   ✅ Konuşma istatistikleri var mı?
   ✅ Son aktiviteler görünüyor mu?
```

### Adım 3: Order Approval Test (2 dakika)

```
1. Sidebar → "Üretim" → "Siparişler"
2. "Yeni Sipariş" butonuna tıkla
3. Sipariş oluştur:
   - Müşteri seç
   - Ürün ekle (1 adet yeterli)
   - Teslim tarihi belirle
   - Kaydet
4. Oluşturduğun siparişi bul
5. "Onayla" butonuna tıkla
6. AI validation çalışacak (5-10 saniye)
```

**Beklenen:**
- ✅ Sipariş onaylandı (stok yeterliyse)
- ✅ Veya hata mesajı (stok yetersizse)

### Adım 4: Konuşmaları Görüntüle (1 dakika)

```
1. Sidebar → "AI Yönetimi" → "Agent Konuşmaları"
2. En son konuşmayı bul (order approval'dan)
3. "Detay" butonuna tıkla
4. Görüntüle:
   ✅ Planning Agent ne dedi?
   ✅ Warehouse Agent ne dedi?
   ✅ Production Agent ne dedi?
   ✅ Zero Error Protocol sonucu nedir?
```

### Adım 5: Developer Agent Test (1 dakika)

```
1. Sidebar → "AI Yönetimi" → "Developer Agent"
2. "Rapor Oluştur" butonuna tıkla
3. Bekle (30-60 saniye)
4. Raporu görüntüle:
   ✅ Bulgular kategorize edilmiş mi?
   ✅ Önceliklendirme yapılmış mı? (P0, P1, P2, P3)
   ✅ Tahmini süre hesaplanmış mı?
```

---

## ✅ Başarı Kriterleri

### Test Başarılı İse:

✅ **Order Approval:**
- AI validation çalıştı
- Agent konuşmaları görüntüleniyor
- Final decision: `approved` veya `rejected`

✅ **Agent Konuşmaları:**
- Konuşma listesi görünüyor
- Detaylar açılıyor
- Agent yanıtları görüntüleniyor

✅ **Developer Agent:**
- Rapor oluşturuldu
- Bulgular kategorize edildi
- Önceliklendirme yapıldı

---

## 🎯 Gerçek Senaryo Testleri

### Senaryo 1: Normal Sipariş Onayı

**Hazırlık:**
- Yeterli stoklu bir ürün seç
- BOM'u kontrol et (malzemeler mevcut)

**Test:**
1. Sipariş oluştur (10 adet)
2. Onayla
3. `/ai-konusmalar` sayfasına git
4. Konuşmayı görüntüle

**Beklenen:**
```
✅ Planning Agent: approve
✅ Warehouse Agent: approve (stok yeterli)
✅ Production Agent: approve (kapasite var)
✅ Final Decision: approved
✅ Sipariş onaylandı
```

---

### Senaryo 2: Yetersiz Stok Senaryosu

**Hazırlık:**
- Stok seviyesi düşük bir ürün seç
- Veya çok yüksek miktarlı sipariş oluştur

**Test:**
1. Sipariş oluştur (10000 adet)
2. Onayla
3. Sonucu kontrol et

**Beklenen:**
```
❌ Warehouse Agent: reject (yetersiz stok)
❌ Final Decision: rejected
❌ Hata mesajı: "Yetersiz stok" veya "Insufficient materials"
```

---

### Senaryo 3: Developer Agent - Performance Analizi

**Test:**
1. `/ai-gelistirme` sayfasına git
2. Focus Area: "Performance" seç
3. "Rapor Oluştur" butonuna tıkla
4. Bekle (30-60 saniye)

**Beklenen:**
```
✅ Developer Agent çalışır
✅ Tüm agent'lara sorar
✅ Performance bulguları toplar
✅ Rapor oluşturulur:
   - Toplam sorun sayısı
   - Kategori bazında bulgular
   - Önceliklendirme (P0, P1, P2, P3)
   - Tahmini süre
```

---

## 🔍 Test Kontrol Noktaları

### 1. AI Dashboard
- [ ] 6 agent görünüyor mu?
- [ ] Konuşma istatistikleri doğru mu?
- [ ] Son aktiviteler görünüyor mu?

### 2. Order Approval
- [ ] AI validation çalışıyor mu?
- [ ] Agent konuşmaları kaydediliyor mu?
- [ ] Final decision doğru mu?

### 3. Agent Konuşmaları
- [ ] Konuşma listesi görünüyor mu?
- [ ] Detaylar açılıyor mu?
- [ ] Agent yanıtları görüntüleniyor mu?

### 4. Developer Agent
- [ ] Rapor oluşturuluyor mu?
- [ ] Bulgular kategorize edilmiş mi?
- [ ] Önceliklendirme yapılmış mı?

---

## 🐛 Hızlı Sorun Giderme

### Problem: "AI Agent validation hatası"

**Çözüm:**
```bash
# .env.local dosyasını kontrol et
OPENAI_API_KEY=sk-...  # Doğru mu?
AGENT_ENABLED=true     # Aktif mi?

# Server'ı yeniden başlat
npm run dev
```

### Problem: "Dashboard verileri yüklenemedi"

**Çözüm:**
```bash
# Browser Console'u aç (F12)
# Hata mesajlarını kontrol et
# Server log'larını kontrol et (terminal)
```

### Problem: "Konuşmalar görünmüyor"

**Çözüm:**
```bash
# 1. Bir işlem yap (order approval, vb.)
# 2. Sayfayı yenile (F5)
# 3. 10 saniye bekle (auto-refresh)
```

---

## 📊 Test Sonuçları

### Başarılı Test Sonucu:

```
✅ AI Dashboard: Çalışıyor
✅ Order Approval AI: Çalışıyor
✅ Agent Konuşmaları: Çalışıyor
✅ Developer Agent: Çalışıyor
✅ Human Approval: Çalışıyor
✅ Cost Tracking: Çalışıyor

🎉 Sistem Production Ready!
```

---

**Son Güncelleme:** 2025-11-17  
**Versiyon:** 1.0.0

