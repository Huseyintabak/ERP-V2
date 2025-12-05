# ThunderV2 ERP - AI Agent Implementation Roadmap

**Oluşturma Tarihi:** 2025-01-27  
**Versiyon:** 1.0.0  
**Durum:** 📋 Planlama Aşaması  
**Hedef:** Yeni mimari yapıya göre tüm agent'ları güncellemek ve eksik özellikleri eklemek

---

## 📋 İçindekiler

1. [Yeni Mimari Yapı Özeti](#yeni-mimari-yapı-özeti)
2. [Mevcut Agent İyileştirmeleri](#mevcut-agent-iyileştirmeleri)
3. [Yeni Agent Ekleme Planı](#yeni-agent-ekleme-planı)
4. [Sistem Destek Katmanları Implementasyonu](#sistem-destek-katmanları-implementasyonu)
5. [Implementasyon Sırası ve Öncelikleri](#implementasyon-sırası-ve-öncelikleri)
6. [Test ve Validasyon](#test-ve-validasyon)

---

## 🏗️ Yeni Mimari Yapı Özeti

### Hiyerarşik Yapı

```
👤 İnsan Kullanıcısı
  ├─ Manager Agent (gpt-4o) - Karar Merkezi
  ├─ Developer Agent (gpt-4o) - Sistem Geliştirme
  │
AgentEventBus - Mesajlaşma Katmanı
  │
Agent Orchestrator - Koordinasyon Merkezi
  │
  ├─ Planning Agent (gpt-4o)
  ├─ Warehouse Agent (gpt-4o-mini)
  ├─ Production Agent (gpt-4o-mini)
  ├─ Purchase Agent (gpt-4o-mini)
  │
  └─ Base Agent (Temel Altyapı)
       │
       ├─ Database (Supabase PostgreSQL)
       └─ Logging & Monitoring
            │
            └─ Sistem Destek Katmanları
                 ├─ Circuit Breaker Pattern
                 ├─ Priority Queue
                 ├─ Agent Health Monitoring
                 ├─ Adaptive Learning
                 └─ Distributed Tracing
```

### Mimari Değişiklikler

**Eklenenler:**
- ✅ Human-in-the-Loop mekanizması
- ✅ AgentEventBus katmanı
- ✅ Sistem Destek Katmanları (5 özellik)
- ✅ Database ve Logging katmanı entegrasyonu

**Değerlendirilecekler:**
- 🎯 Analytics Agent (Nice-to-Have)
- 🎯 Finance Agent (Nice-to-Have)

---

## 🔧 Mevcut Agent İyileştirmeleri

### 1. Planning Agent İyileştirmeleri

**Dosya:** `lib/ai/agents/planning-agent.ts`

#### Yapılacaklar:

**1.1 System Prompt Güncellemeleri**
- ✅ **Yapıldı:** Operatör yükü analizi kriterleri eklendi
- ✅ **Yapıldı:** Teslim tarihi gerçekçilik kontrolü eklendi
- ✅ **Yapıldı:** Alternatif plan önerileri (Plan A/B/C) eklendi
- ✅ **Yapıldı:** BOM doğrulama adımları eklendi

**1.2 JSON Response Format Güncellemeleri**
- ✅ **Yapıldı:** `planType`, `riskLevel`, `operatorLoad` eklendi
- ✅ **Yapıldı:** `recommendations` ve `confidence` eklendi

**1.3 Error Handling**
- ✅ **Yapıldı:** AIErrorHandler entegrasyonu
- ✅ **Yapıldı:** Graceful degradation için OpenAI hata kontrolü

**1.4 Gereken Güncellemeler:**
- [ ] Developer Agent'a sistem iyileştirme bilgisi gönderme mekanizması
- [ ] AgentEventBus üzerinden diğer agent'larla iletişim testi
- [ ] Distributed Tracing entegrasyonu

**1.5 Yapılan İyileştirmeler (AI_AGENT_PROMPTS.md'den):**
- ✅ System prompt genişletildi (operatör yükü, teslim tarihi, alternatif planlar, BOM doğrulama)
- ✅ JSON response format güncellendi (planType, riskLevel, operatorLoad)
- ✅ Error handling iyileştirildi (AIErrorHandler entegrasyonu)
- ✅ `requestType` parametresi tüm `callGPT()` çağrılarına eklendi

---

### 2. Warehouse Agent İyileştirmeleri

**Dosya:** `lib/ai/agents/warehouse-agent.ts`

#### Yapılacaklar:

**2.1 System Prompt Güncellemeleri**
- ✅ **Yapıldı:** Stok güncelleme validasyonu kriterleri eklendi
- ✅ **Yapıldı:** Kritik seviye ihlali kontrolü eklendi
- ✅ **Yapıldı:** Büyük değişim uyarıları eklendi (100+ birim, 50%+ değişim)

**2.2 Error Handling**
- ✅ **Yapıldı:** OpenAI hataları için graceful degradation
- ✅ **Yapıldı:** Validation request type için approve dönüşü

**2.3 Gereken Güncellemeler:**
- [ ] Developer Agent'a sistem iyileştirme bilgisi gönderme mekanizması
- [ ] Analytics Agent entegrasyonu (gelecekte)
- [ ] Agent Health Monitoring metrikleri

**2.4 Yapılan İyileştirmeler (AI_AGENT_PROMPTS.md'den):**
- ✅ System prompt genişletildi (stok güncelleme validasyonu kriterleri, kritik seviye kontrolü, büyük değişim uyarıları)
- ✅ Error handling iyileştirildi (OpenAI hataları için graceful degradation)
- ✅ Validation request type için approve dönüşü eklendi
- ✅ Context'te yeterli bilgi varsa manuel güncelleme onaylanır

---

### 3. Production Agent İyileştirmeleri

**Dosya:** `lib/ai/agents/production-agent.ts`

#### Yapılacaklar:

**3.1 System Prompt Güncellemeleri**
- ✅ **Yapıldı:** BOM doğrulama kriterleri eklendi
- ✅ **Yapıldı:** Anomali tespiti kriterleri eklendi (🔴/🟡 seviyeler)
- ✅ **Yapıldı:** Kalite kontrol standartları eklendi
- ✅ **Yapıldı:** Stok tüketim doğrulama kriterleri eklendi

**3.2 JSON Response Format Güncellemeleri**
- ✅ **Yapıldı:** `consumptionRate`, `anomalies`, `qualityCheck` eklendi

**3.3 Error Handling**
- ✅ **Yapıldı:** AIErrorHandler entegrasyonu
- ✅ **Yapıldı:** Graceful degradation

**3.4 Gereken Güncellemeler:**
- [ ] **ÖNEMLİ:** Developer Agent'a sistem iyileştirme bilgisi gönderme mekanizması (Yeni mimariye göre)
  - Production Agent → Developer Agent iletişimi
  - Sistem iyileştirme verileri toplama
  - Analiz sonuçlarını Developer'a iletme
- [ ] AgentEventBus üzerinden Developer Agent'a mesaj gönderme
- [ ] Adaptive Learning entegrasyonu (performans metrikleri toplama)

**3.5 Yapılan İyileştirmeler (AI_AGENT_PROMPTS.md'den):**
- ✅ System prompt genişletildi (BOM doğrulama kriterleri, anomali tespiti, kalite kontrol standartları, stok tüketim doğrulama)
- ✅ JSON response format güncellendi (consumptionRate, anomalies, qualityCheck)
- ✅ Error handling iyileştirildi (AIErrorHandler entegrasyonu, graceful degradation)
- ✅ `requestType` parametresi tüm `callGPT()` çağrılarına eklendi

---

### 4. Purchase Agent İyileştirmeleri

**Dosya:** `lib/ai/agents/purchase-agent.ts`

#### Yapılacaklar:

**4.1 System Prompt Güncellemeleri**
- ✅ **Yapıldı:** Tedarikçi güvenilirlik skorlama eklendi
- ✅ **Yapıldı:** Fiyat trend analizi eklendi
- ✅ **Yapıldı:** Acil durum önceliklendirme eklendi (P0/P1/P2)

**4.2 JSON Response Format Güncellemeleri**
- ✅ **Yapıldı:** `supplierReliabilityScore`, `priceTrend`, `alternativeSuppliers` eklendi

**4.3 Error Handling**
- ✅ **Yapıldı:** AIErrorHandler entegrasyonu
- ✅ **Yapıldı:** Graceful degradation

**4.4 Gereken Güncellemeler:**
- [ ] **ÖNEMLİ:** Developer Agent'a sistem iyileştirme bilgisi gönderme mekanizması (Yeni mimariye göre)
  - Purchase Agent → Developer Agent iletişimi
  - Satın alma süreçlerindeki iyileştirmeleri Developer'a iletme
- [ ] Finance Agent entegrasyonu (gelecekte - maliyet optimizasyonu için)
- [ ] Agent Health Monitoring metrikleri

**4.5 Yapılan İyileştirmeler (AI_AGENT_PROMPTS.md'den):**
- ✅ System prompt genişletildi (tedarikçi güvenilirlik skorlama, fiyat trend analizi, acil durum önceliklendirme)
- ✅ JSON response format güncellendi (supplierReliabilityScore, priceTrend, alternativeSuppliers)
- ✅ Error handling iyileştirildi (AIErrorHandler entegrasyonu, graceful degradation)
- ✅ `requestType` parametresi tüm `callGPT()` çağrılarına eklendi

---

### 5. Manager Agent İyileştirmeleri

**Dosya:** `lib/ai/agents/manager-agent.ts`

#### Yapılacaklar:

**5.1 System Prompt Güncellemeleri**
- ✅ **Yapıldı:** Risk skorlama metrikleri eklendi
- ✅ **Yapıldı:** Bütçe etki analizi eklendi
- ✅ **Yapıldı:** Stratejik uyumluluk kriterleri eklendi

**5.2 JSON Response Format Güncellemeleri**
- ✅ **Yapıldı:** `totalRiskScore` eklendi

**5.3 Error Handling**
- ✅ **Yapıldı:** AIErrorHandler entegrasyonu
- ✅ **Yapıldı:** Graceful degradation

**5.4 Gereken Güncellemeler:**
- [ ] **ÖNEMLİ:** Developer Agent'tan sistem analiz raporlarını alma mekanizması
  - Developer Agent → Manager Agent iletişimi
  - Kritik bulguları Manager'a raporlama
- [ ] Human approval mekanizması iyileştirmeleri
- [ ] Analytics Agent entegrasyonu (gelecekte - dashboard insights için)

**5.5 Yapılan İyileştirmeler (AI_AGENT_PROMPTS.md'den):**
- ✅ System prompt genişletildi (risk skorlama metrikleri, bütçe etki analizi, stratejik uyumluluk kriterleri)
- ✅ JSON response format güncellendi (totalRiskScore)
- ✅ Error handling iyileştirildi (AIErrorHandler entegrasyonu, graceful degradation)
- ✅ `generateStrategicRecommendation` metodu düzeltildi (request.id, request.type kullanımı)
- ✅ `requestType` parametresi tüm `callGPT()` çağrılarına eklendi

---

### 6. Developer Agent İyileştirmeleri

**Dosya:** `lib/ai/agents/developer-agent.ts`

#### Yapılacaklar:

**6.1 System Prompt Güncellemeleri**
- ✅ **Yapıldı:** Code smell pattern'leri eklendi
- ✅ **Yapıldı:** Performance bottleneck tespiti eklendi
- ✅ **Yapıldı:** Security vulnerability kategorileri eklendi

**6.2 JSON Response Format Güncellemeleri**
- ✅ **Yapıldı:** Detaylı `findings` yapısı eklendi

**6.3 Error Handling**
- ✅ **Yapıldı:** AIErrorHandler entegrasyonu
- ✅ **Yapıldı:** Graceful degradation

**6.4 Gereken Güncellemeler:**
- [ ] **ÖNEMLİ:** Production ve Purchase Agent'lardan sistem iyileştirme bilgisi alma (Yeni mimariye göre)
  - Developer Agent → Production Agent (askAgent)
  - Developer Agent → Purchase Agent (askAgent)
  - Veri toplama ve analiz mekanizması
- [ ] **ÖNEMLİ:** Manager Agent'a kritik bulguları raporlama
  - Developer Agent → Manager Agent iletişimi
  - Kritik bulguları otomatik raporlama
- [ ] **ÖNEMLİ:** İnsan kullanıcısına nice-to-have raporlar sunma
  - Dashboard veya API endpoint oluşturma
  - Rapor görüntüleme UI'ı
- [ ] Tüm agent'lardan analiz verisi toplama mekanizması
- [ ] Önceliklendirilmiş iyileştirme listesi oluşturma

**6.5 Yapılan İyileştirmeler (AI_AGENT_PROMPTS.md'den):**
- ✅ System prompt genişletildi (code smell pattern'leri, performance bottleneck tespiti, security vulnerability kategorileri)
- ✅ JSON response format güncellendi (detaylı findings yapısı, category, severity, priority)
- ✅ Error handling iyileştirildi (AIErrorHandler entegrasyonu, graceful degradation)
- ✅ Import hataları düzeltildi (`@/lib/utils/logger`, `@/lib/supabase/server`)
- ✅ `createClient` import'u eklendi
- ✅ `requestType` parametresi tüm `callGPT()` çağrılarına eklendi

---

## 🆕 Yeni Agent Ekleme Planı

### Quality Control Agent (Nice-to-Have - Çok Düşük Öncelik)

**Öncelik:** Çok Düşük  
**Model:** `gpt-4o-mini`  
**Dosya:** `lib/ai/agents/quality-control-agent.ts` (oluşturulacak - ihtiyaç durumunda)

#### Görevler:
1. **Kalite Standartları Analizi:**
   - Kalite standartlarını analiz eder
   - Üretim kalite metriklerini takip eder
   - Kalite trendleri analizi

2. **Anomali Tespiti:**
   - Üretim anomali tespiti
   - Kalite sapmaları analizi
   - Pattern-based kalite sorunları

3. **Kalite Raporları:**
   - Kalite raporları oluşturur
   - Kalite trend raporları
   - İyileştirme önerileri

#### Neden Nice-to-Have?
- Production Agent zaten kalite kontrol ve anomali tespiti yapıyor
- Bu özellik Production Agent'ta yeterli
- Ayrı bir agent'a gerek yok (şu an için)

#### Ne Zaman Eklenmeli?
- Kalite kontrol çok karmaşıklaştığında
- Ayrı bir kalite departmanı olduğunda
- Kalite kontrol süreçleri Production Agent'ın kapasitesini aştığında

#### Not:
Bu agent şu an için **eklenmeyecek** - Production Agent'ın kalite kontrol özellikleri yeterli. Gelecekte ihtiyaç durumunda değerlendirilebilir.

---

### Analytics Agent (Nice-to-Have)

**Öncelik:** Düşük  
**Model:** `gpt-4o-mini`  
**Dosya:** `lib/ai/agents/analytics-agent.ts` (oluşturulacak)

#### Görevler:
1. **Dashboard Insights:**
   - Dashboard verilerini analiz eder
   - AI-powered yorumlar ve öngörüler sunar
   - "Ciro %15 arttı ama kar %3 düştü - maliyet analizi gerekli" gibi yorumlar

2. **Trend Analizi:**
   - Geçmiş verileri analiz eder
   - Trend pattern'leri tespit eder
   - Gelecek tahminleri yapar

3. **Anomali Tespiti:**
   - Pattern-based anomaly detection
   - Sipariş iptal oranı, üretim süresi sapmaları vb.

4. **KPI Analizi:**
   - KPI'ları hesaplar ve yorumlar
   - Hedeflere göre performans değerlendirmesi

#### Implementasyon Adımları:
- [ ] `lib/ai/agents/analytics-agent.ts` dosyası oluştur
- [ ] Base Agent'tan extend et
- [ ] System prompt oluştur (dashboard insights, trend analysis, anomaly detection)
- [ ] Request type'ları implement et:
  - `request` → `handleAnalyticsRequest()` - Dashboard insights üret
  - `query` → `handleAnalyticsQuery()` - Trend sorguları
  - `analysis` → `handleTrendAnalysis()` - Trend analizi
  - `validation` → `handleAnomalyDetection()` - Anomali tespiti
- [ ] Orchestrator'a ekle
- [ ] Dashboard'a entegre et (`app/(dashboard)/yonetici-dashboard/page.tsx`)
- [ ] API endpoint oluştur (`app/api/ai/analytics/route.ts`)

#### JSON Response Format:
```typescript
{
  decision: "approve" | "insight" | "warning",
  action: "dashboard_insight" | "trend_analysis" | "anomaly_detection",
  data: {
    insights: [
      {
        metric: string,
        value: number,
        trend: "increasing" | "decreasing" | "stable",
        interpretation: string,
        recommendation: string
      }
    ],
    trends: [
      {
        period: string,
        metric: string,
        forecast: number,
        confidence: number
      }
    ],
    anomalies: [
      {
        type: string,
        severity: "critical" | "warning",
        description: string,
        impact: string
      }
    ]
  },
  reasoning: string,
  confidence: number
}
```

---

### Finance Agent (Nice-to-Have)

**Öncelik:** Orta-Düşük  
**Model:** `gpt-4o-mini`  
**Dosya:** `lib/ai/agents/finance-agent.ts` (oluşturulacak)

#### Görevler:
1. **Maliyet Optimizasyonu:**
   - BOM maliyet optimizasyonu önerileri
   - Alternatif malzeme/tedarikçi önerileri
   - İşçilik maliyeti optimizasyonu

2. **Kârlılık Analizi:**
   - Ürün bazlı kârlılık analizi
   - Müşteri bazlı kârlılık analizi
   - Sipariş bazlı kârlılık analizi

3. **Fiyatlandırma Stratejisi:**
   - Rekabet analizi
   - Talep esnekliği analizi
   - Fiyat artış/azalış önerileri

4. **Maliyet-Fayda Analizi:**
   - Yatırım kararları için ROI hesaplama
   - Tedarikçi değişikliği analizi
   - Operatör eğitimi ROI analizi

5. **Bütçe Takibi:**
   - Bütçe kullanım oranı takibi
   - Bütçe aşımı uyarıları
   - Yıl sonu hedef takibi

#### Implementasyon Adımları:
- [ ] `lib/ai/agents/finance-agent.ts` dosyası oluştur
- [ ] Base Agent'tan extend et
- [ ] System prompt oluştur (cost optimization, profitability, pricing, budget)
- [ ] Request type'ları implement et:
  - `request` → `handleCostOptimization()` - Maliyet optimizasyonu
  - `query` → `handleProfitabilityQuery()` - Kârlılık sorguları
  - `analysis` → `handleFinancialAnalysis()` - Finansal analiz
  - `validation` → `handleBudgetValidation()` - Bütçe kontrolü
- [ ] Orchestrator'a ekle
- [ ] Purchase Agent ile entegrasyon (maliyet önerileri için)
- [ ] Manager Agent ile entegrasyon (bütçe kontrolü için)
- [ ] API endpoint oluştur (`app/api/ai/finance/route.ts`)

#### JSON Response Format:
```typescript
{
  decision: "approve" | "recommend" | "warning",
  action: "cost_optimization" | "pricing_strategy" | "budget_check" | "profitability_analysis",
  data: {
    costOptimization: {
      currentCost: number,
      optimizedCost: number,
      savings: number,
      recommendations: [
        {
          action: string,
          impact: string,
          savings: number,
          effort: string
        }
      ]
    },
    profitability: {
      productId: string,
      currentMargin: number,
      targetMargin: number,
      recommendations: string[]
    },
    pricing: {
      currentPrice: number,
      recommendedPrice: number,
      priceChange: number,
      demandElasticity: number,
      expectedProfitChange: number
    },
    budget: {
      currentUsage: number,
      budgetLimit: number,
      usagePercentage: number,
      warning: boolean
    }
  },
  reasoning: string,
  confidence: number
}
```

---

## 📊 Base Agent ve Orchestrator Detayları

### Base Agent Özeti

**Dosya:** `lib/ai/agents/base-agent.ts`  
**Tip:** Abstract Class  
**Amaç:** Tüm agent'ların extend edeceği temel sınıf

**Özellikler:**
- OpenAI Client: Otomatik API client oluşturma
- Model Selection: Dinamik model seçimi (role ve task complexity'ye göre)
- Caching: Prompt cache (1 saat TTL)
- Rate Limiting: Agent bazlı rate limit kontrolü
- Cost Tracking: Token ve maliyet takibi
- Error Handling: Retry loop, backoff strategy, graceful degradation
- Response Parsing: Markdown code block temizleme, JSON extraction

**Metodlar:**
- `callGPT()`: OpenAI API çağrısı (retry, backoff, error handling)
- `vote()`: Consensus için oylama
- `askAgent()`: Diğer agent'a soru sorar (AgentEventBus üzerinden)
- `parseResponse()`: GPT response'unu parse eder
- `getInfo()`: Agent bilgilerini döndürür

---

### Agent Orchestrator Özeti

**Dosya:** `lib/ai/orchestrator.ts`  
**Amaç:** Tüm agent'ları yönetir, konuşmaları koordine eder, Zero Error Protocol'ü çalıştırır

**Özellikler:**
- Agent Management: 6 agent'ı başlatır ve kaydeder
- Conversation Management: Konuşmaları takip eder
- Zero Error Protocol: 4 katmanlı doğrulama sistemi
- Consensus Engine: Agent'lar arası consensus oluşturur
- Database Logging: Tüm konuşmaları `agent_logs` tablosuna kaydeder
- Cost Tracking: API maliyetlerini `agent_costs` tablosuna kaydeder
- Human Approvals: Kritik kararlar için `human_approvals` tablosuna kaydeder

**Zero Error Protocol (4 Katmanlı):**
1. Layer 1: Self-Validation (Agent kendi kararını doğrular)
2. Layer 2: Cross-Agent Validation (Diğer agent'lar oylar)
3. Layer 3: Consensus (Oybirliği kontrolü)
4. Layer 4: Database Validation (Database'de doğrulama)

---

### Sistem Özellikleri Özeti

**Retry ve Backoff Strategy:**
- Max Retries: 3 (RATE_LIMIT, NETWORK_ERROR için)
- Max Retries: 2 (TIMEOUT için)
- Backoff: Exponential (1s, 2s, 4s, 8s...) veya Linear (1s, 2s, 3s...)
- Max Backoff: 10 saniye (exponential), 5 saniye (linear)

**Caching:**
- Strategy: In-memory cache
- TTL: 1 saat (3600 saniye)
- Key Format: `gpt:{agentName}:{messagesHash}:{model}`
- Scope: Sadece başarılı response'lar cache'lenir

**Rate Limiting:**
- Scope: Agent bazlı
- Check: Her `callGPT()` çağrısında
- Strategy: Agent bazlı limit kontrolü

**Cost Tracking:**
- Storage: `agent_costs` tablosu
- Tracking: Her API çağrısı için token ve maliyet
- Calculation: Model bazlı fiyat hesaplama
- Limit: Cost limit kontrolü

**Logging:**
- Storage: Memory (1000 log) + Database (`agent_logs` tablosu)
- Levels: info, warn, error
- Scope: Tüm agent işlemleri
- Format: Structured logging

---

### Karşılaştırma Tablosu (AI_AGENT_PROMPTS.md'den)

| Agent | Model | Kompleksite | Request Types | Private Metodlar | Özel Özellikler |
|-------|-------|-------------|---------------|------------------|-----------------|
| Planning | `gpt-4o` | Yüksek | request, query, analysis, validation | 3 | Alternatif plan önerileri (A/B/C), Operatör yükü analizi |
| Warehouse | `gpt-4o-mini` | Orta | request, query, analysis, validation | 6 | Kritik stok tespiti, Rezervasyon yönetimi |
| Production | `gpt-4o-mini` | Orta-Yüksek | request, query, analysis, validation | 3 | BOM doğrulama, Anomali tespiti, Kalite kontrol |
| Purchase | `gpt-4o-mini` | Orta | request, query, analysis, validation | 5 | Tedarikçi güvenilirlik skoru, Fiyat trend analizi |
| Manager | `gpt-4o` | Yüksek | request, query, analysis, validation | 2 | Risk skorlama (0-100), Bütçe kontrolü |
| Developer | `gpt-4o` | Yüksek | request, query, analysis, validation | 3 | Code smell tespiti, Security vulnerability analizi |

**Request Type Dağılımı:**
Tüm agent'lar aynı 4 request type'ını destekler:
- **request:** İşlem yapma (sipariş onayı, stok rezervasyonu, vb.)
- **query:** Bilgi sorgulama (durum, metrikler, vb.)
- **analysis:** Analiz yapma (performans, optimizasyon, vb.)
- **validation:** Validasyon (doğrulama, kontrol, vb.)

**Error Handling Karşılaştırması:**
Tüm agent'lar aynı error handling stratejisini kullanır:
- OpenAI API hataları → Graceful degradation (validation için approve)
- Network hataları → Retry with backoff
- Validation hataları → Normal reject
- Unknown hatalar → Fail-safe approve (low confidence)

---

## ⚙️ Sistem Destek Katmanları Implementasyonu

### 1. Circuit Breaker Pattern

**Dosya:** `lib/ai/utils/circuit-breaker.ts` (oluşturulacak)

#### Implementasyon:
- [ ] CircuitBreaker class oluştur
- [ ] State management (CLOSED, OPEN, HALF_OPEN)
- [ ] Failure threshold (örn: 5 başarısız çağrı)
- [ ] Timeout (örn: 60 saniye)
- [ ] Base Agent'a entegre et
- [ ] Orchestrator'a entegre et

#### Kullanım Senaryosu:
```typescript
// Base Agent içinde
const circuitBreaker = CircuitBreaker.getInstance();
try {
  const result = await circuitBreaker.execute(() => 
    this.askAgent('warehouse', 'check_stock', context)
  );
} catch (error) {
  // Circuit open - cached data kullan veya fallback
}
```

---

### 2. Priority Queue

**Dosya:** `lib/ai/orchestrator.ts` (güncellenecek)

#### Implementasyon:
- [ ] Priority queue implementasyonu
- [ ] Urgency seviyesine göre sıralama (critical > high > medium > low)
- [ ] `startConversation()` metodunu priority queue ile entegre et
- [ ] Database'e priority bilgisi kaydet

#### Örnek:
```typescript
// Orchestrator içinde
private priorityQueue: PriorityQueue<ConversationRequest> = new PriorityQueue((a, b) => {
  const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  return urgencyOrder[b.urgency || 'low'] - urgencyOrder[a.urgency || 'low'];
});
```

---

### 3. Agent Health Monitoring

**Dosya:** `lib/ai/utils/health-monitor.ts` (oluşturulacak)

#### Implementasyon:
- [ ] HealthMonitor class oluştur
- [ ] Metrik toplama:
  - Uptime tracking
  - Error rate hesaplama
  - Latency ölçümü
  - Success rate hesaplama
  - Token usage tracking
- [ ] Database'e kaydet (`agent_logs` tablosuna health metrics ekle)
- [ ] Developer Agent'a raporlama
- [ ] Alerting mekanizması (kritik seviyelerde)

#### Database Schema Güncelleme:
```sql
-- agent_logs tablosuna health_metrics kolonu ekle
ALTER TABLE agent_logs 
ADD COLUMN IF NOT EXISTS health_metrics JSONB;

-- Örnek health_metrics:
{
  "uptime": 99.5,
  "errorRate": 0.02,
  "latency": 1.2,
  "successRate": 0.98,
  "tokenUsage": 1500
}
```

---

### 4. Adaptive Learning

**Dosya:** `lib/ai/utils/adaptive-learner.ts` (oluşturulacak)

#### Implementasyon:
- [ ] AdaptiveLearner class oluştur
- [ ] Başarılı karar pattern'lerini analiz et
- [ ] Prompt optimization:
  - Hangi prompt'lar daha başarılı?
  - Confidence score'a göre prompt iyileştirme
- [ ] Decision confidence kalibrasyonu
- [ ] Model selection optimization:
  - Hangi model hangi task için daha iyi?
  - Performance metriklerine göre model seçimi
- [ ] Base Agent'a entegre et
- [ ] Her agent kendi öğrenme mekanizmasını implement et

#### Örnek:
```typescript
// Base Agent içinde
const learner = AdaptiveLearner.getInstance(this.name);
const optimizedPrompt = learner.optimizePrompt(systemPrompt, context, previousResults);
```

---

### 5. Distributed Tracing

**Dosya:** `lib/ai/utils/trace-tracker.ts` (oluşturulacak)

#### Implementasyon:
- [ ] TraceTracker class oluştur
- [ ] Conversation flow tracking:
  - Hangi agent ne zaman devreye girdi?
  - Agent'lar arası mesajlaşma akışı
  - Decision path tracking
- [ ] Performance bottleneck identification:
  - Hangi agent en uzun sürdü?
  - Hangi işlem en yavaş?
- [ ] Database'e kaydet (conversation tree olarak)
- [ ] Visualization için API endpoint

#### Database Schema:
```sql
-- agent_logs tablosuna trace_tree kolonu ekle
ALTER TABLE agent_logs 
ADD COLUMN IF NOT EXISTS trace_tree JSONB;

-- Örnek trace_tree:
{
  "conversationId": "uuid",
  "root": {
    "agent": "planning",
    "timestamp": "2025-01-27T10:00:00Z",
    "duration": 1.2,
    "children": [
      {
        "agent": "warehouse",
        "timestamp": "2025-01-27T10:00:01Z",
        "duration": 0.8,
        "type": "askAgent"
      }
    ]
  }
}
```

---

## 📅 Implementasyon Sırası ve Öncelikleri

### Faz 1: Kritik İyileştirmeler (P0) - 1 Hafta

**Öncelik:** 🔴 Yüksek  
**Hedef:** Yeni mimari yapıya göre mevcut agent'ları güncellemek

#### 1.1 Developer Agent İyileştirmeleri
- [ ] Production Agent'tan sistem iyileştirme bilgisi alma
- [ ] Purchase Agent'tan sistem iyileştirme bilgisi alma
- [ ] Manager Agent'a kritik bulguları raporlama
- [ ] İnsan kullanıcısına nice-to-have raporlar sunma (API endpoint + UI)

**Tahmini Süre:** 2 gün

#### 1.2 Manager Agent İyileştirmeleri
- [ ] Developer Agent'tan sistem analiz raporlarını alma
- [ ] Human approval mekanizması iyileştirmeleri

**Tahmini Süre:** 1 gün

#### 1.3 AgentEventBus Entegrasyonu
- [ ] Tüm agent'larda `askAgent()` metodunun test edilmesi
- [ ] Production → Developer mesajlaşma testi
- [ ] Purchase → Developer mesajlaşma testi
- [ ] Developer → Manager mesajlaşma testi

**Tahmini Süre:** 1 gün

#### 1.4 Database Schema Güncellemeleri
- [ ] `agent_logs` tablosuna `health_metrics` kolonu ekle
- [ ] `agent_logs` tablosuna `trace_tree` kolonu ekle
- [ ] Migration oluştur ve uygula

**Tahmini Süre:** 0.5 gün

---

### Faz 2: Sistem Destek Katmanları (P1) - 2 Hafta

**Öncelik:** 🟠 Orta  
**Hedef:** Circuit Breaker, Priority Queue, Health Monitoring implementasyonu

#### 2.1 Circuit Breaker Pattern
- [ ] `lib/ai/utils/circuit-breaker.ts` oluştur
- [ ] Base Agent'a entegre et
- [ ] Orchestrator'a entegre et
- [ ] Test senaryoları oluştur

**Tahmini Süre:** 2 gün

#### 2.2 Priority Queue
- [ ] Priority queue implementasyonu
- [ ] Orchestrator'a entegre et
- [ ] Urgency-based sıralama testi

**Tahmini Süre:** 1 gün

#### 2.3 Agent Health Monitoring
- [ ] `lib/ai/utils/health-monitor.ts` oluştur
- [ ] Metrik toplama implementasyonu
- [ ] Database'e kaydetme
- [ ] Developer Agent'a raporlama
- [ ] Dashboard'da gösterim (gelecekte)

**Tahmini Süre:** 3 gün

---

### Faz 3: Gelişmiş Özellikler (P2) - 2 Hafta

**Öncelik:** 🟡 Orta-Düşük  
**Hedef:** Adaptive Learning ve Distributed Tracing

#### 3.1 Adaptive Learning
- [ ] `lib/ai/utils/adaptive-learner.ts` oluştur
- [ ] Prompt optimization mekanizması
- [ ] Confidence kalibrasyonu
- [ ] Model selection optimization
- [ ] Her agent'a entegre et

**Tahmini Süre:** 4 gün

#### 3.2 Distributed Tracing
- [ ] `lib/ai/utils/trace-tracker.ts` oluştur
- [ ] Conversation flow tracking
- [ ] Decision path visualization
- [ ] Performance bottleneck identification
- [ ] API endpoint oluştur (trace görüntüleme için)

**Tahmini Süre:** 3 gün

---

### Faz 4: Nice-to-Have Agent'lar (P3) - İsteğe Bağlı

**Öncelik:** 🟢 Düşük  
**Hedef:** Analytics ve Finance Agent ekleme (ihtiyaç durumunda)

#### 4.1 Analytics Agent
- [ ] `lib/ai/agents/analytics-agent.ts` oluştur
- [ ] System prompt yaz
- [ ] Request type'ları implement et
- [ ] Orchestrator'a ekle
- [ ] Dashboard'a entegre et

**Tahmini Süre:** 3 gün

#### 4.2 Finance Agent
- [ ] `lib/ai/agents/finance-agent.ts` oluştur
- [ ] System prompt yaz
- [ ] Request type'ları implement et
- [ ] Orchestrator'a ekle
- [ ] Purchase Agent ile entegrasyon
- [ ] Manager Agent ile entegrasyon

**Tahmini Süre:** 3 gün

---

## 🧪 Test ve Validasyon

### Test Senaryoları

#### 1. Developer Agent İletişim Testleri
- [ ] Production Agent'tan veri alma testi
- [ ] Purchase Agent'tan veri alma testi
- [ ] Manager Agent'a raporlama testi
- [ ] İnsan kullanıcısına rapor sunma testi

#### 2. Circuit Breaker Testleri
- [ ] Agent failure senaryosu
- [ ] Fallback mekanizması testi
- [ ] Circuit open/close state testleri

#### 3. Priority Queue Testleri
- [ ] Urgency-based sıralama testi
- [ ] Critical işlemlerin öncelikli işlenmesi testi

#### 4. Health Monitoring Testleri
- [ ] Metrik toplama testi
- [ ] Database'e kaydetme testi
- [ ] Developer Agent'a raporlama testi

#### 5. Adaptive Learning Testleri
- [ ] Prompt optimization testi
- [ ] Confidence kalibrasyonu testi
- [ ] Model selection testi

#### 6. Distributed Tracing Testleri
- [ ] Conversation flow tracking testi
- [ ] Decision path visualization testi
- [ ] Performance bottleneck identification testi

---

## 📊 İlerleme Takibi

### Checklist

**Faz 1: Kritik İyileştirmeler**
- [ ] Developer Agent - Production Agent iletişimi
- [ ] Developer Agent - Purchase Agent iletişimi
- [ ] Developer Agent - Manager Agent iletişimi
- [ ] Developer Agent - İnsan kullanıcısı raporlama
- [ ] Manager Agent - Developer Agent iletişimi
- [ ] AgentEventBus testleri
- [ ] Database schema güncellemeleri

**Faz 2: Sistem Destek Katmanları**
- [ ] Circuit Breaker Pattern
- [ ] Priority Queue
- [ ] Agent Health Monitoring

**Faz 3: Gelişmiş Özellikler**
- [ ] Adaptive Learning
- [ ] Distributed Tracing

**Faz 4: Nice-to-Have Agent'lar**
- [ ] Analytics Agent
- [ ] Finance Agent
- [ ] Quality Control Agent (Çok düşük öncelik - şu an gerekli değil)

---

## 📝 Detaylı İyileştirme Notları

### Mevcut Agent'larda Yapılan İyileştirmeler (AI_AGENT_PROMPTS.md'den)

#### Ortak İyileştirmeler:
1. ✅ **Error Handler Utility (`lib/ai/utils/error-handler.ts`):**
   - AIErrorType enum (QUOTA_EXCEEDED, UNAUTHORIZED, RATE_LIMIT, vb.)
   - ErrorHandlingStrategy interface
   - ERROR_STRATEGIES constant mapping
   - AIErrorHandler class (classifyError, handleError, calculateBackoff, logError)

2. ✅ **Base Agent İyileştirmeleri:**
   - `callGPT()` metoduna retry loop eklendi (max 3 retry)
   - Backoff strategies (exponential/linear) entegre edildi
   - AIErrorHandler entegrasyonu
   - Error objelerine `aiErrorType`, `gracefulDegradation`, `reasoning`, `confidence` eklendi
   - `timeout` parametresi düzeltildi (options object içinde)
   - `sleep()` helper method eklendi

3. ✅ **Tüm Agent'larda:**
   - `processRequest()` catch block'ları güncellendi (AIErrorHandler kullanımı)
   - `requestType` parametresi tüm `callGPT()` çağrılarına eklendi
   - OpenAI API hataları için graceful degradation
   - Validation request type için OpenAI hatası durumunda `approve` dönüşü

#### Agent-Specific İyileştirmeler:

**Planning Agent:**
- System prompt'a operatör yükü analizi, teslim tarihi kontrolü, alternatif planlar, BOM doğrulama eklendi
- JSON response'a `planType`, `riskLevel`, `operatorLoad` eklendi
- `ValidationResult` type'ına `recommendations` ve `confidence` eklendi

**Warehouse Agent:**
- System prompt'a stok güncelleme validasyonu kriterleri eklendi
- Context'te `isDecrease`, `isCriticalDecrease`, `isLargeChange` bilgileri eklendi
- Catch block'ta OpenAI API hataları için özel kontrol eklendi

**Production Agent:**
- System prompt'a BOM doğrulama, anomali tespiti, kalite kontrol, stok tüketim doğrulama eklendi
- JSON response'a `consumptionRate`, `anomalies`, `qualityCheck` eklendi

**Purchase Agent:**
- System prompt'a tedarikçi güvenilirlik skoru, fiyat trend analizi, acil durum önceliklendirme eklendi
- JSON response'a `supplierReliabilityScore`, `priceTrend`, `alternativeSuppliers` eklendi

**Manager Agent:**
- System prompt'a risk skorlama metrikleri, bütçe etki analizi, stratejik uyumluluk eklendi
- JSON response'a `totalRiskScore` eklendi
- `generateStrategicRecommendation` metodu düzeltildi

**Developer Agent:**
- System prompt'a code smell pattern'leri, performance bottleneck, security vulnerability kategorileri eklendi
- JSON response'a detaylı `findings` yapısı eklendi
- Import hataları düzeltildi

---

## 📝 Notlar

### Önemli Hatırlatmalar

1. **Backward Compatibility:** Tüm değişiklikler backward compatible olmalı
2. **Error Handling:** Her yeni özellik için graceful degradation sağlanmalı
3. **Testing:** Her değişiklikten sonra comprehensive test yapılmalı
4. **Documentation:** Tüm değişiklikler AI_AGENT_PROMPTS.md'ye yansıtılmalı
5. **Database Migrations:** Schema değişiklikleri migration ile yapılmalı (Supabase MCP)

### Dikkat Edilmesi Gerekenler

- ✅ Mevcut agent'ların çalışmasını bozmamak
- ✅ OpenAI API quota limitlerini göz önünde bulundurmak
- ✅ Cost tracking'i her yeni özellik için implement etmek
- ✅ Logging'i comprehensive yapmak
- ✅ Performance impact'i minimize etmek

---

### İyileştirme Geçmişi (AI_AGENT_PROMPTS.md'den)

#### Versiyon 4.0.0 (2025-01-27)
✅ **Tamamlanan İyileştirmeler:**
1. Error Handler Utility oluşturuldu
2. Base Agent error handling iyileştirildi (retry, backoff, graceful degradation)
3. Tüm agent'larda error handling standardizasyonu
4. Planning Agent prompt iyileştirildi (operatör yükü, teslim tarihi, alternatif planlar)
5. Production Agent prompt iyileştirildi (BOM doğrulama, anomali tespiti, kalite kontrol)
6. Purchase Agent prompt iyileştirildi (tedarikçi skoru, fiyat trend, acil durum)
7. Manager Agent prompt iyileştirildi (risk skorlama, bütçe etki, stratejik uyumluluk)
8. Developer Agent prompt iyileştirildi (code smell, performance, security)

#### Versiyon 3.0.0 (2025-01-27)
✅ Tüm iyileştirmeler implement edildi ve doğrulandı

#### Versiyon 2.0.0 (2025-01-27)
✅ Kapsamlı prompt dokümantasyonu oluşturuldu

---

**Son Güncelleme:** 2025-01-27  
**Roadmap Versiyonu:** 1.0.0  
**Durum:** 📋 Planlama Aşaması - Implementasyona Hazır  
**İlgili Dokümantasyon:** `docs/AI_AGENT_PROMPTS.md`

