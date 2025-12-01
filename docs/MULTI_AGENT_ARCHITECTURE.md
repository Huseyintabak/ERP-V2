# 🤖 ThunderV2 Multi-Agent AI Architecture
## "0 Hata Protokolü" ile Tam Otomasyon Sistemi

**Versiyon:** 2.0.0  
**Tarih:** 2025-11-17  
**Durum:** ✅ **Production Ready - Tüm Implementasyon Tamamlandı**

---

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Mimari Tasarım](#mimari-tasarım)
3. [Agent Tanımları](#agent-tanımları)
4. [0 Hata Protokolü](#0-hata-protokolü)
5. [Agent İletişimi](#agent-iletişimi)
6. [Uygulama Planı](#uygulama-planı)
7. [Kod Örnekleri](#kod-örnekleri)
8. [GPT Model Seçimi ve Stratejisi](#-gpt-model-seçimi-ve-stratejisi)
9. [Güvenlik ve Performans](#güvenlik-ve-performans)
10. [Metrikler ve İzleme](#metrikler-ve-izleme)
11. [Başlangıç Adımları](#-başlangıç-adımları)
12. [Notlar ve Öneriler](#notlar-ve-öneriler)
13. [Eksiklikler ve Implementasyon Rehberi](#-eksiklikler-ve-implementasyon-rehberi)

---

## 🎯 Genel Bakış

### Konsept

ThunderV2 ERP sistemine **Multi-Agent AI Architecture** entegre edilerek, her departmanın kendi uzman AI asistanına sahip olduğu, agent'ların birbirleriyle konuşup kararları birlikte aldığı ve **"0 Hata Protokolü"** ile hiçbir şeyin gözden kaçmadığı bir sistem oluşturulacak.

### Temel Prensipler

1. **Uzmanlaşma:** Her agent kendi departmanında uzman
2. **Kontrol:** Agent'lar birbirini kontrol eder
3. **Consensus:** Kararlar oybirliği ile alınır
4. **Şeffaflık:** Tüm kararlar loglanır ve izlenebilir
5. **Güvenlik:** 5 katmanlı doğrulama sistemi

### Departmanlar ve Agent'lar

| Departman | Agent Adı | Sorumluluklar | Öncelik |
|-----------|-----------|---------------|---------|
| **Satın Alma** | Purchase GPT | Tedarik, fiyat analizi, sipariş | P1 |
| **Planlama** | Planning GPT | Sipariş planlama, BOM, operatör atama | P0 |
| **Depo** | Warehouse GPT | Stok yönetimi, rezervasyon, uyarılar | P0 |
| **Üretim** | Production GPT | Üretim takibi, BOM doğrulama, kalite | P0 |
| **Yönetici** | Manager GPT | Genel yönetim, strateji, onaylar | P2 |
| **Geliştirme** | Developer GPT | Sistem analizi, iyileştirme önerileri, eksik tespiti | P3 |

---

## 🏗️ Mimari Tasarım

### Sistem Mimarisi

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator                        │
│  (Konuşmaları yönetir, consensus oluşturur, protokol çalıştırır)│
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Purchase GPT  │ │ Planning GPT  │ │ Warehouse GPT │
│               │ │               │ │               │
│ - Tedarik     │ │ - Planlama    │ │ - Stok        │
│ - Fiyat       │ │ - BOM         │ │ - Rezervasyon │
│ - Sipariş     │ │ - Operatör    │ │ - Uyarılar    │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                 │                 │
        │    ┌────────────┴────────────┐   │
        │    │                         │   │
        ▼    ▼                         ▼   ▼
┌───────────────┐              ┌───────────────┐
│ Production GPT│              │  Manager GPT  │
│               │              │               │
│ - Üretim      │              │ - Strateji    │
│ - BOM Doğru   │              │ - Onaylar     │
│ - Kalite      │              │ - Analiz      │
└───────┬───────┘              └───────┬───────┘
        │                              │
        │                              │
        └──────────────┬───────────────┘
                       │
                       ▼
            ┌───────────────────┐
            │  Developer GPT     │
            │                     │
            │ - Sistem Analizi    │
            │ - İyileştirme      │
            │ - Eksik Tespiti    │
            │ - Raporlama        │
            └───────────────────┘
        │
        │
        ▼
┌─────────────────────────────────────────┐
│         Event Bus (Real-time)           │
│  - Agent mesajlaşması                   │
│  - Consensus bildirimleri               │
│  - Hata uyarıları                       │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│      Zero Error Protocol Engine          │
│  - 5 Katmanlı Doğrulama                 │
│  - Consensus Mekanizması               │
│  - Database Validation                  │
│  - Human-in-the-Loop                    │
└─────────────────────────────────────────┘
```

### Veri Akışı

```
1. Kullanıcı İsteği
   ↓
2. İlgili Agent Tetiklenir
   ↓
3. Agent Kendi Analizini Yapar
   ↓
4. İlgili Agent'lara Sorar
   ↓
5. Agent'lar Yanıt Verir
   ↓
6. Consensus Oluşturulur
   ↓
7. 0 Hata Protokolü Çalıştırılır
   ↓
8. Database Validation
   ↓
9. Human Approval (gerekirse)
   ↓
10. Karar Uygulanır
```

---

## 👥 Agent Tanımları

### 1. Purchase GPT (Satın Alma Agent)

**Rol:** Satın Alma Departmanı AI Asistanı

**Sorumluluklar:**
- Tedarikçi performans analizi
- Satın alma siparişi optimizasyonu
- Fiyat karşılaştırması ve pazarlık
- Tedarik süresi tahmini
- Stok seviyesine göre otomatik sipariş önerileri
- Alternatif tedarikçi önerileri
- Bütçe kontrolü

**İletişim Kurduğu Agent'lar:**
- **Warehouse GPT:** Stok seviyelerini sorgular
- **Planning GPT:** Üretim planlarını öğrenir
- **Production GPT:** Malzeme ihtiyaçlarını anlar

**Örnek Kararlar:**
```typescript
{
  action: 'create_purchase_order',
  materialId: 'uuid',
  quantity: 100,
  supplier: 'Supplier A',
  price: 1250.00,
  deliveryDate: '2025-02-15',
  reasoning: 'Kritik seviyeye yakın, 2 hafta içinde tükenebilir',
  confidence: 0.95
}
```

**Sistem Prompt:**
```
Sen ThunderV2 ERP sisteminin Satın Alma departmanı AI asistanısın.

Sorumlulukların:
- Tedarikçi performans analizi ve değerlendirme
- Satın alma siparişi oluşturma ve optimizasyonu
- Fiyat karşılaştırması ve en iyi fiyatı bulma
- Tedarik süresi tahmini ve planlama
- Stok seviyesine göre otomatik sipariş önerileri
- Alternatif tedarikçi önerileri
- Bütçe kontrolü ve maliyet optimizasyonu

Diğer departmanlarla iletişim kur:
- Depo GPT: Stok seviyelerini kontrol et, kritik seviyeleri öğren
- Planlama GPT: Üretim planlarını öğren, malzeme ihtiyaçlarını anla
- Üretim GPT: Malzeme tüketim hızını öğren, aciliyet durumunu anla

Karar verirken:
1. Her zaman en ekonomik çözümü bul
2. Tedarik süresini minimize et
3. Kaliteyi koru
4. Alternatifleri değerlendir
5. Bütçe kısıtlarını göz önünde bulundur
```

---

### 2. Planning GPT (Planlama Agent)

**Rol:** Planlama Departmanı AI Asistanı

**Sorumluluklar:**
- Sipariş planlama ve optimizasyonu
- Üretim planı oluşturma
- BOM yönetimi ve doğrulama
- Operatör atama ve kapasite planlama
- Teslim tarihi gerçekçilik kontrolü
- Üretim sıralaması optimizasyonu
- Kaynak tahsisi

**İletişim Kurduğu Agent'lar:**
- **Warehouse GPT:** Stok yeterliliğini kontrol eder
- **Production GPT:** Operatör kapasitesini sorgular
- **Purchase GPT:** Eksik malzemeler için tedarik süresini öğrenir

**Örnek Kararlar:**
```typescript
{
  action: 'approve_order',
  orderId: 'uuid',
  productionPlans: [...],
  operatorAssignments: [...],
  estimatedCompletion: '2025-02-20',
  reasoning: 'Stok yeterli, operatör kapasitesi mevcut, teslim tarihi gerçekçi',
  confidence: 0.98
}
```

**Sistem Prompt:**
```
Sen ThunderV2 ERP sisteminin Planlama departmanı AI asistanısın.

Sorumlulukların:
- Sipariş planlama ve optimizasyonu
- Üretim planı oluşturma ve yönetimi
- BOM (Bill of Materials) yönetimi ve doğrulama
- Operatör atama ve kapasite planlama
- Teslim tarihi gerçekçilik kontrolü
- Üretim sıralaması optimizasyonu
- Kaynak tahsisi ve yük dengeleme

Diğer departmanlarla iletişim kur:
- Depo GPT: Stok yeterliliğini kontrol et, rezervasyon durumunu öğren
- Üretim GPT: Operatör kapasitesini sorgula, mevcut üretimleri öğren
- Satın Alma GPT: Eksik malzemeler için tedarik süresini öğren

Karar verirken:
1. Her zaman gerçekçi planlar oluştur
2. Kaynak kullanımını optimize et
3. Teslim tarihlerini koru
4. Operatör yükünü dengeli dağıt
5. Alternatif planlar öner
```

---

### 3. Warehouse GPT (Depo Agent)

**Rol:** Depo Departmanı AI Asistanı

**Sorumluluklar:**
- Stok yönetimi ve takibi
- Malzeme rezervasyonu
- Stok seviyesi kontrolü ve uyarıları
- Kritik stok tespiti
- Depo optimizasyonu
- Stok hareketleri analizi
- Güvenlik stoku hesaplama

**İletişim Kurduğu Agent'lar:**
- **Planning GPT:** Rezervasyon durumunu bildirir
- **Purchase GPT:** Kritik stokları bildirir, sipariş önerir
- **Production GPT:** Üretim tüketimini takip eder

**Örnek Kararlar:**
```typescript
{
  action: 'reserve_materials',
  materials: [
    { materialId: 'uuid', quantity: 50, reserved: true }
  ],
  reasoning: 'Üretim planı için yeterli stok mevcut, rezervasyon yapıldı',
  confidence: 1.0
}
```

**Sistem Prompt:**
```
Sen ThunderV2 ERP sisteminin Depo departmanı AI asistanısın.

Sorumlulukların:
- Stok yönetimi ve gerçek zamanlı takibi
- Malzeme rezervasyonu ve yönetimi
- Stok seviyesi kontrolü ve kritik uyarıları
- Depo optimizasyonu ve yerleşim planlaması
- Stok hareketleri analizi ve raporlama
- Güvenlik stoku hesaplama ve önerileri
- Stok doğruluğu kontrolü

Diğer departmanlarla iletişim kur:
- Planlama GPT: Rezervasyon durumunu bildir, stok yeterliliğini kontrol et
- Satın Alma GPT: Kritik stokları bildir, acil sipariş öner
- Üretim GPT: Üretim tüketimini takip et, stok güncellemelerini yap

Karar verirken:
1. Her zaman güncel stok bilgisini kullan
2. Kritik seviyeleri erken tespit et
3. Rezervasyonları doğru yönet
4. Stok doğruluğunu koru
5. Depo verimliliğini optimize et
```

---

### 4. Production GPT (Üretim Agent)

**Rol:** Üretim Departmanı AI Asistanı

**Sorumluluklar:**
- Üretim takibi ve izleme
- BOM doğrulama ve kontrol
- Stok tüketimi kontrolü
- Operatör performans analizi
- Kalite kontrol ve anomali tespiti
- Üretim verimliliği optimizasyonu
- Hata tespiti ve önleme

**İletişim Kurduğu Agent'lar:**
- **Warehouse GPT:** Stok yeterliliğini kontrol eder
- **Planning GPT:** Üretim planlarını doğrular
- **Purchase GPT:** Malzeme kalitesi sorunlarını bildirir

**Örnek Kararlar:**
```typescript
{
  action: 'validate_production',
  planId: 'uuid',
  bomValidation: { isValid: true, issues: [] },
  stockValidation: { isAvailable: true, shortages: [] },
  reasoning: 'BOM doğru, stok yeterli, üretim yapılabilir',
  confidence: 0.99
}
```

**Sistem Prompt:**
```
Sen ThunderV2 ERP sisteminin Üretim departmanı AI asistanısın.

Sorumlulukların:
- Üretim takibi ve gerçek zamanlı izleme
- BOM doğrulama ve hesaplama kontrolü
- Stok tüketimi kontrolü ve doğrulama
- Operatör performans analizi ve değerlendirme
- Kalite kontrol ve anomali tespiti
- Üretim verimliliği optimizasyonu
- Hata tespiti ve önleme

Diğer departmanlarla iletişim kur:
- Depo GPT: Stok yeterliliğini kontrol et, tüketim kayıtlarını yap
- Planlama GPT: Üretim planlarını doğrula, operatör atamalarını kontrol et
- Satın Alma GPT: Malzeme kalitesi sorunlarını bildir

Karar verirken:
1. Her zaman BOM doğruluğunu kontrol et
2. Stok tüketimini doğru hesapla
3. Anomalileri erken tespit et
4. Kaliteyi koru
5. Verimliliği optimize et
```

---

### 5. Manager GPT (Yönetici Agent)

**Rol:** Yönetim Departmanı AI Asistanı

**Sorumluluklar:**
- Stratejik karar desteği
- Kritik işlemler için onay
- Performans analizi ve raporlama
- Risk değerlendirmesi
- Sistem geneli optimizasyon önerileri
- Departmanlar arası koordinasyon

**İletişim Kurduğu Agent'lar:**
- **Tüm Agent'lar:** Genel yönetim ve koordinasyon

**Örnek Kararlar:**
```typescript
{
  action: 'approve_critical_operation',
  operation: 'large_purchase_order',
  amount: 50000,
  reasoning: 'Bütçe yeterli, tedarikçi güvenilir, iş planına uygun',
  confidence: 0.92
}
```

---

### 6. Developer GPT (Geliştirme Agent)

**Rol:** Geliştirme Departmanı AI Asistanı

**Sorumluluklar:**
- Sistem analizi ve performans değerlendirmesi
- Kod kalitesi ve mimari analizi
- Eksik özellik tespiti ve önerileri
- İyileştirme önerileri ve optimizasyon
- Hata pattern'leri ve bug tespiti
- Güvenlik açıkları analizi
- Teknik borç (technical debt) tespiti
- Geliştiriciye detaylı raporlama
- Önceliklendirilmiş iyileştirme listesi
- Best practice önerileri

**İletişim Kurduğu Agent'lar:**
- **Tüm Agent'lar:** Sistem geneli analiz için veri toplar
- **Manager GPT:** Stratejik iyileştirme önerileri sunar
- **Planning GPT:** Planlama süreçlerindeki eksikleri tespit eder
- **Warehouse GPT:** Stok yönetimi optimizasyonları önerir
- **Production GPT:** Üretim süreçlerindeki iyileştirmeleri belirler
- **Purchase GPT:** Satın alma süreçlerindeki eksikleri analiz eder

**Örnek Kararlar:**
```typescript
{
  action: 'generate_improvement_report',
  reportType: 'system_analysis',
  findings: [
    {
      category: 'performance',
      severity: 'high',
      issue: 'Database query optimization needed',
      location: 'app/api/orders/route.ts:45',
      impact: 'Response time 2.5s → should be <500ms',
      recommendation: 'Add index on orders.delivery_date, use pagination',
      estimatedEffort: '4 hours',
      priority: 'P1'
    },
    {
      category: 'feature',
      severity: 'medium',
      issue: 'Missing bulk order cancellation',
      location: 'app/api/orders/',
      impact: 'Users must cancel orders one by one',
      recommendation: 'Add bulk cancellation endpoint with transaction support',
      estimatedEffort: '6 hours',
      priority: 'P2'
    },
    {
      category: 'security',
      severity: 'high',
      issue: 'SQL injection risk in dynamic queries',
      location: 'app/api/reports/route.ts:120',
      impact: 'Potential data breach',
      recommendation: 'Use parameterized queries, validate all inputs',
      estimatedEffort: '2 hours',
      priority: 'P0'
    }
  ],
  summary: {
    totalIssues: 15,
    critical: 3,
    high: 5,
    medium: 4,
    low: 3,
    estimatedTotalEffort: '45 hours',
    recommendedSprintPlan: [
      { sprint: 1, tasks: ['P0', 'P1'], effort: '20 hours' },
      { sprint: 2, tasks: ['P2'], effort: '25 hours' }
    ]
  },
  reasoning: 'Sistem analizi tamamlandı. 15 iyileştirme noktası tespit edildi. 3 kritik güvenlik sorunu acil çözülmeli.',
  confidence: 0.95
}
```

**Sistem Prompt:**
```
Sen ThunderV2 ERP sisteminin Geliştirme departmanı AI asistanısın.

Sorumlulukların:
- Sistem geneli analiz ve performans değerlendirmesi
- Kod kalitesi, mimari ve best practice analizi
- Eksik özellik tespiti ve önceliklendirme
- İyileştirme önerileri ve optimizasyon stratejileri
- Hata pattern'leri ve bug tespiti
- Güvenlik açıkları ve risk analizi
- Teknik borç (technical debt) tespiti ve önceliklendirme
- Geliştiriciye detaylı, uygulanabilir raporlar sunma
- Önceliklendirilmiş iyileştirme roadmap'i oluşturma
- Kod review ve refactoring önerileri

Diğer departmanlarla iletişim kur:
- Tüm Agent'lar: Sistem geneli analiz için veri topla, süreçleri analiz et
- Manager GPT: Stratejik iyileştirme önerileri sun, roadmap öner
- Planning GPT: Planlama süreçlerindeki eksikleri tespit et, otomasyon öner
- Warehouse GPT: Stok yönetimi optimizasyonları öner, performans iyileştirmeleri belirle
- Production GPT: Üretim süreçlerindeki iyileştirmeleri analiz et, verimlilik öner
- Purchase GPT: Satın alma süreçlerindeki eksikleri tespit et, entegrasyon öner

Analiz yaparken:
1. Kod tabanını tarayarak pattern'leri tespit et
2. Performance bottleneck'leri belirle
3. Güvenlik açıklarını tespit et
4. Eksik özellikleri ve kullanıcı ihtiyaçlarını analiz et
5. Teknik borcu ölç ve önceliklendir
6. Best practice'lere uygunluğu kontrol et
7. Test coverage ve kalite metriklerini değerlendir
8. API endpoint'lerinin optimizasyon ihtiyacını analiz et
9. Database query performansını değerlendir
10. Frontend/Backend entegrasyon sorunlarını tespit et

Raporlama formatı:
- Kategori: performance, security, feature, bug, technical_debt
- Severity: critical, high, medium, low
- Lokasyon: Dosya yolu ve satır numarası
- Etki: Sorunun sistem üzerindeki etkisi
- Öneri: Detaylı çözüm önerisi
- Tahmini Süre: İyileştirme için gereken zaman
- Öncelik: P0 (acil), P1 (yüksek), P2 (orta), P3 (düşük)

Karar verirken:
1. Her zaman önceliklendirme yap (P0 → P3)
2. Etki analizi yap (kullanıcı etkisi, sistem etkisi)
3. Tahmini süre ve effort hesapla
4. Sprint planlaması öner
5. ROI (Return on Investment) hesapla
6. Risk değerlendirmesi yap
7. Uygulanabilir çözümler öner
8. Best practice'lere uygun öneriler sun
```

**Analiz Kategorileri:**

1. **Performance (Performans)**
   - Yavaş API endpoint'leri
   - Optimize edilmemiş database query'leri
   - N+1 query problemleri
   - Büyük bundle size'lar
   - Yavaş sayfa yükleme süreleri

2. **Security (Güvenlik)**
   - SQL injection riskleri
   - XSS (Cross-Site Scripting) açıkları
   - Authentication/Authorization eksiklikleri
   - Sensitive data exposure
   - Rate limiting eksiklikleri

3. **Feature (Özellik)**
   - Eksik CRUD operasyonları
   - Eksik validasyonlar
   - Eksik error handling
   - Eksik logging
   - Kullanıcı deneyimi iyileştirmeleri

4. **Bug (Hata)**
   - Logic hataları
   - Edge case'ler
   - Race condition'lar
   - Memory leak'ler
   - Type safety sorunları

5. **Technical Debt (Teknik Borç)**
   - Eski kod pattern'leri
   - Duplicate code
   - Complex functions
   - Missing tests
   - Outdated dependencies

**Rapor Formatı:**
```typescript
interface DeveloperReport {
  reportId: string;
  generatedAt: Date;
  analysisScope: {
    codebase: string[];
    timeRange: { from: Date; to: Date };
    focusAreas: string[];
  };
  findings: Finding[];
  summary: {
    totalIssues: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
    byPriority: Record<string, number>;
    estimatedTotalEffort: string;
  };
  recommendations: {
    immediate: Finding[]; // P0
    shortTerm: Finding[]; // P1
    mediumTerm: Finding[]; // P2
    longTerm: Finding[]; // P3
  };
  sprintPlan: SprintPlan[];
  metrics: {
    codeQuality: number; // 0-100
    testCoverage: number; // 0-100
    performanceScore: number; // 0-100
    securityScore: number; // 0-100
    technicalDebtRatio: number; // 0-100
  };
}

interface Finding {
  id: string;
  category: 'performance' | 'security' | 'feature' | 'bug' | 'technical_debt';
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  title: string;
  description: string;
  location: {
    file: string;
    line?: number;
    function?: string;
  };
  impact: string;
  currentState: string;
  recommendation: string;
  codeExample?: {
    before: string;
    after: string;
  };
  estimatedEffort: string;
  relatedFindings?: string[]; // Diğer bulgularla ilişki
  tags: string[];
}
```

**Örnek Senaryo:**
```
Developer GPT günlük analiz yapar:

1. Kod tabanını tarar
2. Tüm agent'ların loglarını analiz eder
3. Database query'lerini inceler
4. API response time'larını kontrol eder
5. Error log'larını analiz eder

Bulduğu sorunlar:
- Planning GPT'in order approval süreci 2.5s sürüyor (hedef: <500ms)
- Warehouse GPT'in stok kontrolü N+1 query problemi var
- Production GPT'in BOM validation'ı bazı edge case'leri kaçırıyor
- Purchase GPT'in fiyat karşılaştırması cache'lenmiyor

Rapor oluşturur:
- 4 kritik performans sorunu
- 2 güvenlik uyarısı
- 3 eksik özellik
- Toplam 9 iyileştirme önerisi
- Tahmini süre: 32 saat
- Önerilen sprint planı

Geliştiriciye sunar:
"Bu hafta için öncelikli iyileştirmeler:
1. Order approval query optimizasyonu (4 saat) - P0
2. Stok kontrolü N+1 fix (6 saat) - P0
3. BOM validation edge case'leri (8 saat) - P1
..."
```

---

## 🛡️ 0 Hata Protokolü

### 5 Katmanlı Doğrulama Sistemi

#### KATMAN 1: Agent Self-Validation
**Amaç:** Her agent kendi kararını doğrular

**Kontrol Noktaları:**
- Tüm veriler doğru mu?
- Hesaplamalar doğru mu?
- Mantık hatası var mı?
- Eksik bilgi var mı?
- Confidence skoru yeterli mi? (>0.95)

**Başarı Kriteri:**
- Confidence > 0.95
- Hiçbir mantık hatası yok
- Tüm veriler mevcut

---

#### KATMAN 2: Cross-Agent Validation
**Amaç:** İlgili agent'lar birbirini kontrol eder

**Kontrol Noktaları:**
- Bu karar diğer departmanları etkiler mi?
- Diğer agent'ların verileriyle uyumlu mu?
- Potansiyel çatışmalar var mı?
- Eksik koordinasyon var mı?

**Başarı Kriteri:**
- Tüm ilgili agent'lar onaylıyor
- Hiçbir çatışma yok
- Koordinasyon tam

**Örnek Senaryo:**
```
Planning GPT: "Bu siparişi onaylıyorum"
  ↓
Warehouse GPT: "Stok yeterli mi?" → Kontrol eder → "Evet, yeterli"
  ↓
Production GPT: "Kapasite var mı?" → Kontrol eder → "Evet, var"
  ↓
Purchase GPT: "Eksik malzeme var mı?" → Kontrol eder → "Hayır, yok"
  ↓
Tüm agent'lar onaylıyor → KATMAN 2 GEÇTİ
```

---

#### KATMAN 3: Consensus Building
**Amaç:** Tüm agent'lar fikir birliği oluşturur

**Mekanizma:**
- Her agent oy verir: `approve` | `reject` | `conditional`
- Consensus hesaplanır
- Çatışmalar çözülür

**Başarı Kriteri:**
- **%100 onay** (ideal)
- **%90+ onay** (koşulsuz oylar)
- Hiçbir `reject` oyu yok
- `conditional` oylar için koşullar karşılanmış

**Voting Sistemi:**
```typescript
interface Vote {
  agent: string;
  vote: 'approve' | 'reject' | 'conditional';
  confidence: number; // 0-1
  reasoning: string;
  conditions?: string[]; // conditional için
}

interface ConsensusResult {
  isConsensus: boolean;
  approvalRate: number; // 0-1
  totalVotes: number;
  approveVotes: number;
  rejectVotes: number;
  conditionalVotes: number;
  conditions: string[];
  agentOpinions: AgentOpinion[];
}
```

**Örnek Senaryo:**
```
Order Approval için:
- Planning GPT: approve (confidence: 0.98)
- Warehouse GPT: approve (confidence: 1.0)
- Production GPT: conditional (confidence: 0.95, condition: "Operatör ataması yapılsın")
- Purchase GPT: approve (confidence: 0.92)

Sonuç:
- Approval Rate: 75% (3/4 approve, 1 conditional)
- Consensus: false (çünkü %100 değil)
- Action: Koşul karşılanmalı (operatör ataması)
```

---

#### KATMAN 4: Database Integrity Check
**Amaç:** Veritabanı seviyesinde doğrulama

**Kontrol Noktaları:**
- Stok yeterliliği (gerçek zamanlı)
- BOM bütünlüğü
- Operatör müsaitliği
- Tarih kısıtları
- İş kuralları (business rules)
- Transaction güvenliği

**Başarı Kriteri:**
- Tüm kontroller geçti
- Hiçbir constraint ihlali yok
- Transaction güvenli

**Kontroller:**
```typescript
interface DatabaseChecks {
  stockAvailability: boolean;
  bomIntegrity: boolean;
  operatorAvailability: boolean;
  dateConstraints: boolean;
  businessRules: boolean;
}

// Örnek kontroller
async function checkStockAvailability(materials, supabase) {
  for (const material of materials) {
    const { data } = await supabase
      .from('raw_materials')
      .select('quantity, reserved_quantity')
      .eq('id', material.id)
      .single();
    
    const available = data.quantity - data.reserved_quantity;
    if (available < material.needed) {
      return { isAvailable: false, shortage: material.needed - available };
    }
  }
  return { isAvailable: true };
}
```

---

#### KATMAN 5: Human-in-the-Loop
**Amaç:** Kritik işlemler için insan onayı

**Onay Seviyeleri:**

| Severity | Requires Approval | Approver Role | Auto-Approval |
|----------|------------------|---------------|---------------|
| **critical** | ✅ Evet | Yönetici | ❌ Hayır |
| **high** | ✅ Evet | Planlama | ⚠️ Opsiyonel |
| **medium** | ⚠️ Opsiyonel | Planlama | ✅ Evet (güvenliyse) |
| **low** | ❌ Hayır | - | ✅ Evet |

**Kritik İşlemler:**
- Büyük satın alma siparişleri (>10.000 TL)
- Stok silme işlemleri
- Üretim planı iptali
- Operatör atama değişiklikleri
- Sistem ayarları değişiklikleri

**Onay Akışı:**
```
1. Agent kararı → Severity belirlenir
2. Severity = critical → Human approval required
3. Bildirim gönderilir (yöneticiye)
4. Yönetici onaylar/reddeder
5. Sonuç agent'a bildirilir
6. İşlem uygulanır/iptal edilir
```

---

### Protokol Çalıştırma Akışı

```typescript
async function executeZeroErrorProtocol(decision, agents, supabase, severity) {
  const results = {
    decision,
    layers: {},
    finalDecision: 'rejected',
    errors: [],
    warnings: []
  };
  
  // KATMAN 1: Self-Validation
  const layer1 = await layer1_SelfValidation(decision.agent, decision);
  if (!layer1.isValid) {
    results.errors.push('Layer 1 failed');
    return results;
  }
  
  // KATMAN 2: Cross-Validation
  const layer2 = await layer2_CrossValidation(decision, relatedAgents);
  if (!layer2.every(v => v.isValid)) {
    results.errors.push('Layer 2 failed');
    return results;
  }
  
  // KATMAN 3: Consensus
  const layer3 = await layer3_Consensus(decision, agents);
  if (!layer3.isConsensus) {
    results.errors.push('Layer 3 failed');
    return results;
  }
  
  // KATMAN 4: Database Validation
  const layer4 = await layer4_DatabaseValidation(decision, supabase);
  if (!layer4.allChecksPassed) {
    results.errors.push('Layer 4 failed');
    return results;
  }
  
  // KATMAN 5: Human Approval
  const layer5 = await layer5_HumanApproval(decision, severity);
  if (layer5.requiresApproval && layer5.status === 'pending') {
    results.finalDecision = 'pending_approval';
    return results;
  }
  
  // TÜM KATMANLAR GEÇTİ
  results.finalDecision = 'approved';
  return results;
}
```

---

## 💬 Agent İletişimi

### Mesajlaşma Protokolü

**Mesaj Tipleri:**
1. **Query:** Bilgi sorgulama
2. **Request:** İşlem talebi
3. **Response:** Yanıt
4. **Notification:** Bildirim
5. **Alert:** Uyarı

**Mesaj Formatı:**
```typescript
interface AgentMessage {
  id: string;
  from: string; // Agent adı
  to: string; // Agent adı veya 'broadcast'
  type: 'query' | 'request' | 'response' | 'notification' | 'alert';
  content: string;
  data?: any;
  context?: {
    conversationId?: string;
    previousMessages?: AgentMessage[];
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: Date;
}
```

### Event Bus Sistemi

```typescript
class AgentEventBus {
  private events: EventEmitter;
  
  // Agent mesajı gönder
  async sendMessage(from: string, to: string, message: AgentMessage) {
    this.events.emit('agent:message', { from, to, message });
    
    const targetAgent = this.getAgent(to);
    const response = await targetAgent.processMessage(message);
    
    this.events.emit('agent:response', { from: to, to: from, response });
    return response;
  }
  
  // Broadcast (tüm agent'lara)
  async broadcast(from: string, message: AgentMessage) {
    const agents = this.getAllAgents().filter(a => a.name !== from);
    const responses = await Promise.all(
      agents.map(agent => this.sendMessage(from, agent.name, message))
    );
    return responses;
  }
  
  // Subscribe (dinleme)
  on(event: string, callback: Function) {
    this.events.on(event, callback);
  }
}
```

### Konuşma Senaryoları

#### Senaryo 1: Sipariş Onayı

```
1. Planning GPT başlatır:
   "Bu siparişi onaylamak istiyorum. Stok yeterli mi?"

2. Warehouse GPT yanıtlar:
   "Stok kontrolü yapıyorum... Evet, tüm malzemeler mevcut."

3. Planning GPT sorar:
   "Üretim kapasitesi var mı?"

4. Production GPT yanıtlar:
   "Operatör kapasitesi mevcut. Üretim yapılabilir."

5. Planning GPT sorar:
   "Eksik malzeme var mı? Tedarik süresi ne kadar?"

6. Purchase GPT yanıtlar:
   "Tüm malzemeler mevcut. Eksik yok."

7. Consensus oluşur:
   - Planning: approve
   - Warehouse: approve
   - Production: approve
   - Purchase: approve
   
8. 0 Hata Protokolü çalıştırılır
9. Sipariş onaylanır
```

#### Senaryo 2: Kritik Stok Uyarısı

```
1. Warehouse GPT tespit eder:
   "Malzeme X kritik seviyede! (5 kg, kritik: 10 kg)"

2. Warehouse GPT Purchase GPT'e sorar:
   "Acil sipariş gerekli mi? Ne kadar?"

3. Purchase GPT analiz eder:
   "Günlük tüketim: 2 kg/gün. 3 gün içinde tükenir. 
    Tedarik süresi: 5 gün. Evet, acil sipariş gerekli. 
    Önerilen miktar: 50 kg."

4. Purchase GPT Planning GPT'e sorar:
   "Yaklaşan üretim planları var mı? Etkilenir mi?"

5. Planning GPT kontrol eder:
   "2 plan var. Malzeme X kullanılıyor. 
    Etkilenebilir. Acil sipariş önerilir."

6. Consensus:
   - Warehouse: approve (acil sipariş)
   - Purchase: approve (50 kg sipariş)
   - Planning: approve (üretim planları korunur)

7. Purchase order otomatik oluşturulur
```

#### Senaryo 3: Developer GPT Sistem Analizi

```
1. Developer GPT günlük analiz başlatır:
   "Sistem analizi yapıyorum. Tüm agent'ların performansını kontrol ediyorum."

2. Developer GPT Planning GPT'e sorar:
   "Order approval sürecinde performans sorunları var mı?"

3. Planning GPT yanıtlar:
   "Evet, bazı query'ler yavaş. 2.5s sürüyor, hedef <500ms."

4. Developer GPT Warehouse GPT'e sorar:
   "Stok kontrolü süreçlerinde optimizasyon ihtiyacı var mı?"

5. Warehouse GPT yanıtlar:
   "N+1 query problemi var. Bulk check yapılmalı."

6. Developer GPT Production GPT'e sorar:
   "BOM validation'da eksikler var mı?"

7. Production GPT yanıtlar:
   "Bazı edge case'ler kaçırılıyor. Validation logic güçlendirilmeli."

8. Developer GPT Purchase GPT'e sorar:
   "Fiyat karşılaştırması cache'leniyor mu?"

9. Purchase GPT yanıtlar:
   "Hayır, her seferinde API çağrısı yapılıyor. Cache eklenmeli."

10. Developer GPT analiz eder ve rapor oluşturur:
    "15 iyileştirme noktası tespit edildi:
     - 4 kritik performans sorunu (P0)
     - 2 güvenlik uyarısı (P0)
     - 3 eksik özellik (P1)
     - 6 teknik borç (P2)
     
     Önerilen sprint planı:
     Sprint 1: P0 sorunları (20 saat)
     Sprint 2: P1 özellikler (15 saat)"

11. Geliştiriciye rapor sunulur
```

---

## 📅 Uygulama Planı

### Faz 1: Temel Altyapı (Hafta 1-2)

**Hedefler:**
- BaseAgent sınıfı oluştur
- AgentOrchestrator implementasyonu
- ZeroErrorProtocol temel yapısı
- Event Bus sistemi
- İlk agent: Planning GPT

**Görevler:**
- [ ] `lib/ai/agents/base-agent.ts` oluştur
- [ ] `lib/ai/orchestrator.ts` oluştur
- [ ] `lib/ai/zero-error-protocol.ts` oluştur
- [ ] `lib/ai/event-bus.ts` oluştur
- [ ] `lib/ai/agents/planning-agent.ts` oluştur
- [ ] Test senaryoları yaz

**Kritik Başarı Faktörleri:**
- Agent'lar birbirine mesaj gönderebilmeli
- Orchestrator çalışmalı
- Temel doğrulama çalışmalı

---

### Faz 2: Agent'ları Ekle (Hafta 3-4)

**Hedefler:**
- Warehouse GPT
- Production GPT
- Purchase GPT
- Agent'lar arası iletişim testi

**Görevler:**
- [ ] `lib/ai/agents/warehouse-agent.ts` oluştur
- [ ] `lib/ai/agents/production-agent.ts` oluştur
- [ ] `lib/ai/agents/purchase-agent.ts` oluştur
- [ ] `lib/ai/agents/developer-agent.ts` oluştur
- [ ] Agent'lar arası iletişim testleri
- [ ] Consensus mekanizması testleri

**Kritik Başarı Faktörleri:**
- Tüm agent'lar çalışmalı
- Agent'lar birbirine soru sorabilmeli
- Yanıtlar doğru olmalı

---

### Faz 3: 0 Hata Protokolü (Hafta 5-6)

**Hedefler:**
- 5 katmanlı doğrulama sistemi
- Consensus mekanizması
- Database validation
- Human-in-the-loop

**Görevler:**
- [ ] Layer 1: Self-Validation implementasyonu
- [ ] Layer 2: Cross-Validation implementasyonu
- [ ] Layer 3: Consensus Building implementasyonu
- [ ] Layer 4: Database Validation implementasyonu
- [ ] Layer 5: Human Approval implementasyonu
- [ ] Protokol testleri

**Kritik Başarı Faktörleri:**
- Tüm katmanlar çalışmalı
- Hatalar yakalanmalı
- Consensus doğru çalışmalı

---

### Faz 4: Entegrasyon (Hafta 7-8)

**Hedefler:**
- Mevcut API'lere entegrasyon
- Order approval akışı
- Production log akışı
- Stock management akışı

**Görevler:**
- [ ] `app/api/orders/[id]/approve/route.ts` entegrasyonu
- [ ] `app/api/production/log/route.ts` entegrasyonu
- [ ] `app/api/stock/*` entegrasyonu
- [ ] Frontend bildirimleri
- [ ] Loglama ve monitoring

**Kritik Başarı Faktörleri:**
- Mevcut işlemler bozulmamalı
- AI kararları doğru olmalı
- Performans kabul edilebilir olmalı

---

### Faz 5: Test ve Optimizasyon (Hafta 9-10)

**Hedefler:**
- Kapsamlı test senaryoları
- Performans optimizasyonu
- Maliyet optimizasyonu
- Dokümantasyon

**Görevler:**
- [ ] Unit testler
- [ ] Integration testler
- [ ] End-to-end testler
- [ ] Performans testleri
- [ ] Maliyet analizi
- [ ] Dokümantasyon güncellemesi

**Kritik Başarı Faktörleri:**
- Test coverage >80%
- Response time <2s
- API maliyeti kabul edilebilir
- Dokümantasyon tam

---

## 💻 Kod Örnekleri

### Base Agent Sınıfı

```typescript
// lib/ai/agents/base-agent.ts
import OpenAI from 'openai';

export abstract class BaseAgent {
  protected name: string;
  protected role: string;
  protected responsibilities: string[];
  protected gpt5Client: OpenAI;
  protected systemPrompt: string;
  
  constructor(
    name: string,
    role: string,
    responsibilities: string[],
    systemPrompt: string
  ) {
    this.name = name;
    this.role = role;
    this.responsibilities = responsibilities;
    this.systemPrompt = systemPrompt;
    this.gpt5Client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: 'https://api.openai.com/v1'
    });
  }
  
  /**
   * İstek işle
   */
  abstract async processRequest(
    request: AgentRequest
  ): Promise<AgentResponse>;
  
  /**
   * Diğer agent'larla doğrulama
   */
  abstract async validateWithOtherAgents(
    data: any
  ): Promise<ValidationResult>;
  
  /**
   * Oylama (consensus için)
   */
  async vote(decision: AgentDecision): Promise<Vote> {
    const prompt = `
      ${this.systemPrompt}
      
      Bu kararı değerlendir ve oy ver:
      ${JSON.stringify(decision, null, 2)}
      
      Oy seçenekleri:
      - approve: Tamamen onaylıyorum
      - reject: Reddediyorum (nedenini açıkla)
      - conditional: Koşullu onaylıyorum (koşulları belirt)
    `;
    
    const response = await this.gpt5Client.chat.completions.create({
      model: this.model || 'gpt-4o',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
    });
    
    return this.parseVote(response);
  }
  
  /**
   * Diğer agent'a soru sor
   */
  async askAgent(
    agentName: string,
    question: string,
    context?: any
  ): Promise<AgentResponse> {
    // Event bus üzerinden mesaj gönder
    const eventBus = AgentEventBus.getInstance();
    return await eventBus.sendMessage(this.name, agentName, {
      id: generateId(),
      from: this.name,
      to: agentName,
      type: 'query',
      content: question,
      context,
      timestamp: new Date()
    });
  }
}
```

### Planning Agent Örneği

```typescript
// lib/ai/agents/planning-agent.ts
import { BaseAgent } from './base-agent';

export class PlanningAgent extends BaseAgent {
  constructor() {
    super(
      'Planlama GPT',
      'planning',
      [
        'Sipariş planlama',
        'Üretim planı oluşturma',
        'BOM yönetimi',
        'Operatör atama',
        'Kapasite planlama'
      ],
      `
        Sen ThunderV2 ERP sisteminin Planlama departmanı AI asistanısın.
        
        Sorumlulukların:
        - Sipariş planlama ve optimizasyonu
        - Üretim planı oluşturma ve yönetimi
        - BOM (Bill of Materials) yönetimi ve doğrulama
        - Operatör atama ve kapasite planlama
        - Teslim tarihi gerçekçilik kontrolü
        
        Diğer departmanlarla iletişim kur:
        - Depo GPT: Stok yeterliliğini kontrol et
        - Üretim GPT: Operatör kapasitesini sorgula
        - Satın Alma GPT: Eksik malzemeler için tedarik süresini öğren
        
        Karar verirken:
        1. Her zaman gerçekçi planlar oluştur
        2. Kaynak kullanımını optimize et
        3. Teslim tarihlerini koru
        4. Operatör yükünü dengeli dağıt
      `
    );
  }
  
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const response = await this.gpt5Client.chat.completions.create({
      model: this.model || 'gpt-4o',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: request.prompt }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'check_stock_availability',
            description: 'Depo GPT\'den stok seviyelerini sorgula',
            parameters: {
              type: 'object',
              properties: {
                materials: {
                  type: 'array',
                  items: { type: 'object' }
                }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'check_production_capacity',
            description: 'Üretim GPT\'den kapasite kontrolü yap',
            parameters: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                quantity: { type: 'number' }
              }
            }
          }
        }
      ]
    });
    
    return this.parseResponse(response);
  }
  
  async validateWithOtherAgents(orderData: any): Promise<ValidationResult> {
    // Warehouse GPT'e sor
    const warehouseCheck = await this.askAgent('warehouse', {
      prompt: `Bu üretim planı için gerekli malzemeler stokta mevcut mu?`,
      context: { materials: orderData.required_materials }
    });
    
    // Production GPT'e sor
    const productionCheck = await this.askAgent('production', {
      prompt: `Bu plan için operatör kapasitesi var mı?`,
      context: { date: orderData.delivery_date, quantity: orderData.quantity }
    });
    
    return {
      isValid: warehouseCheck.isAvailable && productionCheck.hasCapacity,
      issues: [...warehouseCheck.issues, ...productionCheck.issues],
      recommendations: [
        ...warehouseCheck.recommendations,
        ...productionCheck.recommendations
      ]
    };
  }
}
```

### Developer Agent Örneği

```typescript
// lib/ai/agents/developer-agent.ts
import { BaseAgent } from './base-agent';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

export class DeveloperAgent extends BaseAgent {
  private codebasePath: string;
  private analysisCache: Map<string, any>;
  
  constructor() {
    super(
      'Developer GPT',
      'developer',
      [
        'Sistem analizi',
        'Kod kalitesi değerlendirmesi',
        'Performans optimizasyonu',
        'Güvenlik analizi',
        'Eksik özellik tespiti',
        'Teknik borç analizi',
        'İyileştirme önerileri',
        'Raporlama'
      ],
      `
        Sen ThunderV2 ERP sisteminin Geliştirme departmanı AI asistanısın.
        
        Sorumlulukların:
        - Sistem geneli analiz ve performans değerlendirmesi
        - Kod kalitesi, mimari ve best practice analizi
        - Eksik özellik tespiti ve önceliklendirme
        - İyileştirme önerileri ve optimizasyon stratejileri
        - Hata pattern'leri ve bug tespiti
        - Güvenlik açıkları ve risk analizi
        - Teknik borç tespiti ve önceliklendirme
        - Geliştiriciye detaylı, uygulanabilir raporlar sunma
        
        Analiz yaparken:
        1. Kod tabanını tarayarak pattern'leri tespit et
        2. Performance bottleneck'leri belirle
        3. Güvenlik açıklarını tespit et
        4. Eksik özellikleri analiz et
        5. Teknik borcu ölç ve önceliklendir
        6. Best practice'lere uygunluğu kontrol et
        7. Test coverage ve kalite metriklerini değerlendir
      `
    );
    this.codebasePath = process.cwd();
    this.analysisCache = new Map();
  }
  
  /**
   * Sistem analizi yap ve rapor oluştur
   */
  async analyzeSystem(
    scope?: {
      directories?: string[];
      filePatterns?: string[];
      focusAreas?: string[];
    }
  ): Promise<DeveloperReport> {
    // 1. Kod tabanını tara
    const codebase = await this.scanCodebase(scope);
    
    // 2. Tüm agent'ların loglarını analiz et
    const agentLogs = await this.analyzeAgentLogs();
    
    // 3. Database query'lerini analiz et
    const queryAnalysis = await this.analyzeDatabaseQueries();
    
    // 4. API endpoint'lerini analiz et
    const apiAnalysis = await this.analyzeAPIEndpoints();
    
    // 5. Error log'larını analiz et
    const errorAnalysis = await this.analyzeErrorLogs();
    
    // 6. GPT-5.0 ile derinlemesine analiz
    const prompt = `
      Bu sistem analizi sonuçlarını değerlendir ve iyileştirme önerileri oluştur:
      
      Kod Tabanı: ${JSON.stringify(codebase.summary)}
      Agent Logları: ${JSON.stringify(agentLogs.summary)}
      Database Query'leri: ${JSON.stringify(queryAnalysis.summary)}
      API Endpoint'leri: ${JSON.stringify(apiAnalysis.summary)}
      Hata Logları: ${JSON.stringify(errorAnalysis.summary)}
      
      Analiz et:
      1. Performance sorunları
      2. Güvenlik açıkları
      3. Eksik özellikler
      4. Bug pattern'leri
      5. Teknik borç
      
      Her bulgu için:
      - Kategori belirle
      - Severity belirle (critical, high, medium, low)
      - Öncelik belirle (P0, P1, P2, P3)
      - Detaylı öneri sun
      - Tahmini süre hesapla
    `;
    
    const analysis = await this.gpt5Client.chat.completions.create({
      model: this.model || 'gpt-4o',
      messages: [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2 // Daha deterministik
    });
    
    const findings = this.parseFindings(analysis);
    
    // 7. Rapor oluştur
    return {
      reportId: generateId(),
      generatedAt: new Date(),
      analysisScope: scope || { codebase: ['all'] },
      findings,
      summary: this.calculateSummary(findings),
      recommendations: this.prioritizeRecommendations(findings),
      sprintPlan: this.createSprintPlan(findings),
      metrics: await this.calculateMetrics()
    };
  }
  
  /**
   * Kod tabanını tara
   */
  private async scanCodebase(scope?: any): Promise<CodebaseAnalysis> {
    const files: string[] = [];
    const directories = scope?.directories || ['app', 'lib', 'components'];
    
    for (const dir of directories) {
      const dirFiles = await this.getAllFiles(join(this.codebasePath, dir));
      files.push(...dirFiles);
    }
    
    // Dosyaları analiz et
    const analysis = {
      totalFiles: files.length,
      totalLines: 0,
      byType: {} as Record<string, number>,
      complexFunctions: [] as any[],
      duplicateCode: [] as any[],
      missingTests: [] as string[]
    };
    
    for (const file of files) {
      const content = await readFile(file, 'utf-8');
      const fileAnalysis = await this.analyzeFile(file, content);
      
      analysis.totalLines += fileAnalysis.lines;
      analysis.byType[fileAnalysis.type] = (analysis.byType[fileAnalysis.type] || 0) + 1;
      
      if (fileAnalysis.complexity > 10) {
        analysis.complexFunctions.push({
          file,
          function: fileAnalysis.function,
          complexity: fileAnalysis.complexity
        });
      }
    }
    
    return analysis;
  }
  
  /**
   * Agent loglarını analiz et
   */
  private async analyzeAgentLogs(): Promise<AgentLogAnalysis> {
    // Tüm agent'ların loglarını topla
    const allAgents = ['planning', 'warehouse', 'production', 'purchase'];
    const logs: any[] = [];
    
    for (const agentName of allAgents) {
      const agentLogs = await this.getAgentLogs(agentName);
      logs.push(...agentLogs);
    }
    
    // Pattern'leri tespit et
    const patterns = {
      slowResponses: logs.filter(l => l.responseTime > 2000),
      errors: logs.filter(l => l.error),
      highConfidence: logs.filter(l => l.confidence > 0.95),
      lowConfidence: logs.filter(l => l.confidence < 0.7)
    };
    
    return {
      totalLogs: logs.length,
      patterns,
      recommendations: this.generateLogRecommendations(patterns)
    };
  }
  
  /**
   * Database query'lerini analiz et
   */
  private async analyzeDatabaseQueries(): Promise<QueryAnalysis> {
    // Supabase log'larından query'leri çek
    const queries = await this.getDatabaseQueries();
    
    const analysis = {
      totalQueries: queries.length,
      slowQueries: queries.filter(q => q.duration > 1000),
      nPlusOneQueries: this.detectNPlusOne(queries),
      missingIndexes: this.detectMissingIndexes(queries),
      recommendations: [] as string[]
    };
    
    // Öneriler oluştur
    if (analysis.slowQueries.length > 0) {
      analysis.recommendations.push(
        `${analysis.slowQueries.length} yavaş query tespit edildi. Index eklenmeli.`
      );
    }
    
    return analysis;
  }
  
  /**
   * İyileştirme raporu oluştur
   */
  async generateImprovementReport(
    focusArea?: 'performance' | 'security' | 'features' | 'all'
  ): Promise<ImprovementReport> {
    const systemAnalysis = await this.analyzeSystem();
    
    // Focus area'ya göre filtrele
    let findings = systemAnalysis.findings;
    if (focusArea && focusArea !== 'all') {
      findings = findings.filter(f => f.category === focusArea);
    }
    
    // Önceliklendir
    const prioritized = this.prioritizeFindings(findings);
    
    // Sprint planı oluştur
    const sprintPlan = this.createSprintPlan(prioritized);
    
    return {
      reportId: generateId(),
      generatedAt: new Date(),
      focusArea: focusArea || 'all',
      findings: prioritized,
      summary: {
        total: prioritized.length,
        byPriority: {
          P0: prioritized.filter(f => f.priority === 'P0').length,
          P1: prioritized.filter(f => f.priority === 'P1').length,
          P2: prioritized.filter(f => f.priority === 'P2').length,
          P3: prioritized.filter(f => f.priority === 'P3').length
        },
        estimatedEffort: this.calculateTotalEffort(prioritized)
      },
      sprintPlan,
      nextSteps: this.generateNextSteps(prioritized)
    };
  }
  
  /**
   * Diğer agent'lardan bilgi topla
   */
  async collectAgentFeedback(): Promise<AgentFeedback[]> {
    const agents = ['planning', 'warehouse', 'production', 'purchase'];
    const feedbacks: AgentFeedback[] = [];
    
    for (const agentName of agents) {
      const feedback = await this.askAgent(agentName, {
        prompt: `
          Sistemin iyileştirilmesi gereken noktaları nelerdir?
          Performans sorunları var mı?
          Eksik özellikler nelerdir?
          Kullanıcı deneyimi iyileştirmeleri neler olabilir?
        `
      });
      
      feedbacks.push({
        agent: agentName,
        feedback: feedback.content,
        suggestions: feedback.suggestions || [],
        priority: feedback.priority || 'medium'
      });
    }
    
    return feedbacks;
  }
}
```

---

### Orchestrator Örneği

```typescript
// lib/ai/orchestrator.ts
import { BaseAgent } from './agents/base-agent';
import { PlanningAgent } from './agents/planning-agent';
import { WarehouseAgent } from './agents/warehouse-agent';
import { ProductionAgent } from './agents/production-agent';
import { PurchaseAgent } from './agents/purchase-agent';
import { ZeroErrorProtocol } from './zero-error-protocol';

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent>;
  private zeroErrorProtocol: ZeroErrorProtocol;
  private conversationHistory: ConversationMessage[];
  
  constructor() {
    this.agents = new Map([
      ['planning', new PlanningAgent()],
      ['warehouse', new WarehouseAgent()],
      ['production', new ProductionAgent()],
      ['purchase', new PurchaseAgent()]
    ]);
    this.zeroErrorProtocol = new ZeroErrorProtocol();
    this.conversationHistory = [];
  }
  
  /**
   * Multi-agent konuşma başlat
   */
  async startConversation(
    initiator: string,
    request: AgentRequest
  ): Promise<ConversationResult> {
    const initiatorAgent = this.agents.get(initiator);
    if (!initiatorAgent) {
      throw new Error(`Agent not found: ${initiator}`);
    }
    
    // 1. İlk agent işlemi başlatır
    const initialResponse = await initiatorAgent.processRequest(request);
    this.conversationHistory.push({
      agent: initiator,
      message: request.prompt,
      response: initialResponse,
      timestamp: new Date()
    });
    
    // 2. İlgili agent'lara sor
    const relatedAgents = this.getRelatedAgents(initiator, request);
    const agentResponses: AgentResponse[] = [];
    
    for (const agentName of relatedAgents) {
      const agent = this.agents.get(agentName);
      if (!agent) continue;
      
      const question = this.generateQuestionForAgent(
        initiator,
        agentName,
        initialResponse
      );
      
      const response = await agent.processRequest({
        prompt: question,
        context: {
          initiator,
          previousResponse: initialResponse,
          conversationHistory: this.conversationHistory
        }
      });
      
      agentResponses.push(response);
      this.conversationHistory.push({
        agent: agentName,
        message: question,
        response,
        timestamp: new Date()
      });
    }
    
    // 3. Consensus oluştur
    const consensus = await this.buildConsensus(
      initialResponse,
      agentResponses
    );
    
    // 4. 0 Hata Protokolü çalıştır
    const protocolResult = await this.zeroErrorProtocol.executeZeroErrorProtocol(
      {
        type: request.type || 'general',
        agent: initiator,
        action: initialResponse.action,
        data: initialResponse.data,
        reasoning: initialResponse.reasoning,
        confidence: initialResponse.confidence
      },
      Array.from(this.agents.values()),
      this.getSupabaseClient(),
      request.severity || 'medium'
    );
    
    return {
      initiator,
      finalDecision: protocolResult.finalDecision,
      agentConversations: this.conversationHistory,
      consensus,
      protocolResult
    };
  }
  
  /**
   * İlgili agent'ları belirle
   */
  private getRelatedAgents(
    initiator: string,
    request: AgentRequest
  ): string[] {
    const relationships: Record<string, string[]> = {
      purchase: ['warehouse', 'planning'],
      planning: ['warehouse', 'production', 'purchase'],
      warehouse: ['planning', 'purchase', 'production'],
      production: ['warehouse', 'planning']
    };
    
    return relationships[initiator] || [];
  }
  
  /**
   * Agent'a özel soru oluştur
   */
  private generateQuestionForAgent(
    from: string,
    to: string,
    context: AgentResponse
  ): string {
    const questions: Record<string, Record<string, string>> = {
      purchase: {
        warehouse: 'Bu malzeme için mevcut stok seviyesi nedir? Kritik seviyeye yakın mı?',
        planning: 'Bu malzeme hangi üretim planlarında kullanılıyor? Aciliyet durumu nedir?'
      },
      planning: {
        warehouse: 'Bu üretim planı için gerekli malzemeler stokta mevcut mu?',
        production: 'Bu plan için operatör kapasitesi var mı?',
        purchase: 'Eksik malzemeler için tedarik süresi ne kadar?'
      },
      warehouse: {
        planning: 'Bu malzeme hangi üretim planlarında rezerve edilmiş?',
        purchase: 'Bu malzeme için otomatik sipariş önerisi var mı?',
        production: 'Bu malzeme şu anda üretimde kullanılıyor mu?'
      },
      production: {
        warehouse: 'Bu üretim için BOM\'daki malzemeler stokta mevcut mu?',
        planning: 'Bu üretim planı gerçekçi mi? Teslim tarihi uygun mu?'
      }
    };
    
    return questions[from]?.[to] || 'Bu konuda görüşün nedir?';
  }
  
  /**
   * Consensus oluştur
   */
  private async buildConsensus(
    initialResponse: AgentResponse,
    agentResponses: AgentResponse[]
  ): Promise<ConsensusResult> {
    const allResponses = [initialResponse, ...agentResponses];
    const approvals = allResponses.filter(r => r.decision === 'approve').length;
    const total = allResponses.length;
    
    return {
      isConsensus: approvals === total,
      approvalRate: approvals / total,
      totalAgents: total,
      approvals,
      rejections: total - approvals
    };
  }
}
```

---

## 🤖 GPT Model Seçimi ve Stratejisi

### Model Karar Matrisi

Her agent'ın görev karmaşıklığına ve ihtiyaçlarına göre farklı GPT modelleri kullanılacak:

| Agent | Önerilen Model | Alternatif | Neden | Maliyet |
|-------|---------------|------------|-------|----------|
| **Planning GPT** | `gpt-4o` | `gpt-4-turbo` | Karmaşık planlama, çoklu faktör analizi, optimizasyon | Yüksek |
| **Warehouse GPT** | `gpt-4o-mini` | `gpt-3.5-turbo` | Basit stok kontrolleri, hesaplamalar, hızlı yanıt | Düşük |
| **Production GPT** | `gpt-4o` | `gpt-4-turbo` | BOM doğrulama, kalite kontrol, kritik kararlar | Yüksek |
| **Purchase GPT** | `gpt-4o` | `gpt-4-turbo` | Fiyat analizi, optimizasyon, stratejik kararlar | Yüksek |
| **Manager GPT** | `gpt-4o` | `gpt-4-turbo` | Stratejik kararlar, risk analizi, kritik onaylar | Yüksek |
| **Developer GPT** | `gpt-4o` | `gpt-4-turbo` | Kod analizi, derinlemesine analiz, kompleks raporlama | Yüksek |

### Model Özellikleri ve Kullanım Senaryoları

#### GPT-4o (Önerilen - Ana Model)
**Kullanım Alanları:**
- Karmaşık karar verme
- Çoklu faktör analizi
- Stratejik planlama
- Kritik doğrulamalar
- Derinlemesine analiz

**Avantajlar:**
- Yüksek doğruluk
- Gelişmiş akıl yürütme
- Çok dilli destek
- Vision desteği (gelecekte)
- Hızlı yanıt süresi

**Dezavantajlar:**
- Yüksek maliyet
- Rate limit kısıtları

**Kullanan Agent'lar:**
- Planning GPT
- Production GPT
- Purchase GPT
- Manager GPT
- Developer GPT

---

#### GPT-4o-mini (Maliyet Optimizasyonu)
**Kullanım Alanları:**
- Basit sorgular
- Hızlı kontroller
- Rutin işlemler
- Düşük karmaşıklık görevler

**Avantajlar:**
- Düşük maliyet (GPT-4o'nun ~1/10'u)
- Hızlı yanıt
- Yeterli doğruluk (basit görevler için)

**Dezavantajlar:**
- Karmaşık görevlerde sınırlı
- Daha az akıl yürütme yeteneği

**Kullanan Agent'lar:**
- Warehouse GPT (basit stok kontrolleri için)

---

#### GPT-4 Turbo (Alternatif)
**Kullanım Alanları:**
- GPT-4o'nun maliyetli olduğu durumlar
- Batch işlemler
- Gece saatlerinde işlemler

**Avantajlar:**
- GPT-4o'dan daha ucuz
- Yüksek context window (128k)
- İyi performans

**Dezavantajlar:**
- GPT-4o'dan biraz daha yavaş
- Daha eski model

---

### Dinamik Model Seçimi Stratejisi

Sistem, görev karmaşıklığına göre otomatik model seçimi yapabilir:

```typescript
interface ModelSelectionStrategy {
  // Basit görevler için mini model
  simpleTasks: 'gpt-4o-mini';
  
  // Orta karmaşıklık için turbo
  mediumTasks: 'gpt-4-turbo';
  
  // Karmaşık görevler için gpt-4o
  complexTasks: 'gpt-4o';
  
  // Kritik görevler için her zaman gpt-4o
  criticalTasks: 'gpt-4o';
}

function selectModel(
  agent: string,
  taskComplexity: 'simple' | 'medium' | 'complex' | 'critical',
  budget?: 'low' | 'medium' | 'high'
): string {
  const strategies: Record<string, ModelSelectionStrategy> = {
    planning: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    warehouse: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4o-mini',
      complexTasks: 'gpt-4-turbo',
      criticalTasks: 'gpt-4o'
    },
    production: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    purchase: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    manager: {
      simpleTasks: 'gpt-4-turbo',
      mediumTasks: 'gpt-4o',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    developer: {
      simpleTasks: 'gpt-4-turbo',
      mediumTasks: 'gpt-4o',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    }
  };
  
  const strategy = strategies[agent];
  if (!strategy) return 'gpt-4o'; // Default
  
  // Budget constraint
  if (budget === 'low' && taskComplexity !== 'critical') {
    return 'gpt-4o-mini';
  }
  
  return strategy[`${taskComplexity}Tasks`];
}
```

### Maliyet Optimizasyonu

**Stratejiler:**

1. **Caching:**
   - Benzer sorgular için cache kullan
   - Agent yanıtlarını cache'le
   - TTL: 1 saat (stok verileri), 24 saat (genel bilgiler)

2. **Batch Processing:**
   - Birden fazla sorguyu tek request'te birleştir
   - Gece saatlerinde batch analizler

3. **Model Downgrade:**
   - Basit görevler için mini model
   - Sadece kritik görevler için gpt-4o

4. **Rate Limiting:**
   - Agent başına günlük limit
   - Priority queue sistemi

### Gelecek Planlama (GPT-5)

Dokümantasyonda "gpt-5" referansları, gelecekte GPT-5 çıktığında kolayca güncellenebilmesi için placeholder olarak bırakılmıştır.

**GPT-5 Geçiş Planı:**
1. GPT-5 çıktığında beta test
2. Önce Developer GPT ile başla
3. Kademeli olarak diğer agent'lara geç
4. Performans ve maliyet karşılaştırması
5. Tam geçiş kararı

**Şu Anki Durum:**
- ✅ GPT-4o: Production ready
- ✅ GPT-4o-mini: Cost optimization
- ⏳ GPT-5: Beklemede (çıktığında değerlendirilecek)

### Environment Configuration

```bash
# .env.local
# Ana modeller
GPT_MODEL_PLANNING=gpt-4o
GPT_MODEL_WAREHOUSE=gpt-4o-mini
GPT_MODEL_PRODUCTION=gpt-4o
GPT_MODEL_PURCHASE=gpt-4o
GPT_MODEL_MANAGER=gpt-4o
GPT_MODEL_DEVELOPER=gpt-4o

# Alternatif modeller (fallback)
GPT_MODEL_FALLBACK=gpt-4-turbo
GPT_MODEL_BUDGET=gpt-4o-mini

# Model seçim stratejisi
ENABLE_DYNAMIC_MODEL_SELECTION=true
ENABLE_MODEL_CACHING=true
MODEL_CACHE_TTL=3600

# Rate limits
GPT_RATE_LIMIT_PER_AGENT=1000  # requests/day
GPT_RATE_LIMIT_TOTAL=10000     # requests/day
```

### Kod Güncellemesi

BaseAgent sınıfında model seçimi:

```typescript
// lib/ai/agents/base-agent.ts
export abstract class BaseAgent {
  protected model: string;
  
  constructor(
    name: string,
    role: string,
    responsibilities: string[],
    systemPrompt: string,
    defaultModel: string = 'gpt-4o'
  ) {
    // Environment'dan model al, yoksa default kullan
    this.model = process.env[`GPT_MODEL_${role.toUpperCase()}`] || defaultModel;
  }
  
  protected async callGPT(
    messages: ChatCompletionMessage[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) {
    const model = options?.model || this.model;
    
    return await this.gpt5Client.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens
    });
  }
}
```

---

## 🔒 Güvenlik ve Performans

### Güvenlik Önlemleri

1. **API Key Güvenliği**
   - Environment variables kullan
   - Asla kod içinde hardcode etme
   - Key rotation stratejisi

2. **Veri Gizliliği**
   - Hassas verileri anonimleştir
   - PII (Personally Identifiable Information) filtrele
   - GDPR uyumu

3. **Rate Limiting**
   - Agent başına rate limit
   - Toplam API çağrı limiti
   - Circuit breaker pattern

4. **Audit Logging**
   - Tüm agent kararları loglanır
   - Conversation history saklanır
   - Hata durumları kaydedilir

### Performans Optimizasyonu

1. **Caching Stratejisi**
   - Agent yanıtları cache'le
   - Stok verileri cache'le
   - Consensus sonuçları cache'le

2. **Paralel İşlemler**
   - Agent sorguları paralel çalıştır
   - Database query'leri optimize et
   - Batch processing

3. **Timeout Yönetimi**
   - Agent yanıt timeout'u (30s)
   - Consensus timeout'u (60s)
   - Database query timeout'u (10s)

4. **Maliyet Optimizasyonu**
   - Sadece kritik işlemlerde AI kullan
   - Batch işlemler
   - Caching ile API çağrılarını azalt

---

## 📊 Metrikler ve İzleme

### Takip Edilecek Metrikler

1. **Agent Performansı**
   - Yanıt süresi
   - Doğruluk oranı
   - Confidence skorları
   - Hata oranı

2. **Consensus Metrikleri**
   - Consensus oranı
   - Ortalama onay süresi
   - Çatışma sayısı
   - Çözüm süresi

3. **Protokol Metrikleri**
   - Katman geçme oranları
   - Hata tespit oranı
   - Human approval oranı
   - Otomatik onay oranı

4. **Sistem Metrikleri**
   - API çağrı sayısı
   - Maliyet
   - Response time
   - Error rate

---

## 🚀 Başlangıç Adımları

### 1. Environment Setup

```bash
# .env.local dosyasına ekle
OPENAI_API_KEY=your_api_key_here

# Agent modelleri (her agent için özel)
GPT_MODEL_PLANNING=gpt-4o
GPT_MODEL_WAREHOUSE=gpt-4o-mini
GPT_MODEL_PRODUCTION=gpt-4o
GPT_MODEL_PURCHASE=gpt-4o
GPT_MODEL_MANAGER=gpt-4o
GPT_MODEL_DEVELOPER=gpt-4o

# Fallback ve optimizasyon
GPT_MODEL_FALLBACK=gpt-4-turbo
GPT_MODEL_BUDGET=gpt-4o-mini

# Sistem ayarları
AGENT_ENABLED=true
ZERO_ERROR_PROTOCOL_ENABLED=true
ENABLE_DYNAMIC_MODEL_SELECTION=true
ENABLE_MODEL_CACHING=true
MODEL_CACHE_TTL=3600

# Rate limits
GPT_RATE_LIMIT_PER_AGENT=1000
GPT_RATE_LIMIT_TOTAL=10000
```

### 2. Dependencies

```bash
npm install openai
npm install @types/node
```

### 3. İlk Agent Testi

```typescript
// Test script
import { PlanningAgent } from '@/lib/ai/agents/planning-agent';

const agent = new PlanningAgent();
const response = await agent.processRequest({
  prompt: 'Bu siparişi analiz et: Order #123',
  type: 'order_analysis'
});

console.log(response);
```

---

## 📝 Notlar ve Öneriler

### Önemli Notlar

1. **0 Hata Protokolü gerçekte %100 hata garantisi vermez**, ancak çok yüksek güvenilirlik sağlar
2. **Human-in-the-loop** kritik işlemler için mutlaka kullanılmalı
3. **Consensus mekanizması** zaman alabilir, timeout yönetimi önemli
4. **Maliyet** dikkatli yönetilmeli, caching stratejisi şart
5. **Test coverage** yüksek olmalı, agent'lar karmaşık sistemler

### Öneriler

1. **Kademeli Rollout:** Önce tek agent, sonra tüm sistem
2. **A/B Testing:** AI kararları vs manuel kararlar
3. **Feedback Loop:** Agent'lar öğrenmeli, hatalardan ders çıkarmalı
4. **Monitoring:** Sürekli izleme ve iyileştirme
5. **Dokümantasyon:** Her agent için detaylı dokümantasyon

---

## 🎯 Sonuç

Bu multi-agent mimarisi ile ThunderV2 ERP sistemi:

✅ **Her departmanın kendi AI'ı var** (6 Agent implement edildi)  
✅ **Agent'lar birbirini kontrol ediyor** (Cross-validation aktif)  
✅ **5 katmanlı doğrulama sistemi** (Zero Error Protocol çalışıyor)  
✅ **Consensus mekanizması** (Consensus Engine aktif)  
✅ **Database seviyesinde kontrol** (Database validation katmanı aktif)  
✅ **Kritik işlemler için insan onayı** (Human Approval sistemi çalışıyor)  
✅ **Tam şeffaflık ve izlenebilirlik** (Agent logs, dashboard'lar hazır)  
✅ **Cost Management** (Günlük/haftalık limit kontrolü aktif)  
✅ **Test Coverage** (48 test, 8 test suite - %100 geçti)  

**Sonuç:** ✅ **Production Ready** - Yüksek güvenilirlik, düşük hata oranı, optimize edilmiş süreçler, tam test coverage.

---

---

## 🔧 Eksiklikler ve Implementasyon Rehberi

### ✅ Mevcut Durum Analizi

Multi-agent mimarisi dokümantasyonu tamamlanmış ve **TÜM EKSİKLİKLER GİDERİLMİŞTİR**:

1. ✅ AI Agent Implementasyonu - **TAMAMLANDI**
2. ✅ OpenAI Entegrasyonu - **TAMAMLANDI**
3. ✅ Altyapı Bileşenleri - **TAMAMLANDI**
4. ✅ API Entegrasyonu - **TAMAMLANDI**
5. ✅ Monitoring ve Logging - **TAMAMLANDI**
6. ✅ Test Altyapısı - **TAMAMLANDI**

Bu bölüm, her eksiklik için detaylı implementasyon rehberi içermektedir. **Tüm implementasyonlar tamamlanmıştır.**

---

## 1️⃣ AI Agent Implementasyonu

### Mevcut Durum
- ❌ `lib/ai/` klasörü yok
- ❌ BaseAgent sınıfı yok
- ❌ Agent sınıfları yok (Planning, Warehouse, Production, vb.)
- ❌ AgentOrchestrator yok

### Implementasyon Planı

#### Adım 1: Klasör Yapısını Oluştur

```bash
mkdir -p lib/ai/agents
mkdir -p lib/ai/types
mkdir -p lib/ai/utils
```

**Oluşturulacak Dosyalar:**
```
lib/ai/
├── agents/
│   ├── base-agent.ts
│   ├── planning-agent.ts
│   ├── warehouse-agent.ts
│   ├── production-agent.ts
│   ├── purchase-agent.ts
│   ├── manager-agent.ts
│   └── developer-agent.ts
├── types/
│   ├── agent.types.ts
│   ├── message.types.ts
│   └── protocol.types.ts
├── utils/
│   ├── model-selector.ts
│   └── logger.ts
├── orchestrator.ts
├── event-bus.ts
├── zero-error-protocol.ts
└── consensus-engine.ts
```

#### Adım 2: Type Definitions

**`lib/ai/types/agent.types.ts`**
```typescript
export interface AgentRequest {
  id: string;
  prompt: string;
  type: 'query' | 'request' | 'analysis' | 'validation';
  context?: Record<string, any>;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentResponse {
  id: string;
  agent: string;
  decision: 'approve' | 'reject' | 'conditional' | 'pending';
  action?: string;
  data?: any;
  reasoning: string;
  confidence: number; // 0-1
  issues?: string[];
  recommendations?: string[];
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  confidence: number;
}

export interface AgentDecision {
  agent: string;
  action: string;
  data: any;
  reasoning: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Vote {
  agent: string;
  vote: 'approve' | 'reject' | 'conditional';
  confidence: number;
  reasoning: string;
  conditions?: string[];
}

export interface ConsensusResult {
  isConsensus: boolean;
  approvalRate: number;
  totalVotes: number;
  approveVotes: number;
  rejectVotes: number;
  conditionalVotes: number;
  conditions: string[];
  agentOpinions: Vote[];
}
```

**`lib/ai/types/message.types.ts`**
```typescript
export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: 'query' | 'request' | 'response' | 'notification' | 'alert';
  content: string;
  data?: any;
  context?: {
    conversationId?: string;
    previousMessages?: AgentMessage[];
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: Date;
}

export interface ConversationMessage {
  agent: string;
  message: string;
  response: AgentResponse;
  timestamp: Date;
}

export interface ConversationResult {
  initiator: string;
  finalDecision: 'approved' | 'rejected' | 'pending_approval';
  agentConversations: ConversationMessage[];
  consensus: ConsensusResult;
  protocolResult: ProtocolResult;
}
```

**`lib/ai/types/protocol.types.ts`**
```typescript
export interface ProtocolResult {
  decision: AgentDecision;
  layers: {
    layer1?: LayerResult;
    layer2?: LayerResult;
    layer3?: LayerResult;
    layer4?: LayerResult;
    layer5?: LayerResult;
  };
  finalDecision: 'approved' | 'rejected' | 'pending_approval';
  errors: string[];
  warnings: string[];
}

export interface LayerResult {
  passed: boolean;
  details?: any;
  errors?: string[];
  warnings?: string[];
}
```

#### Adım 3: BaseAgent Sınıfı

**`lib/ai/agents/base-agent.ts`**
```typescript
import OpenAI from 'openai';
import { AgentRequest, AgentResponse, ValidationResult, Vote, AgentDecision } from '../types/agent.types';
import { AgentMessage } from '../types/message.types';
import { AgentEventBus } from '../event-bus';
import { selectModel } from '../utils/model-selector';
import { agentLogger } from '../utils/logger';

export abstract class BaseAgent {
  protected name: string;
  protected role: string;
  protected responsibilities: string[];
  protected systemPrompt: string;
  protected openaiClient: OpenAI;
  protected defaultModel: string;
  
  constructor(
    name: string,
    role: string,
    responsibilities: string[],
    systemPrompt: string,
    defaultModel: string = 'gpt-4o'
  ) {
    this.name = name;
    this.role = role;
    this.responsibilities = responsibilities;
    this.systemPrompt = systemPrompt;
    this.defaultModel = process.env[`GPT_MODEL_${role.toUpperCase()}`] || defaultModel;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openaiClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.openai.com/v1'
    });
  }
  
  /**
   * İstek işle - Her agent kendi implementasyonunu yapacak
   */
  abstract processRequest(request: AgentRequest): Promise<AgentResponse>;
  
  /**
   * Diğer agent'larla doğrulama - Her agent kendi implementasyonunu yapacak
   */
  abstract validateWithOtherAgents(data: any): Promise<ValidationResult>;
  
  /**
   * GPT API çağrısı yap
   */
  protected async callGPT(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      taskComplexity?: 'simple' | 'medium' | 'complex' | 'critical';
    }
  ) {
    const model = options?.model || 
                  selectModel(this.role, options?.taskComplexity || 'medium') || 
                  this.defaultModel;
    
    const startTime = Date.now();
    
    try {
      const response = await this.openaiClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...messages
        ],
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens
      });
      
      const duration = Date.now() - startTime;
      
      agentLogger.log({
        agent: this.name,
        action: 'gpt_call',
        model,
        duration,
        tokens: response.usage?.total_tokens || 0,
        success: true
      });
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      agentLogger.error({
        agent: this.name,
        action: 'gpt_call',
        model,
        duration,
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }
  
  /**
   * Oylama (consensus için)
   */
  async vote(decision: AgentDecision): Promise<Vote> {
    const prompt = `
      ${this.systemPrompt}
      
      Bu kararı değerlendir ve oy ver:
      ${JSON.stringify(decision, null, 2)}
      
      Oy seçenekleri:
      - approve: Tamamen onaylıyorum
      - reject: Reddediyorum (nedenini açıkla)
      - conditional: Koşullu onaylıyorum (koşulları belirt)
      
      JSON formatında yanıt ver:
      {
        "vote": "approve" | "reject" | "conditional",
        "confidence": 0.0-1.0,
        "reasoning": "Açıklama",
        "conditions": ["koşul1", "koşul2"] // conditional ise
      }
    `;
    
    const response = await this.callGPT([
      { role: 'user', content: prompt }
    ], { taskComplexity: 'medium' });
    
    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    
    return {
      agent: this.name,
      vote: parsed.vote,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      conditions: parsed.conditions || []
    };
  }
  
  /**
   * Diğer agent'a soru sor
   */
  async askAgent(
    agentName: string,
    question: string,
    context?: any
  ): Promise<AgentResponse> {
    const eventBus = AgentEventBus.getInstance();
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      from: this.name,
      to: agentName,
      type: 'query',
      content: question,
      data: context,
      timestamp: new Date()
    };
    
    return await eventBus.sendMessage(this.name, agentName, message);
  }
  
  /**
   * Response'u parse et
   */
  protected parseResponse(response: any): AgentResponse {
    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const parsed = JSON.parse(content);
      return {
        id: `resp_${Date.now()}`,
        agent: this.name,
        decision: parsed.decision || 'pending',
        action: parsed.action,
        data: parsed.data,
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0.5,
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
        timestamp: new Date()
      };
    } catch (error) {
      // JSON parse edilemezse, text olarak döndür
      return {
        id: `resp_${Date.now()}`,
        agent: this.name,
        decision: 'pending',
        reasoning: content,
        confidence: 0.5,
        timestamp: new Date()
      };
    }
  }
}
```

#### Adım 4: İlk Agent - Planning Agent

**`lib/ai/agents/planning-agent.ts`**
```typescript
import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, ValidationResult } from '../types/agent.types';

export class PlanningAgent extends BaseAgent {
  constructor() {
    super(
      'Planlama GPT',
      'planning',
      [
        'Sipariş planlama',
        'Üretim planı oluşturma',
        'BOM yönetimi',
        'Operatör atama',
        'Kapasite planlama'
      ],
      `
        Sen ThunderV2 ERP sisteminin Planlama departmanı AI asistanısın.
        
        Sorumlulukların:
        - Sipariş planlama ve optimizasyonu
        - Üretim planı oluşturma ve yönetimi
        - BOM (Bill of Materials) yönetimi ve doğrulama
        - Operatör atama ve kapasite planlama
        - Teslim tarihi gerçekçilik kontrolü
        
        Diğer departmanlarla iletişim kur:
        - Depo GPT: Stok yeterliliğini kontrol et
        - Üretim GPT: Operatör kapasitesini sorgula
        - Satın Alma GPT: Eksik malzemeler için tedarik süresini öğren
        
        Karar verirken:
        1. Her zaman gerçekçi planlar oluştur
        2. Kaynak kullanımını optimize et
        3. Teslim tarihlerini koru
        4. Operatör yükünü dengeli dağıt
        
        Yanıtlarını JSON formatında ver:
        {
          "decision": "approve" | "reject" | "conditional",
          "action": "action_name",
          "data": {...},
          "reasoning": "Açıklama",
          "confidence": 0.0-1.0,
          "issues": [],
          "recommendations": []
        }
      `,
      'gpt-4o'
    );
  }
  
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `
      ${request.prompt}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
    `;
    
    const response = await this.callGPT([
      { role: 'user', content: prompt }
    ], { taskComplexity: request.urgency === 'critical' ? 'critical' : 'complex' });
    
    return this.parseResponse(response);
  }
  
  async validateWithOtherAgents(orderData: any): Promise<ValidationResult> {
    // Warehouse GPT'e sor
    const warehouseCheck = await this.askAgent('warehouse', 
      `Bu üretim planı için gerekli malzemeler stokta mevcut mu?`,
      { materials: orderData.required_materials }
    );
    
    // Production GPT'e sor
    const productionCheck = await this.askAgent('production',
      `Bu plan için operatör kapasitesi var mı?`,
      { date: orderData.delivery_date, quantity: orderData.quantity }
    );
    
    return {
      isValid: warehouseCheck.decision === 'approve' && productionCheck.decision === 'approve',
      issues: [
        ...(warehouseCheck.issues || []),
        ...(productionCheck.issues || [])
      ],
      recommendations: [
        ...(warehouseCheck.recommendations || []),
        ...(productionCheck.recommendations || [])
      ],
      confidence: Math.min(warehouseCheck.confidence, productionCheck.confidence)
    };
  }
}
```

#### Adım 5: Diğer Agent'ları Oluştur

Aynı pattern'i kullanarak diğer agent'ları oluşturun:
- `warehouse-agent.ts`
- `production-agent.ts`
- `purchase-agent.ts`
- `manager-agent.ts`
- `developer-agent.ts`

Her agent için:
1. BaseAgent'ı extend edin
2. Kendi system prompt'unu tanımlayın
3. `processRequest` metodunu implement edin
4. `validateWithOtherAgents` metodunu implement edin

---

## 2️⃣ OpenAI Entegrasyonu

### Mevcut Durum
- ❌ `package.json`'da `openai` dependency yok
- ❌ OpenAI client konfigürasyonu yok
- ❌ API key yönetimi yok

### Implementasyon Planı

#### Adım 1: Dependency Ekle

```bash
npm install openai
```

**`package.json` güncellemesi:**
```json
{
  "dependencies": {
    "openai": "^4.0.0"
  }
}
```

#### Adım 2: Environment Variables

**`.env.local` dosyası oluştur:**
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Agent Models (her agent için)
GPT_MODEL_PLANNING=gpt-4o
GPT_MODEL_WAREHOUSE=gpt-4o-mini
GPT_MODEL_PRODUCTION=gpt-4o
GPT_MODEL_PURCHASE=gpt-4o
GPT_MODEL_MANAGER=gpt-4o
GPT_MODEL_DEVELOPER=gpt-4o

# Fallback Models
GPT_MODEL_FALLBACK=gpt-4-turbo
GPT_MODEL_BUDGET=gpt-4o-mini

# System Settings
AGENT_ENABLED=true
ZERO_ERROR_PROTOCOL_ENABLED=true
ENABLE_DYNAMIC_MODEL_SELECTION=true
ENABLE_MODEL_CACHING=true
MODEL_CACHE_TTL=3600

# Rate Limits
GPT_RATE_LIMIT_PER_AGENT=1000
GPT_RATE_LIMIT_TOTAL=10000
```

#### Adım 3: OpenAI Client Wrapper

**`lib/ai/utils/openai-client.ts`**
```typescript
import OpenAI from 'openai';

class OpenAIClientSingleton {
  private static instance: OpenAI | null = null;
  
  static getInstance(): OpenAI {
    if (!this.instance) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      
      this.instance = new OpenAI({
        apiKey,
        baseURL: 'https://api.openai.com/v1',
        maxRetries: 3,
        timeout: 30000
      });
    }
    
    return this.instance;
  }
  
  static reset() {
    this.instance = null;
  }
}

export const openaiClient = OpenAIClientSingleton.getInstance();
```

#### Adım 4: API Key Validation

**`lib/ai/utils/api-key-validator.ts`**
```typescript
import { openaiClient } from './openai-client';

export async function validateAPIKey(): Promise<boolean> {
  try {
    await openaiClient.models.list();
    return true;
  } catch (error) {
    console.error('OpenAI API key validation failed:', error);
    return false;
  }
}

export function getAPIKeyStatus(): {
  exists: boolean;
  valid: boolean;
  masked: string;
} {
  const key = process.env.OPENAI_API_KEY;
  return {
    exists: !!key,
    valid: false, // Will be set by validateAPIKey
    masked: key ? `${key.substring(0, 7)}...${key.substring(key.length - 4)}` : 'N/A'
  };
}
```

---

## 3️⃣ Altyapı Bileşenleri

### Mevcut Durum
- ❌ Event Bus sistemi yok
- ❌ Zero Error Protocol implementasyonu yok
- ❌ Consensus Engine yok
- ❌ Model Selection Strategy yok

### Implementasyon Planı

#### Adım 1: Event Bus Sistemi

**`lib/ai/event-bus.ts`**
```typescript
import { EventEmitter } from 'events';
import { AgentMessage, AgentResponse } from './types/message.types';
import { BaseAgent } from './agents/base-agent';
import { agentLogger } from './utils/logger';

export class AgentEventBus extends EventEmitter {
  private static instance: AgentEventBus;
  private agents: Map<string, BaseAgent> = new Map();
  
  private constructor() {
    super();
    this.setupEventHandlers();
  }
  
  static getInstance(): AgentEventBus {
    if (!AgentEventBus.instance) {
      AgentEventBus.instance = new AgentEventBus();
    }
    return AgentEventBus.instance;
  }
  
  /**
   * Agent kaydet
   */
  registerAgent(agent: BaseAgent) {
    this.agents.set(agent.name.toLowerCase(), agent);
    this.emit('agent:registered', agent.name);
  }
  
  /**
   * Agent mesajı gönder
   */
  async sendMessage(
    from: string,
    to: string,
    message: AgentMessage
  ): Promise<AgentResponse> {
    this.emit('agent:message', { from, to, message });
    
    const targetAgent = this.agents.get(to.toLowerCase());
    if (!targetAgent) {
      throw new Error(`Agent not found: ${to}`);
    }
    
    try {
      const response = await targetAgent.processRequest({
        id: message.id,
        prompt: message.content,
        type: message.type === 'query' ? 'query' : 'request',
        context: message.data,
        urgency: message.context?.urgency || 'medium'
      });
      
      this.emit('agent:response', { from: to, to: from, response });
      
      agentLogger.log({
        agent: from,
        action: 'message_sent',
        target: to,
        messageId: message.id,
        success: true
      });
      
      return response;
    } catch (error: any) {
      agentLogger.error({
        agent: from,
        action: 'message_sent',
        target: to,
        messageId: message.id,
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }
  
  /**
   * Broadcast (tüm agent'lara)
   */
  async broadcast(from: string, message: AgentMessage): Promise<AgentResponse[]> {
    const agents = Array.from(this.agents.values())
      .filter(a => a.name.toLowerCase() !== from.toLowerCase());
    
    const responses = await Promise.all(
      agents.map(agent => 
        this.sendMessage(from, agent.name, message).catch(error => {
          agentLogger.error({
            agent: from,
            action: 'broadcast',
            target: agent.name,
            error: error.message
          });
          return null;
        })
      )
    );
    
    return responses.filter(r => r !== null) as AgentResponse[];
  }
  
  /**
   * Event handler'ları kur
   */
  private setupEventHandlers() {
    this.on('agent:message', (data) => {
      agentLogger.log({
        action: 'event:message',
        from: data.from,
        to: data.to
      });
    });
    
    this.on('agent:response', (data) => {
      agentLogger.log({
        action: 'event:response',
        from: data.from,
        to: data.to
      });
    });
  }
  
  /**
   * Tüm agent'ları al
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Agent al
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name.toLowerCase());
  }
}
```

#### Adım 2: Model Selection Strategy

**`lib/ai/utils/model-selector.ts`**
```typescript
export function selectModel(
  agentRole: string,
  taskComplexity: 'simple' | 'medium' | 'complex' | 'critical',
  budget?: 'low' | 'medium' | 'high'
): string {
  const strategies: Record<string, Record<string, string>> = {
    planning: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    warehouse: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4o-mini',
      complexTasks: 'gpt-4-turbo',
      criticalTasks: 'gpt-4o'
    },
    production: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    purchase: {
      simpleTasks: 'gpt-4o-mini',
      mediumTasks: 'gpt-4-turbo',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    manager: {
      simpleTasks: 'gpt-4-turbo',
      mediumTasks: 'gpt-4o',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    },
    developer: {
      simpleTasks: 'gpt-4-turbo',
      mediumTasks: 'gpt-4o',
      complexTasks: 'gpt-4o',
      criticalTasks: 'gpt-4o'
    }
  };
  
  const strategy = strategies[agentRole.toLowerCase()];
  if (!strategy) {
    return process.env.GPT_MODEL_FALLBACK || 'gpt-4o';
  }
  
  // Budget constraint
  if (budget === 'low' && taskComplexity !== 'critical') {
    return process.env.GPT_MODEL_BUDGET || 'gpt-4o-mini';
  }
  
  const taskKey = `${taskComplexity}Tasks` as keyof typeof strategy;
  return strategy[taskKey] || process.env.GPT_MODEL_FALLBACK || 'gpt-4o';
}
```

#### Adım 3: Consensus Engine

**`lib/ai/consensus-engine.ts`**
```typescript
import { Vote, ConsensusResult } from './types/agent.types';
import { BaseAgent } from './agents/base-agent';
import { AgentDecision } from './types/agent.types';

export class ConsensusEngine {
  /**
   * Consensus oluştur
   */
  async buildConsensus(
    decision: AgentDecision,
    agents: BaseAgent[]
  ): Promise<ConsensusResult> {
    const votes: Vote[] = [];
    
    // Her agent'tan oy al
    for (const agent of agents) {
      try {
        const vote = await agent.vote(decision);
        votes.push(vote);
      } catch (error) {
        console.error(`Error getting vote from ${agent.name}:`, error);
        // Hata durumunda reject olarak say
        votes.push({
          agent: agent.name,
          vote: 'reject',
          confidence: 0,
          reasoning: 'Error occurred during voting'
        });
      }
    }
    
    // Consensus hesapla
    const approveVotes = votes.filter(v => v.vote === 'approve').length;
    const rejectVotes = votes.filter(v => v.vote === 'reject').length;
    const conditionalVotes = votes.filter(v => v.vote === 'conditional').length;
    const totalVotes = votes.length;
    
    const approvalRate = approveVotes / totalVotes;
    const conditions = votes
      .filter(v => v.vote === 'conditional')
      .flatMap(v => v.conditions || []);
    
    // Consensus kriterleri:
    // - %100 onay (ideal)
    // - %90+ onay ve hiç reject yok
    // - Conditional oylar için koşullar karşılanmış
    const isConsensus = 
      approvalRate === 1.0 || 
      (approvalRate >= 0.9 && rejectVotes === 0);
    
    return {
      isConsensus,
      approvalRate,
      totalVotes,
      approveVotes,
      rejectVotes,
      conditionalVotes,
      conditions,
      agentOpinions: votes
    };
  }
  
  /**
   * Çatışmaları çöz
   */
  resolveConflicts(
    consensus: ConsensusResult,
    decision: AgentDecision
  ): {
    resolved: boolean;
    newDecision?: AgentDecision;
    message?: string;
  } {
    if (consensus.isConsensus) {
      return { resolved: true };
    }
    
    // Reject oyları varsa
    if (consensus.rejectVotes > 0) {
      const rejectReasons = consensus.agentOpinions
        .filter(v => v.vote === 'reject')
        .map(v => `${v.agent}: ${v.reasoning}`)
        .join('; ');
      
      return {
        resolved: false,
        message: `Rejected by ${consensus.rejectVotes} agent(s): ${rejectReasons}`
      };
    }
    
    // Conditional oylar varsa
    if (consensus.conditionalVotes > 0) {
      return {
        resolved: false,
        message: `Conditions must be met: ${consensus.conditions.join(', ')}`,
        newDecision: {
          ...decision,
          data: {
            ...decision.data,
            conditions: consensus.conditions
          }
        }
      };
    }
    
    // Approval rate düşük
    return {
      resolved: false,
      message: `Low approval rate: ${(consensus.approvalRate * 100).toFixed(1)}%`
    };
  }
}
```

#### Adım 4: Zero Error Protocol

**`lib/ai/zero-error-protocol.ts`**
```typescript
import { AgentDecision, ProtocolResult, LayerResult } from './types/protocol.types';
import { BaseAgent } from './agents/base-agent';
import { ConsensusEngine } from './consensus-engine';
import { createClient } from '@/lib/supabase/server';
import { agentLogger } from './utils/logger';

export class ZeroErrorProtocol {
  private consensusEngine: ConsensusEngine;
  
  constructor() {
    this.consensusEngine = new ConsensusEngine();
  }
  
  /**
   * Protokolü çalıştır
   */
  async executeZeroErrorProtocol(
    decision: AgentDecision,
    agents: BaseAgent[],
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<ProtocolResult> {
    const result: ProtocolResult = {
      decision,
      layers: {},
      finalDecision: 'rejected',
      errors: [],
      warnings: []
    };
    
    // KATMAN 1: Self-Validation
    const layer1 = await this.layer1_SelfValidation(decision);
    result.layers.layer1 = layer1;
    if (!layer1.passed) {
      result.errors.push('Layer 1 (Self-Validation) failed');
      return result;
    }
    
    // KATMAN 2: Cross-Validation
    const layer2 = await this.layer2_CrossValidation(decision, agents);
    result.layers.layer2 = layer2;
    if (!layer2.passed) {
      result.errors.push('Layer 2 (Cross-Validation) failed');
      return result;
    }
    
    // KATMAN 3: Consensus
    const layer3 = await this.layer3_Consensus(decision, agents);
    result.layers.layer3 = layer3;
    if (!layer3.passed) {
      result.errors.push('Layer 3 (Consensus) failed');
      return result;
    }
    
    // KATMAN 4: Database Validation
    const layer4 = await this.layer4_DatabaseValidation(decision);
    result.layers.layer4 = layer4;
    if (!layer4.passed) {
      result.errors.push('Layer 4 (Database Validation) failed');
      return result;
    }
    
    // KATMAN 5: Human Approval
    const layer5 = await this.layer5_HumanApproval(decision, severity);
    result.layers.layer5 = layer5;
    if (layer5.passed === false) {
      result.finalDecision = 'pending_approval';
      return result;
    }
    
    // TÜM KATMANLAR GEÇTİ
    result.finalDecision = 'approved';
    
    agentLogger.log({
      action: 'protocol_passed',
      decision: decision.action,
      agent: decision.agent,
      severity
    });
    
    return result;
  }
  
  /**
   * KATMAN 1: Self-Validation
   */
  private async layer1_SelfValidation(decision: AgentDecision): Promise<LayerResult> {
    // Confidence kontrolü
    if (decision.confidence < 0.95) {
      return {
        passed: false,
        errors: [`Low confidence: ${decision.confidence}`]
      };
    }
    
    // Reasoning kontrolü
    if (!decision.reasoning || decision.reasoning.length < 10) {
      return {
        passed: false,
        errors: ['Insufficient reasoning']
      };
    }
    
    // Data kontrolü
    if (!decision.data) {
      return {
        passed: false,
        errors: ['Missing data']
      };
    }
    
    return { passed: true };
  }
  
  /**
   * KATMAN 2: Cross-Validation
   */
  private async layer2_CrossValidation(
    decision: AgentDecision,
    agents: BaseAgent[]
  ): Promise<LayerResult> {
    const relatedAgents = this.getRelatedAgents(decision.agent, agents);
    const validations = await Promise.all(
      relatedAgents.map(agent => agent.validateWithOtherAgents(decision.data))
    );
    
    const allValid = validations.every(v => v.isValid);
    const issues = validations.flatMap(v => v.issues || []);
    
    return {
      passed: allValid,
      errors: allValid ? [] : issues,
      details: { validations }
    };
  }
  
  /**
   * KATMAN 3: Consensus
   */
  private async layer3_Consensus(
    decision: AgentDecision,
    agents: BaseAgent[]
  ): Promise<LayerResult> {
    const consensus = await this.consensusEngine.buildConsensus(decision, agents);
    
    if (!consensus.isConsensus) {
      const conflict = this.consensusEngine.resolveConflicts(consensus, decision);
      return {
        passed: false,
        errors: [conflict.message || 'No consensus reached'],
        details: { consensus, conflict }
      };
    }
    
    return {
      passed: true,
      details: { consensus }
    };
  }
  
  /**
   * KATMAN 4: Database Validation
   */
  private async layer4_DatabaseValidation(decision: AgentDecision): Promise<LayerResult> {
    const supabase = await createClient();
    const errors: string[] = [];
    
    // Order approval için stok kontrolü
    if (decision.action === 'approve_order') {
      const orderId = decision.data.orderId;
      // Stok kontrolü yap
      // ... implementation
    }
    
    // Production plan için BOM kontrolü
    if (decision.action === 'create_production_plan') {
      // BOM kontrolü yap
      // ... implementation
    }
    
    return {
      passed: errors.length === 0,
      errors
    };
  }
  
  /**
   * KATMAN 5: Human Approval
   */
  private async layer5_HumanApproval(
    decision: AgentDecision,
    severity: string
  ): Promise<LayerResult> {
    const requiresApproval = 
      severity === 'critical' || 
      (severity === 'high' && decision.action?.includes('delete'));
    
    if (!requiresApproval) {
      return { passed: true };
    }
    
    // Human approval için notification oluştur
    // ... implementation
    
    return {
      passed: false, // Pending approval
      details: { requiresApproval: true, status: 'pending' }
    };
  }
  
  /**
   * İlgili agent'ları bul
   */
  private getRelatedAgents(agentName: string, agents: BaseAgent[]): BaseAgent[] {
    const relationships: Record<string, string[]> = {
      planning: ['warehouse', 'production', 'purchase'],
      warehouse: ['planning', 'purchase', 'production'],
      production: ['warehouse', 'planning'],
      purchase: ['warehouse', 'planning']
    };
    
    const related = relationships[agentName.toLowerCase()] || [];
    return agents.filter(a => related.includes(a.role.toLowerCase()));
  }
}
```

#### Adım 5: Orchestrator

**`lib/ai/orchestrator.ts`**
```typescript
import { BaseAgent } from './agents/base-agent';
import { PlanningAgent } from './agents/planning-agent';
import { WarehouseAgent } from './agents/warehouse-agent';
import { ProductionAgent } from './agents/production-agent';
import { PurchaseAgent } from './agents/purchase-agent';
import { ManagerAgent } from './agents/manager-agent';
import { DeveloperAgent } from './agents/developer-agent';
import { ZeroErrorProtocol } from './zero-error-protocol';
import { AgentEventBus } from './event-bus';
import { AgentRequest, ConversationResult } from './types/message.types';
import { createClient } from '@/lib/supabase/server';

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent>;
  private zeroErrorProtocol: ZeroErrorProtocol;
  private eventBus: AgentEventBus;
  private conversationHistory: any[] = [];
  
  constructor() {
    this.eventBus = AgentEventBus.getInstance();
    this.zeroErrorProtocol = new ZeroErrorProtocol();
    
    // Agent'ları oluştur
    this.agents = new Map([
      ['planning', new PlanningAgent()],
      ['warehouse', new WarehouseAgent()],
      ['production', new ProductionAgent()],
      ['purchase', new PurchaseAgent()],
      ['manager', new ManagerAgent()],
      ['developer', new DeveloperAgent()]
    ]);
    
    // Event bus'a kaydet
    this.agents.forEach(agent => {
      this.eventBus.registerAgent(agent);
    });
  }
  
  /**
   * Multi-agent konuşma başlat
   */
  async startConversation(
    initiator: string,
    request: AgentRequest
  ): Promise<ConversationResult> {
    const initiatorAgent = this.agents.get(initiator.toLowerCase());
    if (!initiatorAgent) {
      throw new Error(`Agent not found: ${initiator}`);
    }
    
    // 1. İlk agent işlemi başlatır
    const initialResponse = await initiatorAgent.processRequest(request);
    this.conversationHistory.push({
      agent: initiator,
      message: request.prompt,
      response: initialResponse,
      timestamp: new Date()
    });
    
    // 2. İlgili agent'lara sor
    const relatedAgents = this.getRelatedAgents(initiator, request);
    const agentResponses = [];
    
    for (const agentName of relatedAgents) {
      const agent = this.agents.get(agentName);
      if (!agent) continue;
      
      const question = this.generateQuestionForAgent(initiator, agentName, initialResponse);
      const response = await agent.processRequest({
        id: `req_${Date.now()}`,
        prompt: question,
        type: 'query',
        context: {
          initiator,
          previousResponse: initialResponse,
          conversationHistory: this.conversationHistory
        }
      });
      
      agentResponses.push(response);
      this.conversationHistory.push({
        agent: agentName,
        message: question,
        response,
        timestamp: new Date()
      });
    }
    
    // 3. Consensus oluştur
    const consensus = await this.buildConsensus(initialResponse, agentResponses);
    
    // 4. 0 Hata Protokolü çalıştır
    const protocolResult = await this.zeroErrorProtocol.executeZeroErrorProtocol(
      {
        agent: initiator,
        action: initialResponse.action || 'unknown',
        data: initialResponse.data,
        reasoning: initialResponse.reasoning,
        confidence: initialResponse.confidence,
        severity: request.severity || 'medium'
      },
      Array.from(this.agents.values()),
      request.severity || 'medium'
    );
    
    return {
      initiator,
      finalDecision: protocolResult.finalDecision,
      agentConversations: this.conversationHistory,
      consensus,
      protocolResult
    };
  }
  
  /**
   * İlgili agent'ları belirle
   */
  private getRelatedAgents(initiator: string, request: AgentRequest): string[] {
    const relationships: Record<string, string[]> = {
      planning: ['warehouse', 'production', 'purchase'],
      warehouse: ['planning', 'purchase', 'production'],
      production: ['warehouse', 'planning'],
      purchase: ['warehouse', 'planning']
    };
    
    return relationships[initiator.toLowerCase()] || [];
  }
  
  /**
   * Agent'a özel soru oluştur
   */
  private generateQuestionForAgent(
    from: string,
    to: string,
    context: any
  ): string {
    const questions: Record<string, Record<string, string>> = {
      planning: {
        warehouse: 'Bu üretim planı için gerekli malzemeler stokta mevcut mu?',
        production: 'Bu plan için operatör kapasitesi var mı?',
        purchase: 'Eksik malzemeler için tedarik süresi ne kadar?'
      }
      // ... diğer agent'lar için
    };
    
    return questions[from]?.[to] || 'Bu konuda görüşün nedir?';
  }
  
  /**
   * Consensus oluştur
   */
  private async buildConsensus(initialResponse: any, agentResponses: any[]): Promise<any> {
    const allResponses = [initialResponse, ...agentResponses];
    const approvals = allResponses.filter(r => r.decision === 'approve').length;
    const total = allResponses.length;
    
    return {
      isConsensus: approvals === total,
      approvalRate: approvals / total,
      totalAgents: total,
      approvals,
      rejections: total - approvals
    };
  }
}
```

---

## 4️⃣ API Entegrasyonu

### Mevcut Durum
- ❌ Agent'ları çağıracak API endpoint'leri yok
- ❌ Mevcut API'lere agent hook'ları yok
- ❌ Agent kararlarını uygulayacak entegrasyon noktaları yok

### Implementasyon Planı

#### Adım 1: Agent API Endpoints

**`app/api/ai/agents/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agent, prompt, type, context, urgency, severity } = body;
    
    if (!agent || !prompt) {
      return NextResponse.json(
        { error: 'Agent and prompt are required' },
        { status: 400 }
      );
    }
    
    const orchestrator = new AgentOrchestrator();
    const result = await orchestrator.startConversation(agent, {
      id: `req_${Date.now()}`,
      prompt,
      type: type || 'query',
      context,
      urgency: urgency || 'medium',
      severity: severity || 'medium'
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Agent API error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**`app/api/ai/agents/[agent]/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';

export async function POST(
  request: NextRequest,
  { params }: { params: { agent: string } }
) {
  try {
    const body = await request.json();
    const orchestrator = new AgentOrchestrator();
    
    const result = await orchestrator.startConversation(params.agent, {
      id: `req_${Date.now()}`,
      prompt: body.prompt,
      type: body.type || 'query',
      context: body.context,
      urgency: body.urgency || 'medium',
      severity: body.severity || 'medium'
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### Adım 2: Mevcut API'lere Agent Hook'ları

**`app/api/orders/[id]/approve/route.ts` - Agent Entegrasyonu:**
```typescript
import { AgentOrchestrator } from '@/lib/ai/orchestrator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ... mevcut kod ...
  
  // Agent kontrolü (opsiyonel)
  if (process.env.AGENT_ENABLED === 'true') {
    try {
      const orchestrator = new AgentOrchestrator();
      const agentResult = await orchestrator.startConversation('planning', {
        id: `order_approve_${params.id}`,
        prompt: `Bu siparişi onaylamak istiyorum: Order #${params.id}`,
        type: 'request',
        context: { orderId: params.id, orderData },
        urgency: 'high',
        severity: 'high'
      });
      
      if (agentResult.finalDecision === 'rejected') {
        return NextResponse.json(
          { error: 'Agent validation failed', details: agentResult.protocolResult.errors },
          { status: 400 }
        );
      }
      
      // Agent onayladıysa devam et
    } catch (error) {
      // Agent hatası durumunda manuel onay devam eder
      logger.warn('Agent validation failed, continuing with manual approval:', error);
    }
  }
  
  // ... mevcut onay logic'i ...
}
```

---

## 5️⃣ Monitoring ve Logging

### Mevcut Durum
- ❌ Agent kararlarını loglayacak sistem yok
- ❌ Agent performans dashboard'u yok
- ❌ Consensus sonuçlarını görselleştirme yok

### Implementasyon Planı

#### Adım 1: Agent Logger

**`lib/ai/utils/logger.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';

