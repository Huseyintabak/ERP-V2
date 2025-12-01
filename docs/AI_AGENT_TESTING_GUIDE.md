# 🧪 AI Agent Sistem Test Rehberi
## Gerçek Hayat Senaryoları ile Test Etme

**Versiyon:** 1.0.0  
**Tarih:** 2025-11-17  
**Durum:** Production Ready

---

## 📋 İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Test Senaryoları](#test-senaryoları)
3. [Adım Adım Test Rehberi](#adım-adım-test-rehberi)
4. [Beklenen Sonuçlar](#beklenen-sonuçlar)
5. [Sorun Giderme](#sorun-giderme)

---

## 🚀 Hızlı Başlangıç

### Ön Gereksinimler

✅ **Environment Variables Kontrolü:**
```bash
# .env.local dosyasında olmalı:
OPENAI_API_KEY=sk-...                    # ✅ Gerekli
AGENT_ENABLED=true                      # ✅ AI Agent'ları aktif et
AGENT_LOGGING_ENABLED=true              # ✅ Logging aktif
AGENT_DAILY_COST_LIMIT=50               # ✅ Günlük limit
AGENT_WEEKLY_COST_LIMIT=300             # ✅ Haftalık limit
```

✅ **Server Çalışıyor mu?**
```bash
npm run dev
# http://localhost:3000 açık olmalı
```

✅ **Login Yapıldı mı?**
- Yönetici veya Planlama rolü ile giriş yapın
- AI Yönetimi menüsü görünüyor olmalı

---

## 🎯 Test Senaryoları

### Senaryo 1: Order Approval - AI Validation Test

**Amaç:** Planning Agent'ın sipariş onayını doğrulamasını test et

**Adımlar:**

1. **Sipariş Oluştur:**
   ```
   - /uretim/siparisler sayfasına git
   - "Yeni Sipariş" butonuna tıkla
   - Müşteri seç
   - Ürün ekle (en az 1 ürün)
   - Teslim tarihi belirle
   - Siparişi kaydet
   ```

2. **Siparişi Onayla (AI Validation Aktif):**
   ```
   - Oluşturduğun siparişi bul
   - "Onayla" butonuna tıkla
   - AI Agent validation çalışacak:
     ✅ Planning Agent devreye girer
     ✅ Warehouse Agent'a stok kontrolü sorar
     ✅ Production Agent'a kapasite kontrolü sorar
     ✅ Zero Error Protocol çalışır
   ```

3. **Sonuçları Kontrol Et:**
   ```
   - /ai-konusmalar sayfasına git
   - En son konuşmayı bul
   - "Detay" butonuna tıkla
   - Agent yanıtlarını gör:
     - Planning Agent: approve/reject
     - Warehouse Agent: stok durumu
     - Production Agent: kapasite durumu
   ```

**Beklenen Sonuç:**
- ✅ Eğer stok yeterliyse: `approved`
- ❌ Eğer stok yetersizse: `rejected` + hata mesajı
- ⏳ Eğer kritik siparişse: `pending_approval` (Human approval gerekli)

---

### Senaryo 2: Production Log - AI Validation Test

**Amaç:** Production Agent'ın üretim kaydını doğrulamasını test et

**Adımlar:**

1. **Üretim Planı Oluştur:**
   ```
   - Bir siparişi onayla (yukarıdaki senaryodan)
   - Üretim planı otomatik oluşur
   ```

2. **Operatör Olarak Giriş Yap:**
   ```
   - Logout yap
   - Operatör hesabı ile giriş yap
   - /operator-dashboard sayfasına git
   ```

3. **Üretim Kaydı Yap:**
   ```
   - Atanan üretim planını bul
   - "Üretime Başla" butonuna tıkla
   - Barkod okut veya manuel giriş yap
   - Üretilen miktarı gir
   - "Kaydet" butonuna tıkla
   ```

4. **AI Validation Kontrolü:**
   ```
   - Production Agent devreye girer:
     ✅ BOM doğrulaması yapar
     ✅ Stok tüketimini kontrol eder
     ✅ Miktar tutarlılığını kontrol eder
   ```

5. **Sonuçları Kontrol Et:**
   ```
   - Yönetici/Planlama hesabına geri dön
   - /ai-konusmalar sayfasına git
   - Production Agent konuşmalarını gör
   ```

**Beklenen Sonuç:**
- ✅ Normal üretim: `approved` + stok otomatik düşer
- ❌ Hatalı miktar: `rejected` + hata mesajı
- ⏳ Anormal durum: `pending_approval`

---

### Senaryo 3: Stock Movement - AI Validation Test

**Amaç:** Warehouse Agent'ın stok hareketini doğrulamasını test et

**Adımlar:**

1. **Stok Hareketi Oluştur:**
   ```
   - /stok/hareketler sayfasına git
   - "Yeni Hareket" butonuna tıkla
   - Hareket tipi seç (Giriş/Çıkış/Üretim/Transfer)
   - Malzeme seç
   - Miktar gir
   - "Kaydet" butonuna tıkla
   ```

2. **AI Validation Kontrolü:**
   ```
   - Warehouse Agent devreye girer:
     ✅ Miktar tutarlılığını kontrol eder
     ✅ Kritik seviye kontrolü yapar
     ✅ Anomali tespiti yapar
   ```

3. **Sonuçları Kontrol Et:**
   ```
   - /ai-konusmalar sayfasına git
   - Warehouse Agent konuşmalarını gör
   ```

**Beklenen Sonuç:**
- ✅ Normal hareket: `approved` + stok güncellenir
- ❌ Kritik seviye altına düşerse: `rejected` veya `pending_approval`
- ⚠️ Anormal miktar: `conditional` + uyarı

---

### Senaryo 4: Developer Agent - Sistem Analizi Test

**Amaç:** Developer Agent'tan iyileştirme raporu almayı test et

**Adımlar:**

1. **Developer Agent Sayfasına Git:**
   ```
   - /ai-gelistirme sayfasına git
   ```

2. **Rapor Oluştur:**
   ```
   - Analiz Alanı seç (örn: "Performance")
   - "Rapor Oluştur" butonuna tıkla
   - Developer Agent çalışmaya başlar:
     ✅ Tüm agent'lara sorar
     ✅ Sistem analizi yapar
     ✅ Bulguları kategorize eder
   ```

3. **Raporu İncele:**
   ```
   - Rapor özetini gör
   - Bulguları kategoriye göre filtrele
   - Her bulgunun detaylarını incele:
     - Issue (Sorun)
     - Location (Konum)
     - Impact (Etki)
     - Recommendation (Öneri)
     - Estimated Effort (Tahmini Süre)
     - Priority (Öncelik)
   ```

**Beklenen Sonuç:**
- ✅ Rapor oluşturulur (30-60 saniye sürebilir)
- ✅ Bulgular kategorize edilir
- ✅ Önceliklendirme yapılır (P0, P1, P2, P3)
- ✅ Tahmini süre hesaplanır

---

### Senaryo 5: Agent Konuşmalarını İzleme

**Amaç:** Agent'lar arası konuşmaları gerçek zamanlı izlemek

**Adımlar:**

1. **Konuşmalar Sayfasına Git:**
   ```
   - /ai-konusmalar sayfasına git
   ```

2. **Bir İşlem Yap (Order Approval, Production Log, vb.):**
   ```
   - Yukarıdaki senaryolardan birini çalıştır
   - Sayfa otomatik güncellenir (10 saniyede bir)
   ```

3. **Konuşmayı İncele:**
   ```
   - Yeni konuşmayı bul
   - "Detay" butonuna tıkla
   - Dialog'da görüntüle:
     - Hangi agent'lar konuştu
     - Her agent ne dedi
     - Zero Error Protocol sonucu
   ```

**Beklenen Sonuç:**
- ✅ Konuşmalar listelenir
- ✅ Her konuşmanın detayı görüntülenir
- ✅ Agent yanıtları gösterilir
- ✅ Protocol sonuçları gösterilir

---

### Senaryo 6: Human Approval Test

**Amaç:** Kritik işlemler için insan onayı sistemini test et

**Adımlar:**

1. **Kritik Bir İşlem Yap:**
   ```
   - Çok büyük miktarlı sipariş oluştur (örn: 10000 adet)
   - Veya kritik seviyeye yakın stok çıkışı yap
   - AI Agent "pending_approval" döner
   ```

2. **Onay Bekleyenleri Gör:**
   ```
   - /ai-onaylar sayfasına git
   - Bekleyen onayları gör
   ```

3. **Onayla/Reddet:**
   ```
   - Bir onayı seç
   - "Onayla" veya "Reddet" butonuna tıkla
   - Reddet durumunda neden belirt
   ```

4. **Sonucu Kontrol Et:**
   ```
   - İşlem onaylandıysa uygulanır
   - Reddedildiyse iptal edilir
   - /ai-onaylar/history sayfasından geçmişi gör
   ```

**Beklenen Sonuç:**
- ✅ Kritik işlemler için onay istenir
- ✅ Onay panelinde görüntülenir
- ✅ Onay/Red işlemi çalışır
- ✅ Geçmiş kaydedilir

---

### Senaryo 7: Cost Tracking Test

**Amaç:** AI maliyetlerini izlemeyi test et

**Adımlar:**

1. **Maliyet Dashboard'una Git:**
   ```
   - /ai-maliyetler sayfasına git
   - (Sadece Yönetici görebilir)
   ```

2. **Birkaç AI İşlemi Yap:**
   ```
   - Order approval yap
   - Production log yap
   - Developer Agent raporu oluştur
   ```

3. **Maliyetleri Kontrol Et:**
   ```
   - Dashboard'u yenile
   - Günlük toplam maliyeti gör
   - Agent başına maliyeti gör
   - Token kullanımını gör
   ```

**Beklenen Sonuç:**
- ✅ Her işlem maliyeti kaydedilir
- ✅ Günlük/haftalık toplamlar gösterilir
- ✅ Limit aşıldığında alert gönderilir

---

## 📊 Test Checklist

### Temel Fonksiyonlar

- [ ] **Order Approval AI Validation**
  - [ ] Normal sipariş onayı (stok yeterli)
  - [ ] Yetersiz stok durumu (reject)
  - [ ] Kritik sipariş (human approval)

- [ ] **Production Log AI Validation**
  - [ ] Normal üretim kaydı
  - [ ] Hatalı miktar (reject)
  - [ ] BOM doğrulama

- [ ] **Stock Movement AI Validation**
  - [ ] Normal stok girişi
  - [ ] Kritik seviye kontrolü
  - [ ] Anomali tespiti

- [ ] **Developer Agent**
  - [ ] Sistem analizi raporu
  - [ ] Kategori bazlı analiz
  - [ ] Önceliklendirme

- [ ] **Agent Konuşmaları**
  - [ ] Konuşma listesi
  - [ ] Konuşma detayları
  - [ ] Real-time güncelleme

- [ ] **Human Approval**
  - [ ] Onay bekleyenler
  - [ ] Onay/Red işlemi
  - [ ] Onay geçmişi

- [ ] **Cost Tracking**
  - [ ] Maliyet kaydı
  - [ ] Limit kontrolü
  - [ ] Dashboard görüntüleme

---

## 🔍 Detaylı Test Adımları

### Test 1: Order Approval - Başarılı Senaryo

**Hazırlık:**
1. Yeterli stoklu bir ürün seç
2. BOM'u kontrol et (malzemeler mevcut olmalı)

**Test:**
1. Sipariş oluştur (10 adet)
2. Siparişi onayla
3. AI Dashboard'u kontrol et:
   - Planning Agent çalıştı mı?
   - Warehouse Agent stok kontrolü yaptı mı?
   - Final decision: `approved` mı?

**Beklenen:**
```
✅ Planning Agent: approve (confidence: 0.98)
✅ Warehouse Agent: approve (stok yeterli)
✅ Production Agent: approve (kapasite var)
✅ Final Decision: approved
✅ Sipariş onaylandı, üretim planı oluşturuldu
```

---

### Test 2: Order Approval - Yetersiz Stok Senaryosu

**Hazırlık:**
1. Stok seviyesi düşük bir ürün seç
2. Veya çok yüksek miktarlı sipariş oluştur

**Test:**
1. Sipariş oluştur (10000 adet - stok yetersiz)
2. Siparişi onayla
3. AI validation sonucunu kontrol et

**Beklenen:**
```
❌ Planning Agent: conditional (stok kontrolü gerekli)
❌ Warehouse Agent: reject (yetersiz stok)
❌ Final Decision: rejected
❌ Hata mesajı: "Yetersiz stok" veya "Insufficient materials"
```

---

### Test 3: Developer Agent - Performance Analizi

**Test:**
1. `/ai-gelistirme` sayfasına git
2. Focus Area: "Performance" seç
3. "Rapor Oluştur" butonuna tıkla
4. Raporu bekle (30-60 saniye)

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

### Test 4: Agent Konuşmaları - Detaylı İnceleme

**Test:**
1. Bir order approval yap (yukarıdaki testlerden)
2. `/ai-konusmalar` sayfasına git
3. En son konuşmayı bul
4. "Detay" butonuna tıkla

**Beklenen:**
```
✅ Konuşma bilgileri görüntülenir:
   - ID, Prompt, Tip, Durum, Tarihler

✅ Agent yanıtları görüntülenir:
   - Planning Agent: decision, reasoning, confidence
   - Warehouse Agent: decision, reasoning, confidence
   - Production Agent: decision, reasoning, confidence

✅ Zero Error Protocol sonucu:
   - Layer 1: Self-Validation - PASSED/FAILED
   - Layer 2: Cross-Validation - PASSED/FAILED
   - Layer 3: Consensus - PASSED/FAILED
   - Layer 4: Database Validation - PASSED/FAILED
   - Layer 5: Human Approval - PENDING/APPROVED/REJECTED
   - Final Decision: approved/rejected/pending_approval
```

---

## 🐛 Sorun Giderme

### Problem 1: "AI Agent validation hatası, manuel onay devam ediyor"

**Neden:**
- OpenAI API key yanlış veya eksik
- API rate limit aşıldı
- Network hatası

**Çözüm:**
```bash
# 1. .env.local dosyasını kontrol et
OPENAI_API_KEY=sk-...  # Doğru mu?

# 2. API key'i test et
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 3. Server'ı yeniden başlat
npm run dev
```

---

### Problem 2: "Dashboard verileri yüklenemedi"

**Neden:**
- Agent'lar başlatılamadı
- Database bağlantı hatası
- RLS (Row Level Security) hatası

**Çözüm:**
```bash
# 1. Console log'larını kontrol et
# Browser DevTools → Console

# 2. Server log'larını kontrol et
# Terminal'de hata mesajlarını gör

# 3. Database bağlantısını kontrol et
# Supabase dashboard'u kontrol et
```

---

### Problem 3: "Agent konuşmaları görünmüyor"

**Neden:**
- Henüz konuşma oluşturulmadı
- Conversation history temizlendi
- API endpoint hatası

**Çözüm:**
```bash
# 1. Bir işlem yap (order approval, production log, vb.)
# 2. Sayfayı yenile (F5)
# 3. API endpoint'i test et:
curl http://localhost:3000/api/ai/conversations \
  -H "Cookie: thunder_token=YOUR_TOKEN"
```

---

### Problem 4: "Developer Agent raporu oluşturulamıyor"

**Neden:**
- OpenAI API timeout
- Çok uzun analiz süresi
- Token limit aşıldı

**Çözüm:**
```bash
# 1. Daha küçük scope ile dene
# Focus Area: "Performance" (tek kategori)

# 2. Timeout'u artır
# API endpoint'te timeout değerini kontrol et

# 3. Console'da hata mesajını gör
```

---

## 📈 Test Metrikleri

### Başarı Kriterleri

✅ **Order Approval:**
- AI validation çalışıyor: %100
- Doğru karar verme: >%90
- Response time: <5 saniye

✅ **Production Log:**
- BOM doğrulama: %100
- Stok tüketimi doğru: %100
- Anomali tespiti: >%80

✅ **Developer Agent:**
- Rapor oluşturma: %100
- Bulgu doğruluğu: >%70
- Response time: <60 saniye

✅ **Agent Konuşmaları:**
- Konuşma kaydı: %100
- Detay görüntüleme: %100
- Real-time güncelleme: Çalışıyor

---

## 🎯 Önerilen Test Sırası

### 1. Hafta: Temel Fonksiyonlar
- [ ] Order Approval AI validation
- [ ] Agent konuşmalarını görüntüleme
- [ ] AI Dashboard kontrolü

### 2. Hafta: Gelişmiş Senaryolar
- [ ] Production Log AI validation
- [ ] Stock Movement AI validation
- [ ] Human Approval sistemi

### 3. Hafta: Analiz ve Raporlama
- [ ] Developer Agent raporları
- [ ] Cost tracking
- [ ] Performance monitoring

---

## 📝 Test Notları

### Önemli Notlar

1. **Maliyet Kontrolü:**
   - Her test OpenAI API kullanır
   - Günlük limit: $50
   - Haftalık limit: $300
   - Limit aşıldığında sistem durur

2. **Test Verileri:**
   - Gerçek verilerle test edin
   - Test verileri production'ı etkilemez
   - Soft delete kullanılıyor

3. **Performance:**
   - İlk API çağrısı yavaş olabilir (cold start)
   - Sonraki çağrılar daha hızlı (cache)
   - Developer Agent raporu 30-60 saniye sürebilir

4. **Error Handling:**
   - AI hatalarında graceful degradation
   - Manuel işlem devam eder
   - Hatalar loglanır

---

## 🚀 Hızlı Test Komutları

### Terminal'den Test

```bash
# 1. Server'ı başlat
npm run dev

# 2. Test endpoint'lerini kontrol et
curl http://localhost:3000/api/ai/dashboard

# 3. Developer Agent raporu oluştur
curl -X POST http://localhost:3000/api/ai/developer/report \
  -H "Content-Type: application/json" \
  -H "Cookie: thunder_token=YOUR_TOKEN" \
  -d '{"action": "generate_improvement_report", "focusArea": "performance"}'

# 4. Konuşmaları listele
curl http://localhost:3000/api/ai/conversations \
  -H "Cookie: thunder_token=YOUR_TOKEN"
```

---

## ✅ Test Tamamlandı Kontrol Listesi

### Temel Testler
- [ ] Order Approval AI validation çalışıyor
- [ ] Production Log AI validation çalışıyor
- [ ] Stock Movement AI validation çalışıyor
- [ ] Developer Agent rapor oluşturuyor
- [ ] Agent konuşmaları görüntüleniyor
- [ ] Human Approval sistemi çalışıyor
- [ ] Cost tracking çalışıyor

### Gelişmiş Testler
- [ ] Zero Error Protocol tüm katmanları geçiyor
- [ ] Consensus mekanizması çalışıyor
- [ ] Cross-agent validation çalışıyor
- [ ] Database validation çalışıyor
- [ ] Error handling çalışıyor
- [ ] Graceful degradation çalışıyor

---

**Son Güncelleme:** 2025-11-17  
**Versiyon:** 1.0.0  
**Durum:** ✅ Test Rehberi Hazır

