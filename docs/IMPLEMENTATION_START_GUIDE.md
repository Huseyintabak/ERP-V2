# 🚀 Multi-Agent AI Implementasyon Başlangıç Rehberi

**Tarih:** 2025-01-27  
**Versiyon:** 1.0.0  
**Durum:** Başlangıç Adımları

---

## 📋 Öncelik Sırası

Projenin sorunsuz ilerlemesi için **adım adım** yaklaşım:

### ✅ Faz 0: Hazırlık (5 dakika)

#### 1. OpenAI API Key Kontrolü
```bash
# .env.local dosyasını kontrol et
cat .env.local | grep OPENAI_API_KEY

# Eğer yoksa ekle:
echo "OPENAI_API_KEY=sk-..." >> .env.local
```

#### 2. Dependency Kontrolü
```bash
# OpenAI package'ı yükle
npm install openai

# Kontrol et
npm list openai
```

---

### 🎯 Faz 1: Temel Altyapı (30-45 dakika)

**Hedef:** İlk agent'ı çalıştırabilmek için minimum altyapı

#### Adım 1.1: Klasör Yapısı (2 dakika)
```bash
mkdir -p lib/ai/agents
mkdir -p lib/ai/types
mkdir -p lib/ai/utils
mkdir -p lib/ai/__tests__
```

#### Adım 1.2: Type Definitions (10 dakika)
**Öncelik:** ⭐⭐⭐⭐⭐ (Kritik - Her şey buna bağlı)

1. `lib/ai/types/agent.types.ts` - Agent request/response tipleri
2. `lib/ai/types/message.types.ts` - Mesajlaşma tipleri
3. `lib/ai/types/protocol.types.ts` - Protocol tipleri

**Neden önce:** Tüm kod bu tiplere bağlı, önce bunlar olmalı.

#### Adım 1.3: Utils - Temel (15 dakika)
**Öncelik:** ⭐⭐⭐⭐ (Yüksek)

1. `lib/ai/utils/logger.ts` - Basit logger (console.log ile başla)
2. `lib/ai/utils/model-selector.ts` - Model seçimi
3. `lib/ai/utils/cache.ts` - In-memory cache (basit Map)
4. `lib/ai/utils/rate-limiter.ts` - Basit rate limiter

**Neden önce:** BaseAgent bu utils'lere ihtiyaç duyuyor.

#### Adım 1.4: BaseAgent (20 dakika)
**Öncelik:** ⭐⭐⭐⭐⭐ (Kritik)

1. `lib/ai/agents/base-agent.ts` - Temel agent sınıfı
2. OpenAI client entegrasyonu
3. Temel metodlar (processRequest, callGPT)

**Neden önce:** Tüm agent'lar bundan extend edecek.

#### Adım 1.5: İlk Test (5 dakika)
```typescript
// Test script: test-agent.ts
import { PlanningAgent } from '@/lib/ai/agents/planning-agent';

const agent = new PlanningAgent();
const response = await agent.processRequest({
  id: 'test-1',
  prompt: 'Test mesajı',
  type: 'query'
});

console.log(response);
```

**Test Komutu:**
```bash
npx tsx test-agent.ts
```

---

### 🎯 Faz 2: İlk Agent - Planning (30 dakika)

**Hedef:** Çalışan bir agent ile order approval testi

#### Adım 2.1: Planning Agent
1. `lib/ai/agents/planning-agent.ts` - Planning agent implementasyonu
2. System prompt ekle
3. processRequest implement et
4. validateWithOtherAgents implement et (basit versiyon)

#### Adım 2.2: Basit Test
```typescript
// Order approval testi
const agent = new PlanningAgent();
const result = await agent.processRequest({
  id: 'order-123',
  prompt: 'Bu siparişi onaylamak istiyorum: Order #123',
  type: 'request',
  context: { orderId: '123' },
  urgency: 'high',
  severity: 'high'
});

console.log('Agent Response:', result);
```

---

### 🎯 Faz 3: Event Bus ve İletişim (20 dakika)

**Hedef:** Agent'lar birbirine mesaj gönderebilsin

#### Adım 3.1: Event Bus
1. `lib/ai/event-bus.ts` - Event bus implementasyonu
2. Agent registration
3. Message sending

#### Adım 3.2: Test
```typescript
// İki agent arası iletişim testi
const planning = new PlanningAgent();
const warehouse = new WarehouseAgent();

const response = await planning.askAgent('warehouse', 
  'Bu üretim için stok yeterli mi?'
);
```