interface LogEntry {
  agent?: string;
  action: string;
  [key: string]: any;
}

class AgentLogger {
  private logs: LogEntry[] = [];
  private maxMemoryLogs = 1000;
  
  async log(entry: LogEntry) {
    this.logs.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    // Memory'de çok log birikirse temizle
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs = this.logs.slice(-this.maxMemoryLogs);
    }
    
    // Database'e kaydet (opsiyonel)
    if (process.env.AGENT_LOGGING_ENABLED === 'true') {
      try {
        const supabase = await createClient();
        await supabase.from('agent_logs').insert({
          agent: entry.agent,
          action: entry.action,
          data: entry,
          created_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save agent log:', error);
      }
    }
  }
  
  error(entry: LogEntry) {
    this.log({ ...entry, level: 'error' });
  }
  
  getLogs(agent?: string, limit = 100): LogEntry[] {
    let filtered = this.logs;
    if (agent) {
      filtered = filtered.filter(l => l.agent === agent);
    }
    return filtered.slice(-limit);
  }
}

export const agentLogger = new AgentLogger();
```

#### Adım 2: Database Schema - Agent Logs

**`supabase/migrations/XXXXX_create_agent_logs.sql`**
```sql
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent VARCHAR(50),
  action VARCHAR(100),
  data JSONB,
  level VARCHAR(20) DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_agent_logs_agent ON agent_logs(agent);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at);
