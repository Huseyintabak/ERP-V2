# 🚀 Thunder ERP v2.0 - Versiyon 1.1 Geliştirme Yol Haritası

**Tarih:** 2025-01-27  
**Hedef Versiyon:** 1.1.0  
**Tahmini Süre:** 4-6 hafta  
**Durum:** 📋 Planlama Aşaması

---

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Öncelikli Geliştirmeler](#öncelikli-geliştirmeler)
3. [Detaylı Görev Listesi](#detaylı-görev-listesi)
4. [Teknik Detaylar](#teknik-detaylar)
5. [Test Stratejisi](#test-stratejisi)
6. [Deployment Planı](#deployment-planı)
7. [Başarı Kriterleri](#başarı-kriterleri)

---

## 🎯 Genel Bakış

### Versiyon 1.1 Hedefleri
Versiyon 1.1, mevcut sistemin stabilitesini artırmak, test coverage'ı yükseltmek ve eksik özellikleri tamamlamak üzerine odaklanır.

### Ana Hedefler
1. ✅ **Test Coverage**: %5'ten %60+ seviyesine çıkarma
2. ✅ **Manager Agent**: Eksik agent'ı implement etme
3. ✅ **Database Logging**: AI agent loglarını database'e kaydetme
4. ✅ **API Hook'ları**: Kritik API'lere agent entegrasyonu
5. ✅ **Performance**: Query optimizasyonları ve caching
6. ✅ **Error Handling**: Daha robust hata yönetimi

### Beklenen Faydalar
- 🎯 **Daha Güvenilir Sistem**: Test coverage artışı ile bug'lar erken tespit
- 🤖 **Tam AI Desteği**: Manager Agent ile stratejik kararlar
- 📊 **Daha İyi İzleme**: Database logging ile detaylı analiz
- ⚡ **Daha Hızlı**: Performance optimizasyonları ile hız artışı
- 🔒 **Daha Güvenli**: Robust error handling ile sistem stabilitesi

---

## 🎯 Öncelikli Geliştirmeler

### 🔴 Yüksek Öncelik (Kritik)

#### 1. Test Coverage Artırma
**Hedef:** %5 → %60+  
**Süre:** 2-3 hafta  
**Öncelik:** 🔴 Kritik

**Kapsam:**
- Unit testler (Agent'lar, utilities, hooks)
- Integration testler (API endpoints)
- E2E testler (Kritik user flows)

**Faydalar:**
- Bug'ların erken tespiti
- Refactoring güvenliği
- Kod kalitesi artışı

#### 2. Manager Agent Implementasyonu
**Hedef:** Manager Agent'ı sisteme ekleme  
**Süre:** 1 hafta  
**Öncelik:** 🔴 Kritik

**Kapsam:**
- Manager Agent class implementasyonu
- Orchestrator'a kayıt
- API endpoint'leri
- Frontend UI entegrasyonu

**Faydalar:**
- Stratejik karar desteği
- Risk analizi
- Bütçe kontrolü

#### 3. agent_logs Database Schema
**Hedef:** Memory-based logging → Database logging  
**Süre:** 3-4 gün  
**Öncelik:** 🔴 Kritik

**Kapsam:**
- Database schema oluşturma
- Logger'ı database'e kaydetme
- Query ve analiz endpoint'leri

**Faydalar:**
- Kalıcı log kayıtları
- Detaylı analiz imkanı
- Performance monitoring

#### 4. Order Approval Agent Hook
**Hedef:** Sipariş onayında AI agent kontrolü  
**Süre:** 2-3 gün  
**Öncelik:** 🔴 Kritik

**Kapsam:**
- Order approval API'ye hook ekleme
- Agent validation entegrasyonu
- Error handling

**Faydalar:**
- Otomatik doğrulama
- Hata önleme
- Tutarlı kararlar

### 🟡 Orta Öncelik (Önemli)

#### 5. Production Log Agent Hook
**Hedef:** Üretim kaydında AI agent kontrolü  
**Süre:** 2-3 gün  
**Öncelik:** 🟡 Önemli

#### 6. Stock Management Agent Hooks
**Hedef:** Stok işlemlerinde AI agent kontrolü  
**Süre:** 3-4 gün  
**Öncelik:** 🟡 Önemli

#### 7. Performance Optimizasyonları
**Hedef:** Query ve caching iyileştirmeleri  
**Süre:** 1 hafta  
**Öncelik:** 🟡 Önemli

### 🟢 Düşük Öncelik (İyileştirme)

#### 8. Error Handling İyileştirmeleri
**Hedef:** Daha robust hata yönetimi  
**Süre:** 3-4 gün  
**Öncelik:** 🟢 İyileştirme

#### 9. UI/UX İyileştirmeleri
**Hedef:** Kullanıcı deneyimi iyileştirmeleri  
**Süre:** 1 hafta  
**Öncelik:** 🟢 İyileştirme

---

## 📋 Detaylı Görev Listesi

### Faz 1: Test Coverage (2-3 Hafta)

#### Unit Testler

##### 1.1 AI Agent Unit Testleri
- [ ] **Warehouse Agent Test**
  - Stok güncelleme validasyonu
  - Kritik stok tespiti
  - Rezervasyon kontrolü
  - **Dosya:** `lib/ai/__tests__/warehouse-agent.test.ts`
  - **Hedef Coverage:** %80+

- [ ] **Production Agent Test**
  - BOM doğrulama
  - Anomali tespiti
  - Operatör kapasitesi kontrolü
  - **Dosya:** `lib/ai/__tests__/production-agent.test.ts`
  - **Hedef Coverage:** %80+

- [ ] **Purchase Agent Test**
  - Kritik stok analizi
  - Tedarik süresi tahmini
  - Maliyet analizi
  - **Dosya:** `lib/ai/__tests__/purchase-agent.test.ts`
  - **Hedef Coverage:** %80+

- [ ] **Developer Agent Test**
  - Code smell tespiti
  - Performance bottleneck analizi
  - Security vulnerability tespiti
  - **Dosya:** `lib/ai/__tests__/developer-agent.test.ts`
  - **Hedef Coverage:** %80+

- [ ] **Manager Agent Test** (Yeni)
  - Risk skorlama
  - Bütçe etki analizi
  - Stratejik uyumluluk kontrolü
  - **Dosya:** `lib/ai/__tests__/manager-agent.test.ts`
  - **Hedef Coverage:** %80+

##### 1.2 Utility Unit Testleri
- [ ] **Consensus Engine Test**
  - Consensus building
  - Vote aggregation
  - Approval rate calculation
  - **Dosya:** `lib/ai/__tests__/consensus-engine.test.ts`

- [ ] **Cost Tracker Test**
  - Token tracking
  - Cost calculation
  - Quota management
  - **Dosya:** `lib/ai/utils/__tests__/cost-tracker.test.ts`

- [ ] **Rate Limiter Test**
  - Rate limit enforcement
  - Quota checking
  - **Dosya:** `lib/ai/utils/__tests__/rate-limiter.test.ts`

##### 1.3 Hook Unit Testleri
- [ ] **useRealtime Test**
  - Subscription management
  - Error handling
  - Reconnection logic
  - **Dosya:** `lib/hooks/__tests__/use-realtime.test.ts`

- [ ] **useBarcode Test**
  - Barcode scanning
  - Buffer management
  - **Dosya:** `lib/hooks/__tests__/use-barcode.test.ts`

#### Integration Testler

##### 1.4 API Integration Testleri
- [ ] **Order API Test**
  - Order creation
  - Order approval
  - Order cancellation
  - **Dosya:** `__tests__/api/orders.test.ts`

- [ ] **Production API Test**
  - Plan creation
  - Operator assignment
  - Production logging
  - **Dosya:** `__tests__/api/production.test.ts`

- [ ] **Stock API Test**
  - Stock entry/exit
  - Stock count
  - Excel import/export
  - **Dosya:** `__tests__/api/stock.test.ts`

- [ ] **AI API Test**
  - Conversation creation
  - Agent responses
  - Approval workflow
  - **Dosya:** `__tests__/api/ai.test.ts`

#### E2E Testler

##### 1.5 E2E Senaryoları
- [ ] **Order to Production Flow**
  - Sipariş oluşturma
  - Sipariş onaylama (AI agent ile)
  - Plan oluşturma
  - Operatör atama
  - Üretim kaydı
  - **Dosya:** `__tests__/e2e/order-production-flow.test.ts`

- [ ] **Stock Management Flow**
  - Stok girişi
  - Stok sayımı
  - Kritik stok uyarısı
  - **Dosya:** `__tests__/e2e/stock-management-flow.test.ts`

- [ ] **Zero Error Protocol E2E**
  - 5 katmanlı doğrulama
  - Consensus building
  - Human approval
  - **Dosya:** `__tests__/e2e/zero-error-protocol.test.ts`

**Test Coverage Hedefleri:**
- Unit Tests: %80+
- Integration Tests: %70+
- E2E Tests: %60+
- **Toplam Coverage:** %60+

---

### Faz 2: Manager Agent (1 Hafta)

#### 2.1 Manager Agent Implementasyonu
- [ ] **Manager Agent Class**
  - BaseAgent'tan extend
  - System prompt tanımlama
  - Risk skorlama metrikleri
  - Bütçe etki analizi
  - Stratejik uyumluluk kontrolü
  - **Dosya:** `lib/ai/agents/manager-agent.ts`
  - **Referans:** Mevcut `manager-agent.ts` dosyası (dokümantasyonda var)

- [ ] **Orchestrator Entegrasyonu**
  - Manager Agent'ı orchestrator'a kaydetme
  - Event bus'a kayıt
  - **Dosya:** `lib/ai/orchestrator.ts`

- [ ] **API Endpoint'leri**
  - Manager Agent için conversation endpoint
  - Manager Agent dashboard endpoint
  - **Dosya:** `app/api/ai/manager/route.ts`

- [ ] **Frontend UI**
  - Manager Agent dashboard sayfası
  - Risk analizi görselleştirme
  - Bütçe etki grafikleri
  - **Dosya:** `app/(dashboard)/ai-manager/page.tsx`

#### 2.2 Manager Agent Özellikleri
- ✅ **Risk Skorlama**
  - Mali Risk (0-100)
  - Operasyonel Risk (0-100)
  - Stratejik Risk (0-100)
  - Toplam Risk Skoru

- ✅ **Bütçe Etki Analizi**
  - Pozitif/Nötr/Negatif etki
  - Bütçe aşımı riski
  - Gelir/gider analizi

- ✅ **Stratejik Uyumluluk**
  - Uzun vadeli hedeflerle uyum
  - Müşteri memnuniyeti etkisi
  - İş sürekliliği kontrolü
  - Rekabet avantajı analizi

---

### Faz 3: Database Logging (3-4 Gün)

#### 3.1 Database Schema
- [ ] **agent_logs Tablosu Oluşturma**
  ```sql
  CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    agent_name TEXT NOT NULL,
    action TEXT NOT NULL,
    request JSONB,
    response JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    cost NUMERIC(10, 4),
    tokens_used INTEGER,
    model_used TEXT
  );
  
  CREATE INDEX idx_agent_logs_conversation ON agent_logs(conversation_id);
  CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_name);
  CREATE INDEX idx_agent_logs_timestamp ON agent_logs(timestamp DESC);
  ```
  - **Dosya:** `supabase/migrations/20250127_create_agent_logs.sql`

#### 3.2 Logger Güncelleme
- [ ] **Database Logger Implementation**
  - Logger'ı database'e kaydetme
  - Batch insert optimizasyonu
  - Error handling
  - **Dosya:** `lib/ai/utils/logger.ts`

- [ ] **Migration Script**
  - Mevcut memory logları database'e taşıma (opsiyonel)
  - **Dosya:** `scripts/migrate-agent-logs.mjs`

#### 3.3 Query ve Analiz
- [ ] **Agent Logs API**
  - Log listesi endpoint
  - Log detay endpoint
  - Analiz endpoint'leri
  - **Dosya:** `app/api/ai/logs/route.ts`

- [ ] **Frontend UI**
  - Agent logs görüntüleme sayfası
  - Filtreleme ve arama
  - Analiz grafikleri
  - **Dosya:** `app/(dashboard)/ai-logs/page.tsx`

---

### Faz 4: API Hook'ları (1 Hafta)

#### 4.1 Order Approval Hook
- [ ] **Order Approval API Güncelleme**
  - AI agent validation ekleme
  - Planning Agent kontrolü
  - Warehouse Agent kontrolü
  - Manager Agent onayı (kritik siparişler için)
  - **Dosya:** `app/api/orders/[id]/approve/route.ts`

- [ ] **Error Handling**
  - Agent hatası durumunda graceful degradation
  - Human approval fallback
  - **Dosya:** `app/api/orders/[id]/approve/route.ts`

#### 4.2 Production Log Hook
- [ ] **Production Log API Güncelleme**
  - Production Agent validation
  - BOM doğrulama
  - Anomali tespiti
  - **Dosya:** `app/api/production/log/route.ts`

#### 4.3 Stock Management Hooks
- [ ] **Stock Entry API Güncelleme**
  - Warehouse Agent validation
  - Kritik stok kontrolü
  - **Dosya:** `app/api/stock/entry/route.ts`

- [ ] **Stock Exit API Güncelleme**
  - Warehouse Agent validation
  - Stok yeterliliği kontrolü
  - **Dosya:** `app/api/stock/exit/route.ts`

- [ ] **Stock Count API Güncelleme**
  - Warehouse Agent validation
  - Büyük değişim uyarıları
  - **Dosya:** `app/api/stock/count/route.ts`

---

### Faz 5: Performance Optimizasyonları (1 Hafta)

#### 5.1 Database Query Optimizasyonları
- [ ] **Index Optimizasyonları**
  - Eksik index'leri tespit etme
  - Composite index'ler ekleme
  - Query performance analizi
  - **Dosya:** `supabase/migrations/20250127_performance_indexes.sql`

- [ ] **Query Optimization**
  - N+1 query problem'lerini çözme
  - JOIN optimizasyonları
  - Subquery optimizasyonları
  - **Dosya:** İlgili API route'ları

#### 5.2 Caching Stratejisi
- [ ] **API Response Caching**
  - Redis veya in-memory cache
  - Cache invalidation stratejisi
  - **Dosya:** `lib/utils/cache.ts`

- [ ] **Database Query Caching**
  - Sık kullanılan query'leri cache'leme
  - Cache TTL ayarları
  - **Dosya:** `lib/supabase/cache.ts`

#### 5.3 Frontend Optimizasyonları
- [ ] **Code Splitting**
  - Route-based code splitting
  - Component lazy loading
  - **Dosya:** Next.js config

- [ ] **Bundle Size Optimization**
  - Unused dependency'leri temizleme
  - Tree shaking
  - **Dosya:** `next.config.ts`

---

### Faz 6: Error Handling İyileştirmeleri (3-4 Gün)

#### 6.1 Global Error Handler
- [ ] **Error Boundary İyileştirmeleri**
  - Daha detaylı error mesajları
  - Error reporting (Sentry entegrasyonu)
  - **Dosya:** `components/error-boundary.tsx`

#### 6.2 API Error Handling
- [ ] **Standart Error Response Formatı**
  - Consistent error format
  - Error code'ları
  - **Dosya:** `lib/utils/error-handler.ts`

#### 6.3 Database Error Handling
- [ ] **Transaction Error Handling**
  - Rollback mekanizması
  - Error logging
  - **Dosya:** İlgili API route'ları

---

## 🔧 Teknik Detaylar

### Test Framework Setup

#### Jest Configuration
```javascript
// jest.config.mjs
export default {
  testEnvironment: 'jest-environment-node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.mjs'],
  collectCoverageFrom: [
    'lib/**/*.{js,ts}',
    'app/api/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
};
```

#### Test Utilities
```typescript
// __tests__/utils/test-helpers.ts
export const createMockSupabaseClient = () => {
  // Mock Supabase client
};

export const createMockAgent = () => {
  // Mock Agent instance
};
```

### Manager Agent Implementation

#### Manager Agent Class Structure
```typescript
// lib/ai/agents/manager-agent.ts
export class ManagerAgent extends BaseAgent {
  constructor() {
    super(
      'Manager Agent',
      'manager',
      systemPrompt // Risk skorlama, bütçe analizi, stratejik uyumluluk
    );
  }

  async validateRequest(request: AgentRequest): Promise<ValidationResult> {
    // Risk skorlama
    // Bütçe etki analizi
    // Stratejik uyumluluk kontrolü
  }
}
```

### Database Schema

#### agent_logs Table
```sql
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  agent_name TEXT NOT NULL CHECK (agent_name IN ('planning', 'warehouse', 'production', 'purchase', 'manager', 'developer')),
  action TEXT NOT NULL,
  request JSONB,
  response JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  cost NUMERIC(10, 4),
  tokens_used INTEGER,
  model_used TEXT,
  error_message TEXT,
  execution_time_ms INTEGER
);

CREATE INDEX idx_agent_logs_conversation ON agent_logs(conversation_id);
CREATE INDEX idx_agent_logs_agent ON agent_logs(agent_name);
CREATE INDEX idx_agent_logs_timestamp ON agent_logs(timestamp DESC);
CREATE INDEX idx_agent_logs_action ON agent_logs(action);
```

### API Hook Pattern

#### Order Approval Hook Example
```typescript
// app/api/orders/[id]/approve/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  // 1. Order bilgilerini al
  // 2. AI Agent validation (Planning, Warehouse, Manager)
  const agentResult = await orchestrator.startConversation({
    prompt: `Order ${orderId} approval request`,
    type: 'validation',
    context: { orderId, orderData }
  });
  
  // 3. Agent sonucuna göre işlem yap
  if (agentResult.finalDecision === 'rejected') {
    return NextResponse.json({ error: 'Agent rejected' }, { status: 400 });
  }
  
  // 4. Normal approval flow
  // ...
}
```

---

## 🧪 Test Stratejisi

### Test Piramidi
```
        /\
       /E2E\        (10%)
      /------\
     /Integration\  (30%)
    /------------\
   /   Unit Tests  \ (60%)
  /----------------\
```

### Test Coverage Hedefleri
- **Unit Tests:** %80+ coverage
- **Integration Tests:** %70+ coverage
- **E2E Tests:** %60+ coverage
- **Toplam Coverage:** %60+

### Test Senaryoları

#### Kritik Test Senaryoları
1. **Order Approval Flow**
   - Agent validation
   - Error handling
   - Human approval fallback

2. **Production Logging**
   - BOM validation
   - Anomali detection
   - Stock consumption

3. **Stock Management**
   - Critical stock alerts
   - Reservation management
   - Transfer operations

---

## 🚀 Deployment Planı

### Pre-Deployment Checklist
- [ ] Tüm testler geçti (%60+ coverage)
- [ ] Manager Agent implement edildi
- [ ] Database logging aktif
- [ ] API hook'ları çalışıyor
- [ ] Performance optimizasyonları uygulandı
- [ ] Error handling iyileştirildi
- [ ] Documentation güncellendi

### Deployment Steps
1. **Test Environment**
   - Tüm değişiklikleri test ortamında dene
   - Integration testleri çalıştır
   - E2E testleri çalıştır

2. **Staging Environment**
   - Staging'e deploy et
   - Smoke testleri yap
   - Performance testleri yap

3. **Production Deployment**
   - Database migration'ları uygula
   - Code deploy et
   - PM2 restart
   - Monitoring kontrolü

### Rollback Planı
- Database migration rollback script'leri
- Code rollback (git revert)
- PM2 rollback

---

## ✅ Başarı Kriterleri

### Versiyon 1.1 Başarı Metrikleri

#### Test Coverage
- ✅ Unit Tests: %80+ coverage
- ✅ Integration Tests: %70+ coverage
- ✅ E2E Tests: %60+ coverage
- ✅ **Toplam Coverage: %60+**

#### Feature Completion
- ✅ Manager Agent implement edildi
- ✅ Database logging aktif
- ✅ API hook'ları çalışıyor
- ✅ Performance optimizasyonları uygulandı

#### Performance
- ✅ API response time: < 500ms (ortalama)
- ✅ Page load time: < 2 saniye
- ✅ Database query time: < 100ms (ortalama)

#### Stability
- ✅ Error rate: < 0.1%
- ✅ Uptime: %99.9+
- ✅ Zero critical bugs

---

## 📅 Zaman Çizelgesi

### Hafta 1-2: Test Coverage
- Unit testler yazılması
- Integration testler yazılması
- Test coverage %60+ seviyesine çıkarılması

### Hafta 3: Manager Agent
- Manager Agent implementasyonu
- Orchestrator entegrasyonu
- Frontend UI

### Hafta 4: Database Logging
- Database schema oluşturma
- Logger güncelleme
- Query ve analiz endpoint'leri

### Hafta 5: API Hook'ları
- Order approval hook
- Production log hook
- Stock management hooks

### Hafta 6: Performance & Polish
- Performance optimizasyonları
- Error handling iyileştirmeleri
- Final testing ve deployment

---

## 📊 İlerleme Takibi

### Görev Durumları
- 🔴 **Kritik**: Yüksek öncelik, hemen başlanmalı
- 🟡 **Önemli**: Orta öncelik, planlanmış zamanda
- 🟢 **İyileştirme**: Düşük öncelik, zaman kalırsa

### Haftalık Review
- Her hafta sonu ilerleme review'ı
- Blocker'ların tespiti
- Zaman çizelgesi güncellemesi

---

## 🎯 Sonuç

Versiyon 1.1, sistemin stabilitesini, güvenilirliğini ve performansını önemli ölçüde artıracak. Özellikle test coverage artışı ve Manager Agent implementasyonu, sistemin production-ready seviyesini yükseltecek.

**Hedef Tarih:** 2025-03-10 (6 hafta sonra)  
**Durum:** 📋 Planlama Tamamlandı  
**Sonraki Adım:** Test Coverage çalışmalarına başlama

---

**Doküman Tarihi:** 2025-01-27  
**Hazırlayan:** AI Assistant  
**Versiyon:** 1.1.0 Roadmap  
**Durum:** 📋 Ready for Implementation