---

### 🎯 Faz 4: Cost Tracking (15 dakika)

**Hedef:** Maliyet takibi çalışsın

#### Adım 4.1: Cost Tracker
1. `lib/ai/utils/cost-tracker.ts` - Cost tracker
2. Database schema (agent_costs tablosu)
3. BaseAgent'a entegrasyon

---

### 🎯 Faz 5: Human Approval (30 dakika)

**Hedef:** İnsan onayı sistemi çalışsın

#### Adım 5.1: Database Schema
1. `supabase/migrations/XXXXX_create_human_approvals.sql`
2. Migration çalıştır

#### Adım 5.2: API Endpoints
1. `app/api/ai/approvals/route.ts` - GET approvals
2. `app/api/ai/approvals/[id]/approve/route.ts` - POST approve
3. `app/api/ai/approvals/[id]/reject/route.ts` - POST reject

#### Adım 5.3: UI Component
1. `components/ai/human-approval-panel.tsx` - Approval panel
2. `app/(dashboard)/ai-approvals/page.tsx` - Approval sayfası

---

## 🎯 Önerilen Başlangıç Sırası

### ⚡ Hızlı Başlangıç (1 saat)

1. ✅ **Faz 0: Hazırlık** (5 dk)
2. ✅ **Faz 1: Temel Altyapı** (30-45 dk)
   - Type definitions
   - Utils (basit versiyonlar)
   - BaseAgent
3. ✅ **Faz 2: Planning Agent** (30 dk)
   - İlk çalışan agent
   - Basit test

**Sonuç:** 1 saat içinde çalışan bir agent!

---

### 🚀 Tam Implementasyon (4-6 saat)

1. ✅ Faz 0-2 (yukarıdaki)
2. ✅ Faz 3: Event Bus
3. ✅ Faz 4: Cost Tracking
4. ✅ Faz 5: Human Approval
5. ✅ Faz 6: Diğer Agent'lar
6. ✅ Faz 7: Orchestrator
7. ✅ Faz 8: Zero Error Protocol

---

## 📝 Her Adımda Test Et

**Kritik Kural:** Her adımdan sonra test et!

```typescript
// Her dosya oluşturduktan sonra:
// 1. TypeScript compile kontrolü
npx tsc --noEmit

// 2. Linter kontrolü
npm run lint

// 3. Basit test
// Test script çalıştır
```

---

## ⚠️ Dikkat Edilmesi Gerekenler

### 1. Environment Variables
```bash
# .env.local'de mutlaka olmalı:
OPENAI_API_KEY=sk-...
AGENT_ENABLED=true
```

### 2. Type Safety
- Her dosyada TypeScript strict mode
- Tüm tipler tanımlı olmalı
- `any` kullanmaktan kaçın

### 3. Error Handling
- Her async fonksiyonda try-catch
- OpenAI API hatalarını handle et
- Rate limit hatalarını handle et

### 4. Testing
- Her agent için basit test yaz
- İlk test başarılı olmadan sonraki adıma geçme

---

## 🎯 İlk Adım: Şimdi Ne Yapmalı?

### Seçenek 1: Hızlı Başlangıç (Önerilen)
```bash
# 1. OpenAI dependency ekle
npm install openai

# 2. Klasör yapısını oluştur
mkdir -p lib/ai/{agents,types,utils,__tests__}

# 3. Type definitions oluştur (ben yardımcı olabilirim)
```

### Seçenek 2: Adım Adım Rehber
Ben her adımı tek tek oluşturup test edebilirim:
1. Type definitions → Test
2. Utils → Test
3. BaseAgent → Test
4. Planning Agent → Test

---

## ❓ Sorular

1. **Hangi yaklaşımı tercih edersiniz?**
   - A) Hızlı başlangıç (1 saatte çalışan agent)
   - B) Adım adım (her adımı test ederek)

2. **OpenAI API key hazır mı?**
   - Evet → Devam edebiliriz
   - Hayır → Önce key almalısınız

3. **İlk agent hangisi olsun?**
   - Planning Agent (önerilen - en kritik)
   - Warehouse Agent (daha basit)
   - Test Agent (en basit)

---

**Sonraki Adım:** Hangi yaklaşımı tercih ettiğinizi söyleyin, hemen başlayalım! 🚀