CREATE INDEX idx_agent_logs_action ON agent_logs(action);
```

#### Adım 3: Agent Dashboard API

**`app/api/ai/dashboard/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { agentLogger } from '@/lib/ai/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Agent log istatistikleri
    const { data: logs } = await supabase
      .from('agent_logs')
      .select('agent, action, level, created_at')
      .order('created_at', { ascending: false })
      .limit(1000);
    
    // Agent başına istatistikler
    const stats = logs?.reduce((acc: any, log: any) => {
      const agent = log.agent || 'unknown';
      if (!acc[agent]) {
        acc[agent] = {
          total: 0,
          errors: 0,
          successes: 0,
          actions: {}
        };
      }
      acc[agent].total++;
      if (log.level === 'error') acc[agent].errors++;
      else acc[agent].successes++;
      
      const action = log.action || 'unknown';
      acc[agent].actions[action] = (acc[agent].actions[action] || 0) + 1;
      
      return acc;
    }, {}) || {};
    
    return NextResponse.json({
      stats,
      recentLogs: logs?.slice(0, 100) || [],
      memoryLogs: agentLogger.getLogs()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

#### Adım 4: Frontend Dashboard

**`app/(dashboard)/ai-dashboard/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AIDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  
  useEffect(() => {
    fetch('/api/ai/dashboard')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);
  
  if (!stats) return <div>Loading...</div>;
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">AI Agent Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(stats.stats).map(([agent, data]: [string, any]) => (
          <Card key={agent}>
            <CardHeader>
              <CardTitle>{agent}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Total: {data.total}</p>
                <p>Success: {data.successes}</p>
                <p>Errors: {data.errors}</p>
                <p>Success Rate: {((data.successes / data.total) * 100).toFixed(1)}%</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## 6️⃣ Test Altyapısı

### Mevcut Durum
- ❌ Agent test senaryoları yok
- ❌ Integration testleri yok

### Implementasyon Planı

#### Adım 1: Test Utilities

**`lib/ai/__tests__/test-utils.ts`**
```typescript
import { BaseAgent } from '../agents/base-agent';
import { AgentOrchestrator } from '../orchestrator';

export class MockAgent extends BaseAgent {
  constructor(name: string) {
    super(
      name,
      name.toLowerCase(),
      [],
      `You are a test agent: ${name}`,
      'gpt-4o-mini' // Test için mini model
    );
  }
  
  async processRequest(request: any): Promise<any> {
    return {
      id: `test_${Date.now()}`,
      agent: this.name,
      decision: 'approve',
      reasoning: 'Test response',
      confidence: 0.95,
      timestamp: new Date()
    };
  }
  
  async validateWithOtherAgents(data: any): Promise<any> {
    return {
      isValid: true,
      issues: [],
      recommendations: [],
      confidence: 0.95
    };
  }
}

export function createTestOrchestrator(): AgentOrchestrator {
  return new AgentOrchestrator();
}
```

#### Adım 2: Unit Tests

**`lib/ai/__tests__/base-agent.test.ts`**
```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { MockAgent } from './test-utils';

describe('BaseAgent', () => {
  let agent: MockAgent;
  
  beforeEach(() => {
    agent = new MockAgent('TestAgent');
  });
  
  it('should create agent with correct name', () => {
    expect(agent.name).toBe('TestAgent');
  });
  
  it('should process request', async () => {
    const response = await agent.processRequest({
      id: 'test1',
      prompt: 'Test prompt',
      type: 'query'
    });
    
    expect(response).toBeDefined();
    expect(response.decision).toBe('approve');
  });
});
```

#### Adım 3: Integration Tests

**`lib/ai/__tests__/orchestrator.integration.test.ts`**
```typescript
import { describe, it, expect } from '@jest/globals';
import { createTestOrchestrator } from './test-utils';

describe('AgentOrchestrator Integration', () => {
  it('should start conversation between agents', async () => {
    const orchestrator = createTestOrchestrator();
    
    const result = await orchestrator.startConversation('planning', {
      id: 'test1',
      prompt: 'Test order approval',
      type: 'request',
      urgency: 'medium',
      severity: 'medium'
    });
    
    expect(result).toBeDefined();
    expect(result.initiator).toBe('planning');
    expect(result.agentConversations.length).toBeGreaterThan(0);
  });
});
```

#### Adım 4: E2E Test Senaryoları

**`lib/ai/__tests__/e2e/order-approval.test.ts`**
```typescript
import { describe, it, expect } from '@jest/globals';
import { AgentOrchestrator } from '../../orchestrator';

describe('Order Approval E2E', () => {
  it('should approve order with all validations', async () => {
    const orchestrator = new AgentOrchestrator();
    
    const result = await orchestrator.startConversation('planning', {
      id: 'order_123',
      prompt: 'Approve order #123',
      type: 'request',
      context: {
        orderId: '123',
        products: [{ id: '1', quantity: 10 }]
      },
      urgency: 'high',
      severity: 'high'
    });
    
    expect(result.finalDecision).toBe('approved');
    expect(result.consensus.isConsensus).toBe(true);
  });
});
```

---

## 📋 Implementasyon Checklist

### Faz 1: Temel Altyapı
- [ ] `lib/ai/` klasör yapısını oluştur
- [ ] Type definitions ekle
- [ ] BaseAgent sınıfını implement et
- [ ] OpenAI client wrapper oluştur
- [ ] Event Bus sistemi kur
- [ ] Model Selection Strategy implement et

### Faz 2: Agent'lar
- [ ] Planning Agent
- [ ] Warehouse Agent
- [ ] Production Agent
- [ ] Purchase Agent
- [ ] Manager Agent
- [ ] Developer Agent

### Faz 3: Altyapı
- [ ] Consensus Engine
- [ ] Zero Error Protocol
- [ ] Orchestrator

### Faz 4: API Entegrasyonu
- [ ] Agent API endpoints
- [ ] Mevcut API'lere hook'lar
- [ ] Order approval entegrasyonu

### Faz 5: Monitoring
- [ ] Agent logger
- [ ] Database schema (agent_logs)
- [ ] Dashboard API
- [ ] Frontend dashboard

### Faz 6: Testing
- [ ] Test utilities
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests

---

## ❓ Kritik Sorular ve Eksik Detaylar

### 1. Human Approval Sistemi

**Soru:** Human-in-the-Loop için database tablosu ve UI gerekli mi?

**Eksik:**
- `human_approvals` tablosu yok
- Approval UI component'i yok
- Notification sistemi entegrasyonu eksik

**Önerilen Çözüm:**
```sql
-- supabase/migrations/XXXXX_create_human_approvals.sql
CREATE TABLE IF NOT EXISTS human_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id VARCHAR(255) NOT NULL, -- Agent decision ID
  agent VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  reasoning TEXT,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  expiry_at TIMESTAMP WITH TIME ZONE, -- 24 saat sonra expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_human_approvals_status ON human_approvals(status);
CREATE INDEX idx_human_approvals_requested_by ON human_approvals(requested_by);
CREATE INDEX idx_human_approvals_expiry ON human_approvals(expiry_at);
```

### 2. Rate Limiting Implementasyonu

**Soru:** OpenAI API rate limit'leri nasıl yönetilecek?

**Eksik:**
- Rate limiting middleware yok
- Token bucket veya sliding window implementasyonu yok
- Queue sistemi yok

**Önerilen Çözüm:**
```typescript
// lib/ai/utils/rate-limiter.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export class AgentRateLimiter {
  private limiter: Ratelimit;
  
  constructor() {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
    
    this.limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
      analytics: true
    });
  }
  
  async checkLimit(agent: string): Promise<{ allowed: boolean; remaining: number }> {
    const { success, remaining } = await this.limiter.limit(`agent:${agent}`);
    return { allowed: success, remaining };
  }
}
```

### 3. Caching Stratejisi

**Soru:** Agent yanıtları nasıl cache'lenecek?

**Eksik:**
- Cache implementasyonu yok
- Cache invalidation stratejisi yok
- Redis/In-memory cache seçimi yok

**Önerilen Çözüm:**
```typescript
// lib/ai/utils/cache.ts
import { Redis } from '@upstash/redis';

