# AI Multi-Agent Consensus Entegrasyonu

## 📋 Genel Bakış

Bu entegrasyon, gerçek Supabase verilerini (BOM, stok, kapasite) kullanarak multi-agent consensus workflow'unu otomatik olarak çalıştırır. Production planlar için AI agent'ları (Planning, Production, Warehouse, Manager) birlikte değerlendirip konsensüs kararı verir.

## 🎯 Özellikler

- ✅ **Gerçek Veri Entegrasyonu**: Supabase'den BOM, stok ve kapasite bilgilerini otomatik çeker
- ✅ **Otomatik Prompt Oluşturma**: Gerçek verilerle detaylı prompt oluşturur
- ✅ **Multi-Agent Consensus**: 4 agent (Planning, Production, Warehouse, Manager) birlikte karar verir
- ✅ **UI Entegrasyonu**: Production planlar sayfasından tek tıkla analiz
- ✅ **Detaylı Raporlama**: Konsensüs sonuçları, agent görüşleri, BOM özeti ve kapasite bilgileri

## 🏗️ Mimari

### API Endpoint

**`POST /api/ai/n8n-consensus-with-data`**

**Request Body:**
```json
{
  "plan_id": "uuid",  // veya
  "order_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "plan_id": "uuid",
  "order_id": "uuid",
  "order_number": "ORD-2025-00123",
  "product": {
    "id": "uuid",
    "name": "Ürün A",
    "code": "PROD-XYZ-001"
  },
  "planned_quantity": 250,
  "bom_summary": {
    "total_materials": 5,
    "sufficient_materials": 4,
    "insufficient_materials": 1,
    "materials": [...]
  },
  "production_capacity": {
    "total_operators": 3,
    "total_daily_capacity": 100,
    "active_production_plans": 2,
    "total_active_quantity": 150,
    "available_capacity": 50
  },
  "consensus_result": {
    "finalDecision": "approved" | "rejected" | "needs_review",
    "consensus": {
      "approve": 2,
      "reject": 0,
      "needs_review": 1
    },
    "agentResponses": [
      {
        "name": "Planning",
        "decision": "approved",
        "reasoning": "...",
        "confidence": 0.95
      },
      ...
    ],
    "managerReasoning": "...",
    "confidence": 0.90
  }
}
```

### UI Component

**`components/production/ai-consensus-dialog.tsx`**

Production planlar sayfasında (`/uretim/planlar`) her plan için bir "AI Konsensüs Analizi" butonu görünür. Butona tıklandığında:

1. Modal açılır
2. "Konsensüs Analizini Başlat" butonuna tıklanır
3. API çağrısı yapılır
4. Sonuçlar modal'da gösterilir:
   - Nihai karar (approved/rejected/needs_review)
   - Agent görüşleri (Planning, Production, Warehouse)
   - BOM ve stok durumu
   - Üretim kapasitesi

## 🔄 İş Akışı

```
1. Kullanıcı Production Planlar sayfasında bir plan seçer
2. "AI Konsensüs Analizi" butonuna tıklar
3. Modal açılır
4. "Konsensüs Analizini Başlat" butonuna tıklar
5. API endpoint çağrılır:
   a. Plan bilgileri çekilir (order, product)
   b. BOM malzemeleri çekilir ve stok durumu kontrol edilir
   c. Üretim kapasitesi hesaplanır (operatörler, aktif planlar)
   d. Detaylı prompt oluşturulur
   e. n8n multi-agent consensus workflow'u çağrılır
6. Sonuçlar modal'da gösterilir:
   - Final decision ve güven seviyesi
   - Her agent'ın görüşü ve gerekçesi
   - BOM özeti (yeterli/eksik malzemeler)
   - Üretim kapasitesi bilgileri
```

## 📊 Veri Akışı

### 1. Plan Bilgileri
- `production_plans` tablosundan plan bilgileri
- `orders` tablosundan sipariş bilgileri
- `finished_products` tablosundan ürün bilgileri

### 2. BOM ve Stok
- `bom` tablosundan malzeme listesi
- `raw_materials` ve `semi_finished_products` tablolarından stok durumu
- Her malzeme için:
  - Gerekli miktar (quantity_needed × planned_quantity)
  - Mevcut stok
  - Rezerve stok
  - Kullanılabilir stok
  - Yeterlilik durumu

### 3. Üretim Kapasitesi
- `operators` tablosundan aktif operatörler
- `production_plans` tablosundan aktif planlar
- Günlük kapasite hesaplaması
- Kullanılabilir kapasite hesaplaması

### 4. Prompt Oluşturma
Prompt şu bilgileri içerir:
- Sipariş bilgileri (no, müşteri, ürün, miktar, teslim tarihi, öncelik)
- BOM ve stok durumu (her malzeme için detaylı bilgi)
- Üretim kapasitesi (operatör sayısı, günlük kapasite, aktif planlar)
- Agent'lardan beklenen değerlendirme kriterleri

## 🧪 Test

### API Testi

```bash
# Test scripti ile
./test-ai-consensus-api.sh <plan_id>

# Manuel test
curl -X POST http://192.168.1.250:3000/api/ai/n8n-consensus-with-data \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "your-plan-id"}'
```

### UI Testi

1. Production Planlar sayfasına git (`/uretim/planlar`)
2. Bir plan seç (status: "planlandi" olmalı)
3. "AI Konsensüs Analizi" butonuna tıkla (mor beyin ikonu)
4. Modal'da "Konsensüs Analizini Başlat" butonuna tıkla
5. Sonuçları kontrol et

## 🔍 Konsensüs Kararları

### `approved`
- Tüm malzemeler stokta yeterli
- Üretim kapasitesi uygun
- Agent'ların çoğu onaylıyor
- Üretim başlatılabilir

### `rejected`
- Kritik malzeme eksikliği
- Kapasite yetersiz
- Agent'ların çoğu reddediyor
- Üretim başlatılamaz

### `needs_review`
- Bazı malzemeler eksik ama kritik değil
- Kapasite sınırda
- Agent görüşleri karışık
- İnceleme gerekli

## 📝 Notlar

- **Güvenlik**: Sadece `planlama` ve `yonetici` rolleri bu endpoint'i kullanabilir
- **Performans**: API çağrısı birkaç saniye sürebilir (n8n workflow + AI agent'lar)
- **Hata Yönetimi**: Agent hatası olsa bile sistem çalışmaya devam eder (graceful degradation)
- **Veri Güncelliği**: Her çağrıda gerçek zamanlı veriler çekilir

## 🚀 Gelecek Geliştirmeler

- [ ] Konsensüs sonuçlarını database'e kaydetme
- [ ] Konsensüs geçmişi görüntüleme
- [ ] Otomatik üretim başlatma (approved durumunda)
- [ ] E-posta bildirimleri (rejected/needs_review durumunda)
- [ ] Konsensüs sonuçlarını PDF olarak export etme
- [ ] Agent görüşlerini detaylı analiz etme (sentiment analysis)