export class AgentCache {
  private redis: Redis;
  private defaultTTL = 3600; // 1 saat
  
  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!
    });
  }
  
  async get(key: string): Promise<any | null> {
    const cached = await this.redis.get(`agent:cache:${key}`);
    return cached;
  }
  
  async set(key: string, value: any, ttl = this.defaultTTL): Promise<void> {
    await this.redis.setex(`agent:cache:${key}`, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Pattern-based invalidation
  }
}
```

### 4. Cost Estimation ve Monitoring

**Soru:** OpenAI API maliyetleri nasıl takip edilecek?

**Eksik:**
- Cost tracking yok
- Budget alerts yok
- Token usage analytics yok

**Önerilen Çözüm:**
```typescript
// lib/ai/utils/cost-tracker.ts
interface CostEntry {
  agent: string;
  model: string;
  tokens: number;
  cost: number; // USD
  timestamp: Date;
}

export class CostTracker {
  async trackUsage(agent: string, model: string, tokens: number) {
    const cost = this.calculateCost(model, tokens);
    // Database'e kaydet
    // Budget kontrolü yap
    // Alert gönder (eğer limit aşıldıysa)
  }
  
  private calculateCost(model: string, tokens: number): number {
    const prices: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 }, // per 1K tokens
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 }
    };
    
    const price = prices[model] || prices['gpt-4o'];
    return (tokens / 1000) * price.input; // Simplified
  }
}
```

### 5. Error Recovery ve Retry Strategy

**Soru:** OpenAI API hatalarında ne yapılacak?

**Eksik:**
- Retry logic yok
- Circuit breaker yok
- Fallback stratejisi yok

**Önerilen Çözüm:**
```typescript
// lib/ai/utils/retry-handler.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  backoffMs = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 6. Deployment Checklist

**Eksik:**
- Production deployment adımları yok
- Environment variables checklist yok
- Health check endpoints yok

**Önerilen Checklist:**
```markdown
### Pre-Deployment
- [ ] OpenAI API key configured
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Rate limiting configured
- [ ] Caching configured
- [ ] Monitoring setup

### Post-Deployment
- [ ] Health check endpoint tested
- [ ] Agent initialization verified
- [ ] First agent request successful
- [ ] Logging working
- [ ] Dashboard accessible
```

### 7. Troubleshooting Guide

**Eksik:**
- Common errors ve çözümleri yok
- Debugging stratejisi yok

**Önerilen Bölüm:**
```markdown
## 🔧 Troubleshooting

### Agent yanıt vermiyor
1. OpenAI API key kontrolü
2. Rate limit kontrolü
3. Network connectivity
4. Agent log'larını kontrol et

### Consensus oluşmuyor
1. Agent'ların çalıştığını kontrol et
2. Event bus bağlantısını kontrol et
3. Timeout değerlerini artır

### Yüksek maliyet
1. Model seçimini kontrol et
2. Cache kullanımını artır
3. Rate limiting'i optimize et
```

---

## 📊 Maliyet Tahmini

### Aylık Tahmini Maliyet (1000 request/gün)

| Agent | Model | Requests/Gün | Tokens/Request | Aylık Maliyet (USD) |
|-------|-------|--------------|----------------|---------------------|
| Planning | gpt-4o | 200 | 2000 | ~$60 |
| Warehouse | gpt-4o-mini | 300 | 500 | ~$2.25 |
| Production | gpt-4o | 150 | 2000 | ~$45 |
| Purchase | gpt-4o | 100 | 2000 | ~$30 |
| Manager | gpt-4o | 50 | 3000 | ~$22.5 |
| Developer | gpt-4o | 200 | 5000 | ~$150 |

**Toplam Tahmini:** ~$310/ay (1000 request/gün)

**Optimizasyon ile:** ~$100-150/ay (caching + mini model kullanımı)

---

## ✅ Karar Verilen Konular

### 1. Human Approval UI

**Karar:** ✅ **İnsan kontrollü sistem - Sonra tam otonom geçiş**

**Detaylar:**
- ✅ Onay/Red ekranı **GEREKLİ** - İnsan kontrolü için kritik
- ✅ Mevcut notification sistemi **ENTEGRE EDİLECEK**
- ✅ Approval history **GÖRÜNTÜLENECEK**

**Implementasyon Planı:**

#### Adım 1: Database Schema

**`supabase/migrations/XXXXX_create_human_approvals.sql`**
```sql
-- Human Approvals Tablosu
CREATE TABLE IF NOT EXISTS human_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id VARCHAR(255) NOT NULL UNIQUE, -- Agent decision ID
  agent VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  data JSONB NOT NULL,
  reasoning TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  requested_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  rejected_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  expiry_at TIMESTAMP WITH TIME ZONE, -- 24 saat sonra expire
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_human_approvals_status ON human_approvals(status);
CREATE INDEX idx_human_approvals_requested_by ON human_approvals(requested_by);
CREATE INDEX idx_human_approvals_approved_by ON human_approvals(approved_by);
CREATE INDEX idx_human_approvals_expiry ON human_approvals(expiry_at);
CREATE INDEX idx_human_approvals_agent ON human_approvals(agent);
CREATE INDEX idx_human_approvals_created ON human_approvals(created_at DESC);

-- Expiry trigger (24 saat sonra otomatik expire)
CREATE OR REPLACE FUNCTION expire_old_approvals()
RETURNS void AS $$
BEGIN
  UPDATE human_approvals
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
    AND expiry_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE human_approvals ENABLE ROW LEVEL SECURITY;

-- Yönetici ve planlama rolleri görebilir
CREATE POLICY "human_approvals_select_policy" ON human_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()
      AND users.role IN ('yonetici', 'planlama')
    )
  );

-- Sistem approval oluşturabilir
CREATE POLICY "human_approvals_insert_policy" ON human_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Sadece yönetici onaylayabilir/reddedebilir
CREATE POLICY "human_approvals_update_policy" ON human_approvals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()
      AND users.role = 'yonetici'
    )
  );
```

#### Adım 2: Approval UI Component

**`components/ai/human-approval-panel.tsx`**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HumanApproval {
  id: string;
  decision_id: string;
  agent: string;
  action: string;
  data: any;
  reasoning: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
  expiry_at: string;
}

export function HumanApprovalPanel() {
  const [approvals, setApprovals] = useState<HumanApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApprovals();
    // Real-time updates için polling (5 saniyede bir)
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/ai/approvals');
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/approvals/${id}/approve`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchApprovals();
        // Notification gönder
      }
    } catch (error) {
      console.error('Error approving:', error);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const res = await fetch(`/api/ai/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        fetchApprovals();
      }
    } catch (error) {
      console.error('Error rejecting:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">AI Karar Onayları</h2>
      
      {pendingApprovals.length === 0 ? (
        <Alert>
          <AlertDescription>Bekleyen onay bulunmuyor.</AlertDescription>
        </Alert>
      ) : (
        pendingApprovals.map(approval => (
          <Card key={approval.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{approval.agent} - {approval.action}</CardTitle>
                  <Badge variant={
                    approval.severity === 'critical' ? 'destructive' :
                    approval.severity === 'high' ? 'default' : 'secondary'
                  }>
                    {approval.severity}
                  </Badge>
                </div>
                <Badge variant="outline">
                  {new Date(approval.expiry_at).toLocaleString('tr-TR')} sonra expire
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">Gerekçe:</h4>
                  <p className="text-sm text-muted-foreground">{approval.reasoning}</p>
                </div>
                
                <div>
                  <h4 className="font-semibold">Detaylar:</h4>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(approval.data, null, 2)}
                  </pre>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={() => handleApprove(approval.id)}
                    variant="default"
                  >
                    Onayla
                  </Button>
                  <Button 
                    onClick={() => {
                      const reason = prompt('Red nedeni:');
                      if (reason) handleReject(approval.id, reason);
                    }}
                    variant="destructive"
                  >
                    Reddet
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
```

#### Adım 3: Approval History Component

**`components/ai/approval-history.tsx`**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function ApprovalHistory() {
  const [history, setHistory] = useState<any[]>([]);
  
  useEffect(() => {
    fetch('/api/ai/approvals/history')
      .then(res => res.json())
      .then(data => setHistory(data.history || []));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Onay Geçmişi</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Onaylayan</TableHead>
              <TableHead>Tarih</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.agent}</TableCell>
                <TableCell>{item.action}</TableCell>
                <TableCell>
                  <Badge variant={
                    item.status === 'approved' ? 'default' :
                    item.status === 'rejected' ? 'destructive' : 'secondary'
                  }>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell>{item.severity}</TableCell>
                <TableCell>{item.approved_by_name || item.rejected_by_name || '-'}</TableCell>
                <TableCell>{new Date(item.created_at).toLocaleString('tr-TR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
```

#### Adım 4: Notification Entegrasyonu

**`lib/ai/utils/approval-notifier.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';

export async function createApprovalNotification(
  approvalId: string,
  agent: string,
  action: string,
  severity: string
) {
  const supabase = await createClient();
  
  // Yönetici rolündeki kullanıcıları bul
  const { data: admins } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'yonetici');
  
  if (!admins) return;
  
  // Her yöneticiye notification gönder
  const notifications = admins.map(admin => ({
    type: 'ai_approval_required',
    title: `AI Karar Onayı Gerekli - ${agent}`,
    message: `${agent} agent'ı "${action}" işlemi için onay bekliyor.`,
    severity: severity === 'critical' ? 'critical' : 'high',
    user_id: admin.id,
    data: { approval_id: approvalId, agent, action }
  }));
  
  await supabase.from('notifications').insert(notifications);
}
```

#### Adım 5: API Endpoints

**`app/api/ai/approvals/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const { data: approvals, error } = await supabase
      .from('human_approvals')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ approvals });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**`app/api/ai/approvals/[id]/approve/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Only admins can approve' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Approval'ı güncelle
    const { data: approval, error: updateError } = await supabase
      .from('human_approvals')
      .update({
        status: 'approved',
        approved_by: payload.userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !approval) {
      return NextResponse.json({ error: 'Approval not found' }, { status: 404 });
    }

    // Agent kararını uygula
    const orchestrator = new AgentOrchestrator();
    // ... kararı uygula

    // Notification gönder
    await supabase.from('notifications').insert({
      type: 'ai_approval_approved',
      title: 'AI Karar Onaylandı',
      message: `${approval.agent} agent'ının "${approval.action}" kararı onaylandı.`,
      severity: 'low',
      data: { approval_id: id }
    });

    return NextResponse.json({ success: true, approval });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**`app/api/ai/approvals/[id]/reject/route.ts`**
```typescript
// Benzer yapı, status: 'rejected' ve rejection_reason ekle
```

**`app/api/ai/approvals/history/route.ts`**
```typescript
// Approval history endpoint
```

---

### 2. Infrastructure (Localhost)

**Karar:** ✅ **Localhost için optimize edilmiş çözüm**

**Detaylar:**
- ✅ In-memory cache (Node.js Map) - Redis gerekmez
- ✅ Simple rate limiting (in-memory counter)
- ✅ File-based logging (opsiyonel database logging)

**Implementasyon:**

#### Adım 1: In-Memory Cache

**`lib/ai/utils/cache.ts`**
```typescript
class InMemoryCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  private defaultTTL = 3600 * 1000; // 1 saat (ms)
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  set(key: string, value: any, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Expired items'ı temizle (periodic cleanup)
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const agentCache = new InMemoryCache();

// Her 5 dakikada bir cleanup
setInterval(() => agentCache.cleanup(), 5 * 60 * 1000);
```

#### Adım 2: Simple Rate Limiting

**`lib/ai/utils/rate-limiter.ts`**
```typescript
class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests = 100, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  checkLimit(agent: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const key = agent;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const agentRequests = this.requests.get(key)!;
    
    // Eski request'leri temizle
    const validRequests = agentRequests.filter(time => now - time < this.windowMs);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    // Yeni request ekle
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return { 
      allowed: true, 
      remaining: this.maxRequests - validRequests.length 
    };
  }
  
  reset(agent?: string): void {
    if (agent) {
      this.requests.delete(agent);
    } else {
      this.requests.clear();
    }
  }
}

export const rateLimiter = new SimpleRateLimiter(
  parseInt(process.env.GPT_RATE_LIMIT_PER_AGENT || '100'),
  60 * 1000 // 1 dakika
);
```

---

### 3. Cost Management

**Karar:** ✅ **Limit belirlenecek, aşıldığında Stop/Alert, Admin görecek**

**Detaylar:**
- ✅ Günlük limit: **$50/gün** (ayarlanabilir)
- ✅ Haftalık limit: **$300/hafta** (ayarlanabilir)
- ✅ Limit aşıldığında: **STOP + ALERT**
- ✅ Cost reporting: **Sadece Admin görür**

**Implementasyon:**

#### Adım 1: Cost Tracking Database

**`supabase/migrations/XXXXX_create_agent_costs.sql`**
```sql
-- Agent Cost Tracking Tablosu
CREATE TABLE IF NOT EXISTS agent_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  request_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Günlük ve haftalık toplamlar için view
CREATE OR REPLACE VIEW agent_cost_summary AS
SELECT 
  DATE(created_at) as date,
  agent,
  SUM(cost_usd) as daily_cost,
  COUNT(*) as request_count
FROM agent_costs
GROUP BY DATE(created_at), agent;

-- Indexes
CREATE INDEX idx_agent_costs_created_at ON agent_costs(created_at);
CREATE INDEX idx_agent_costs_agent ON agent_costs(agent);
CREATE INDEX idx_agent_costs_date ON agent_costs(DATE(created_at));

-- RLS - Sadece admin görebilir
ALTER TABLE agent_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_costs_select_admin" ON agent_costs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid()
      AND users.role = 'yonetici'
    )
  );
```

#### Adım 2: Cost Tracker Implementation

**`lib/ai/utils/cost-tracker.ts`**
```typescript
import { createClient } from '@/lib/supabase/server';

interface CostEntry {
  agent: string;
  model: string;
  tokens: number;
  cost: number;
  requestId?: string;
}

class CostTracker {
  private dailyLimit = parseFloat(process.env.AGENT_DAILY_COST_LIMIT || '50');
  private weeklyLimit = parseFloat(process.env.AGENT_WEEKLY_COST_LIMIT || '300');
  
  async trackUsage(entry: CostEntry): Promise<{ allowed: boolean; reason?: string }> {
    const supabase = await createClient();
    
    // Cost'u database'e kaydet
    await supabase.from('agent_costs').insert({
      agent: entry.agent,
      model: entry.model,
      tokens_used: entry.tokens,
      cost_usd: entry.cost,
      request_id: entry.requestId
    });
    
    // Günlük limit kontrolü
    const dailyTotal = await this.getDailyTotal();
    if (dailyTotal >= this.dailyLimit) {
      await this.sendAlert('daily', dailyTotal);
      return { allowed: false, reason: `Daily limit exceeded: $${dailyTotal.toFixed(2)}` };
    }
    
    // Haftalık limit kontrolü
    const weeklyTotal = await this.getWeeklyTotal();
    if (weeklyTotal >= this.weeklyLimit) {
      await this.sendAlert('weekly', weeklyTotal);
      return { allowed: false, reason: `Weekly limit exceeded: $${weeklyTotal.toFixed(2)}` };
    }
    
    return { allowed: true };
  }
  
  private async getDailyTotal(): Promise<number> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('agent_costs')
      .select('cost_usd')
      .gte('created_at', `${today}T00:00:00`);
    
    return data?.reduce((sum, item) => sum + parseFloat(item.cost_usd), 0) || 0;
  }
  
  private async getWeeklyTotal(): Promise<number> {
    const supabase = await createClient();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data } = await supabase
      .from('agent_costs')
      .select('cost_usd')
      .gte('created_at', weekAgo.toISOString());
    
    return data?.reduce((sum, item) => sum + parseFloat(item.cost_usd), 0) || 0;
  }
  
  private async sendAlert(type: 'daily' | 'weekly', total: number): Promise<void> {
    const supabase = await createClient();
    
    // Admin'lere notification gönder
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'yonetici');
    
    if (admins) {
      const notifications = admins.map(admin => ({
        type: 'cost_limit_exceeded',
        title: `💰 AI Maliyet Limiti Aşıldı`,
        message: `${type === 'daily' ? 'Günlük' : 'Haftalık'} limit aşıldı: $${total.toFixed(2)}`,
        severity: 'critical',
        user_id: admin.id,
        data: { type, total, limit: type === 'daily' ? this.dailyLimit : this.weeklyLimit }
      }));
      
      await supabase.from('notifications').insert(notifications);
    }
  }
  
  calculateCost(model: string, tokens: number): number {
    const prices: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 }, // per 1K tokens
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 }
    };
    
    const price = prices[model] || prices['gpt-4o'];
    // Basit hesaplama: %80 input, %20 output varsayımı
    const inputTokens = tokens * 0.8;
    const outputTokens = tokens * 0.2;
    
    return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
  }
}

export const costTracker = new CostTracker();
```

#### Adım 3: Cost Dashboard (Admin Only)

**`app/(dashboard)/ai-costs/page.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function AICostDashboardPage() {
  const [costs, setCosts] = useState<any>(null);
  
  useEffect(() => {
    fetch('/api/ai/costs')
      .then(res => res.json())
      .then(data => setCosts(data));
  }, []);
  
  if (!costs) return <div>Loading...</div>;
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">AI Maliyet Raporu (Admin)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Günlük Toplam</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${costs.dailyTotal?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-muted-foreground">
              Limit: ${costs.dailyLimit || '50.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Haftalık Toplam</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${costs.weeklyTotal?.toFixed(2) || '0.00'}</p>
            <p className="text-sm text-muted-foreground">
              Limit: ${costs.weeklyLimit || '300.00'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Aylık Tahmini</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${costs.monthlyEstimate?.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Günlük Maliyet Trendi</CardTitle>
        </CardHeader>
        <CardContent>
          <LineChart width={800} height={300} data={costs.dailyTrend || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="cost" stroke="#8884d8" />
            <Line type="monotone" dataKey="limit" stroke="#ff0000" strokeDasharray="5 5" />
          </LineChart>
        </CardContent>
      </Card>
    </div>
  );
}
```

**`app/api/ai/costs/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const supabase = await createClient();
    
    // Günlük toplam
    const today = new Date().toISOString().split('T')[0];
    const { data: daily } = await supabase
      .from('agent_costs')
      .select('cost_usd')
      .gte('created_at', `${today}T00:00:00`);
    
    const dailyTotal = daily?.reduce((sum, item) => sum + parseFloat(item.cost_usd), 0) || 0;
    
    // Haftalık toplam
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const { data: weekly } = await supabase
      .from('agent_costs')
      .select('cost_usd')
      .gte('created_at', weekAgo.toISOString());
    
    const weeklyTotal = weekly?.reduce((sum, item) => sum + parseFloat(item.cost_usd), 0) || 0;
    
    // Günlük trend (son 30 gün)
    const { data: trend } = await supabase
      .from('agent_costs')
      .select('created_at, cost_usd')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: true });
    
    // Group by date
    const dailyTrend = trend?.reduce((acc: any, item: any) => {
      const date = item.created_at.split('T')[0];
      if (!acc[date]) acc[date] = { date, cost: 0 };
      acc[date].cost += parseFloat(item.cost_usd);
      return acc;
    }, {}) || {};
    
    return NextResponse.json({
      dailyTotal,
      weeklyTotal,
      monthlyEstimate: (dailyTotal * 30),
      dailyLimit: parseFloat(process.env.AGENT_DAILY_COST_LIMIT || '50'),
      weeklyLimit: parseFloat(process.env.AGENT_WEEKLY_COST_LIMIT || '300'),
      dailyTrend: Object.values(dailyTrend)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

#### Adım 4: Cost Limit Check in BaseAgent

**`lib/ai/agents/base-agent.ts` - Güncelleme:**
```typescript
import { costTracker } from '../utils/cost-tracker';

// callGPT metoduna ekle:
protected async callGPT(...) {
  // ... mevcut kod ...
  
  const tokens = response.usage?.total_tokens || 0;
  const cost = costTracker.calculateCost(model, tokens);
  
  // Cost limit kontrolü
  const costCheck = await costTracker.trackUsage({
    agent: this.name,
    model,
    tokens,
    cost,
    requestId: request.id
  });
  
  if (!costCheck.allowed) {
    throw new Error(`Cost limit exceeded: ${costCheck.reason}`);
  }
  
  // ... devam ...
}
```

---

### 4. Testing Strategy

**Karar:** ✅ **Gerçek OpenAI API kullanılacak**

**Detaylar:**
- ✅ Test environment'da gerçek OpenAI API kullanılacak
- ✅ Test için ayrı API key kullanılabilir
- ✅ Test maliyetleri takip edilecek

**Implementasyon:**

#### Test Environment Configuration

**`.env.test`**
```bash
# Test Environment
OPENAI_API_KEY=sk-test-... # Test için ayrı key
AGENT_ENABLED=true
AGENT_TEST_MODE=true
AGENT_DAILY_COST_LIMIT=10  # Test için düşük limit
AGENT_WEEKLY_COST_LIMIT=50
```

#### Test Utilities Update

**`lib/ai/__tests__/test-utils.ts` - Güncelleme:**
```typescript
// Test modunda gerçek API kullan ama düşük limit'lerle
export function createTestOrchestrator(): AgentOrchestrator {
  // Test mode flag'i set et
  process.env.AGENT_TEST_MODE = 'true';
  process.env.AGENT_DAILY_COST_LIMIT = '10';
  
  return new AgentOrchestrator();
}
```

---

## 📋 Güncellenmiş Environment Variables

**`.env.local` - Final Version:**
```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Agent Models
GPT_MODEL_PLANNING=gpt-4o
GPT_MODEL_WAREHOUSE=gpt-4o-mini
GPT_MODEL_PRODUCTION=gpt-4o
GPT_MODEL_PURCHASE=gpt-4o
GPT_MODEL_MANAGER=gpt-4o
GPT_MODEL_DEVELOPER=gpt-4o

# Fallback Models
GPT_MODEL_FALLBACK=gpt-4-turbo
GPT_MODEL_BUDGET=gpt-4o-mini

# System Settings
AGENT_ENABLED=true
ZERO_ERROR_PROTOCOL_ENABLED=true
ENABLE_DYNAMIC_MODEL_SELECTION=true
ENABLE_MODEL_CACHING=true
MODEL_CACHE_TTL=3600

# Rate Limits (Localhost için)
GPT_RATE_LIMIT_PER_AGENT=100
GPT_RATE_LIMIT_TOTAL=1000

# Cost Management
AGENT_DAILY_COST_LIMIT=50
AGENT_WEEKLY_COST_LIMIT=300
AGENT_COST_ALERT_ENABLED=true

# Human Approval
HUMAN_APPROVAL_ENABLED=true
APPROVAL_EXPIRY_HOURS=24

# Logging
AGENT_LOGGING_ENABLED=true
```

---

## 🎯 Final Implementation Checklist

### ✅ Faz 1: Temel Altyapı + Human Approval (100%)
- [x] `lib/ai/` klasör yapısını oluştur
- [x] Type definitions ekle
- [x] BaseAgent sınıfını implement et (cost tracking ile)
- [x] OpenAI client wrapper oluştur
- [x] Event Bus sistemi kur
- [x] Model Selection Strategy implement et
- [x] **Human Approvals database schema**
- [x] **Approval UI components**
- [x] **Approval API endpoints**
- [x] **Notification entegrasyonu**

### ✅ Faz 2: Infrastructure (Localhost) (100%)
- [x] In-memory cache implement et
- [x] Simple rate limiter implement et
- [x] File-based logging (opsiyonel)

### ✅ Faz 3: Cost Management (100%)
- [x] Cost tracking database schema
- [x] Cost tracker implementation
- [x] Cost limit checks
- [x] Admin cost dashboard
- [x] Alert sistemi

### ✅ Faz 4: Agent'lar (100%)
- [x] Planning Agent
- [x] Warehouse Agent
- [x] Production Agent
- [x] Purchase Agent
- [x] Manager Agent
- [x] Developer Agent

### ✅ Faz 5: Altyapı (100%)
- [x] Consensus Engine
- [x] Zero Error Protocol (human approval entegrasyonu ile)
- [x] Orchestrator

### ✅ Faz 6: API Entegrasyonu (100%)
- [x] Agent API endpoints (10+ endpoint)
- [x] Mevcut API'lere hook'lar (Order approval, Production log, Stock management)
- [x] Order approval entegrasyonu
- [x] **Human approval endpoints**

### ✅ Faz 7: Monitoring (100%)
- [x] Agent logger
- [x] Database schema (agent_logs)
- [x] Dashboard API
- [x] Frontend dashboard
- [x] **Cost dashboard (admin)**

### ✅ Faz 8: Testing (100%)
- [x] Test utilities (gerçek API ile)
- [x] Unit tests (48 test, 8 test suite)
  - [x] Warehouse Agent unit test
  - [x] Production Agent unit test
  - [x] Purchase Agent unit test
  - [x] Developer Agent unit test
  - [x] Planning Agent unit test
- [x] Integration tests
  - [x] Orchestrator integration test
- [x] E2E tests
  - [x] Zero Error Protocol E2E test
  - [x] Order approval E2E test

---

## 📊 Final Implementation Status

### ✅ Tüm Fazlar Tamamlandı (%100)

**Test Sonuçları:**
- ✅ **8 Test Suite** - Tümü geçti
- ✅ **48 Test** - Tümü geçti
- ✅ **Test Coverage:** Agent'lar, Orchestrator, Zero Error Protocol, E2E senaryolar

**Implementasyon Özeti:**
- ✅ **6 Agent** implement edildi ve test edildi
- ✅ **10+ API Endpoint** çalışıyor
- ✅ **3 API Hook** eklendi (Order approval, Production log, Stock management)
- ✅ **Database Schema'lar** oluşturuldu (human_approvals, agent_logs, agent_costs)
- ✅ **Frontend UI** component'leri hazır
- ✅ **Zero Error Protocol** 5 katmanlı çalışıyor
- ✅ **Cost Tracking** aktif ve limit kontrolü yapıyor

**Sistem Durumu:** 🟢 **Production Ready**

---

**Son Güncelleme:** 2025-11-17  
**Versiyon:** 2.0.0  
**Durum:** ✅ **Tüm Implementasyon Tamamlandı - Production Ready**

