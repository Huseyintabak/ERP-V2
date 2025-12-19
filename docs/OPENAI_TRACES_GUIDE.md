# 🔍 OpenAI Traces Dashboard Kullanım Rehberi

## ⚠️ ÖNEMLİ: Agent Builder vs Traces

### Karışıklık: 2 Farklı Sistem Var

| Özellik | Agent Builder | Traces Dashboard |
|---------|---------------|------------------|
| URL | https://platform.openai.com/agent-builder | https://platform.openai.com/traces |
| Kullanım | Manual agent oluşturma (no-code) | API çağrılarını izleme |
| Thunder ERP | ❌ Kullanmıyoruz | ✅ **Burası bizim yerimiz!** |
| Ne görürsün? | Workflow editor (boş) | Agent conversations (dolu) |

**🎯 TL;DR:** Thunder ERP agent'ları **Traces**'de görünür, Agent Builder'da değil!

---

## 📍 DOĞRU YER: Traces Dashboard

### 1. Traces'e Git

```bash
# Direkt link
https://platform.openai.com/traces

# veya
# OpenAI Platform → Sol menü → "Traces"
```

### 2. İlk Görünüm

**Traces sayfası açıldığında:**
- Liste formatında API çağrıları görürsün
- Her satır = 1 conversation/request
- Filtreleme seçenekleri (date, model, source)

### 3. Trace Detayları

**Bir trace'e tıkladığında:**
- **Request:** Agent'a gönderilen prompt
- **Response:** Agent'ın cevabı
- **Timeline:** Conversation akışı
- **Metadata:**
  - workflow_id: `planning_agent_workflow`
  - agent_role: `planning`
  - request_id: `req_123`
  - source: `thunder-erp`
- **Cost:** Token sayısı ve maliyet ($)
- **Duration:** Response süresi (ms)

---

## 🧪 İLK TRACE'İNİZİ OLUŞTURUN

### Adım 1: Tracing'i Aktifleştirin

```bash
# 1. Organization settings'e git
https://platform.openai.com/settings/organization/tracing

# 2. "Enable tracing" toggle'ı AÇ (ON)

# 3. "Save" butonuna tıkla
```

### Adım 2: Thunder ERP'de Agent Çalıştır

```bash
# Browser'da
http://localhost:3000/ai-agent-builder

# veya API ile
curl -X POST http://localhost:3000/api/ai/agent-builder-test \
  -H "Content-Type: application/json" \
  -d '{
    "agentRole": "planning",
    "prompt": "Test prompt for trace",
    "type": "query"
  }'
```

### Adım 3: Traces'e Dön ve Yenile

```bash
# 1. Traces sayfasına git
https://platform.openai.com/traces

# 2. Sayfayı yenile (F5)

# 3. En üstte yeni trace görmeli
```

**Beklenen görünüm:**
```
┌──────────────────────────────────────────────────────┐
│ ⏱️  2 minutes ago                                    │
│ 🤖 planning_agent_workflow                          │
│ 📝 Request: "Test prompt for trace"                 │
│ 💰 $0.0023                                          │
│ ⚡ 1.2s                                              │
└──────────────────────────────────────────────────────┘
```

---

## 🔍 TRACE'LERİ FILTRELEME

### 1. Date Range Filter

```bash
# Traces sayfasında sağ üstte
"Last 24 hours" dropdown

# Seçenekler:
- Last 1 hour
- Last 24 hours
- Last 7 days
- Last 30 days
- Custom range
```

### 2. Source Filter

```bash
# Search bar'a yaz
source:thunder-erp

# veya
# Filters → Source → "thunder-erp"
```

### 3. Workflow ID Filter

```bash
# Search bar'a yaz
workflow_id:planning_agent_workflow

# veya sadece workflow ID'yi yaz
planning_agent_workflow
```

### 4. Model Filter

```bash
# Filters → Model → "gpt-4o"
```

### 5. Status Filter

```bash
# Filters → Status
- ✅ Success
- ❌ Error
- ⏸️ Cancelled
```

---

## 📊 TRACE DETAYLARI

### Bir Trace'e Tıkladığında Görünenler

#### 1. **Overview Tab**
```yaml
Request ID: req_1234567890
Status: ✅ Success
Duration: 1.2s
Cost: $0.0023
Model: gpt-4o
Created: 2025-12-19 10:30:45
```

#### 2. **Timeline Tab**
```
📝 User Input (0ms)
   "100 adet Ürün A üretim planı oluştur"

🤖 Agent Processing (200ms)
   - BOM kontrolü
   - Stok sorgulama
   - Termin hesaplama

💬 Agent Response (1200ms)
   "Üretim planı oluşturuldu: ..."

✅ Completed (1200ms)
```

#### 3. **Request Tab**
```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "user",
      "content": "100 adet Ürün A üretim planı oluştur"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048
}
```

#### 4. **Response Tab**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1734604245,
  "model": "gpt-4o",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Üretim planı oluşturuldu..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 300,
    "total_tokens": 450
  }
}
```

#### 5. **Metadata Tab**
```json
{
  "__trace_source__": "thunder-erp",
  "workflow_id": "planning_agent_workflow",
  "agent_role": "planning",
  "agent_name": "Planning Agent",
  "request_id": "req_1234567890",
  "request_type": "query",
  "conversation_id": "conv_abc123"
}
```

#### 6. **Cost Tab**
```yaml
Model: gpt-4o
Input tokens: 150 × $0.0025/1K = $0.000375
Output tokens: 300 × $0.01/1K = $0.003
Total: $0.003375
```

---

## 🎯 THUNDER ERP'DEN TRACE'E GİTME

### UI'den Direkt Link

Thunder ERP Agent Builder UI'sinde agent çalıştırdığınızda:

```
1. "Agent Çalıştır" butonu → Agent çalışıyor...
2. Result Card görünür
3. "Dashboard'da Görüntüle" butonu → Tıkla
4. OpenAI Traces'e yönlendirir (doğru trace ile)
```

### API Response'tan Link

```json
{
  "success": true,
  "conversationId": "conv_abc123",
  "traceUrl": "https://platform.openai.com/traces?workflow_id=planning_agent_workflow",
  "workflowIds": ["planning_agent_workflow"]
}
```

---

## 🚨 TROUBLESHOOTING

### 1. "No traces found" Hatası

**Sorun:** Traces sayfası boş

**Çözümler:**

#### A. Tracing Aktif mi?
```bash
# Kontrol et
https://platform.openai.com/settings/organization/tracing

# "Enable tracing" toggle'ı ON olmalı
```

#### B. Agent Gerçekten Çalıştı mı?
```bash
# Thunder ERP logs kontrol
pm2 logs thunder-erp | grep "withTrace"

# Görmeli:
"🔄 Starting traced execution for planning_agent_workflow"
"✅ Traced execution completed"
```

#### C. API Key Doğru mu?
```bash
# Test et
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# 200 OK görmeli
```

#### D. Date Range Yanlış mı?
```bash
# Traces sayfasında
Date range: "Last 7 days" seç (dar aralıklar bazen trace'i kaçırır)
```

### 2. Trace Görünüyor Ama Boş

**Sorun:** Trace listede var ama detaylar boş

**Çözüm:**
```bash
# A. Birkaç saniye bekle (async update)
# B. Sayfayı yenile (F5)
# C. Trace'e tekrar tıkla
```

### 3. Trace Metadata Eksik

**Sorun:** Metadata tab'de custom field'lar yok

**Çözüm:**
```typescript
// agent-builder-wrapper.ts'de kontrol et
const result = await withTrace("agent_name", async () => {
  const runner = new Runner({
    traceMetadata: {
      __trace_source__: "thunder-erp",  // ✅ Olmalı
      workflow_id: "planning_agent_workflow",  // ✅ Olmalı
      agent_role: "planning",  // ✅ Olmalı
      // ... diğer metadata
    }
  });
  // ...
});
```

### 4. Cost Görünmüyor

**Sorun:** Cost tab'de $0.00

**Sebep:** Trace henüz tamamlanmadı veya token usage hesaplanmadı

**Çözüm:**
```bash
# Birkaç saniye bekle, OpenAI backend'den cost hesaplaması gelmeli
# Refresh yap
```

---

## 📈 TRACE ANALİZİ

### Performance Optimization

#### 1. **Yavaş Response Bulma**
```bash
# Traces'de sort by "Duration"
# En uzun süren conversation'ları bul
# Timeline'a bak, hangi adım yavaş?
```

**Örnek:**
```
Timeline:
- User input: 0ms
- Agent processing: 5000ms ⚠️ (YAVAŞ!)
  - Database query: 4500ms ⚠️ (PROBLEMLİ!)
  - LLM call: 500ms ✅
```

**Fix:**
```typescript
// Önce database cache'le, sonra LLM çağır
const cachedData = await cache.get('stock_data');
const data = cachedData || await db.query('...');
```

#### 2. **Token Usage Optimization**
```bash
# Traces'de sort by "Total tokens"
# En çok token kullanan conversation'ları bul
```

**Örnek:**
```
Agent: Production Agent
Prompt tokens: 2500 ⚠️ (ÇOK FAZLA!)
Completion tokens: 300 ✅

Sorun: Çok uzun system prompt
```

**Fix:**
```typescript
// System prompt'u kısalt
const systemPrompt = `You are a production agent. Be concise.`;
// vs
const systemPrompt = `You are a production planning agent responsible for ...` (300 kelime) ❌
```

### Cost Analysis

#### Günlük/Haftalık Toplam
```bash
# Traces → Date range: "Last 7 days"
# Sağ üstte "Total cost" görünür
# Örn: "$12.50 in last 7 days"
```

#### Agent Bazında Maliyet
```bash
# Filter by workflow_id
planning_agent_workflow → $5.20
production_agent_workflow → $3.80
warehouse_agent_workflow → $2.10
```

### Error Tracking

#### 1. **Failed Traces Bulma**
```bash
# Filters → Status → "Error"
# Tüm hatalı conversation'ları listele
```

#### 2. **Error Pattern Analizi**
```bash
# Error traces'e tıkla
# "Error" tab'de hata detaylarını gör

Örnek hatalar:
- 429: Rate limit exceeded
- 400: Invalid request (prompt çok uzun)
- 500: OpenAI server error
```

---

## 🎓 BEST PRACTICES

### 1. Meaningful Workflow IDs

```typescript
// ❌ Kötü
workflow_id: "wf_123"

// ✅ İyi
workflow_id: "production_validation_${orderId}_${timestamp}"
```

### 2. Rich Metadata

```typescript
const runner = new Runner({
  traceMetadata: {
    __trace_source__: "thunder-erp",
    workflow_id: "planning_agent_workflow",
    agent_role: "planning",
    // ✅ Ekstra context ekle
    order_id: orderId,
    customer_id: customerId,
    production_plan_id: planId,
    urgency: "high",
    estimated_cost: "$50"
  }
});
```

### 3. Consistent Naming

```typescript
// Agent workflow IDs
planning_agent_workflow
production_agent_workflow
warehouse_agent_workflow
purchase_agent_workflow
manager_agent_workflow
developer_agent_workflow

// Request IDs
req_${timestamp}_${randomId}

// Conversation IDs
conv_${agentRole}_${timestamp}
```

### 4. Regular Monitoring

```bash
# Her gün
- Traces'i kontrol et
- Hatalı conversation'ları incele
- Cost'u izle

# Her hafta
- Performance raporları çıkar
- Token usage optimize et
- Error pattern'leri analiz et
```

---

## 🔗 FAYDALI LİNKLER

- **Traces Dashboard:** https://platform.openai.com/traces
- **Tracing Settings:** https://platform.openai.com/settings/organization/tracing
- **Usage Dashboard:** https://platform.openai.com/usage
- **Billing:** https://platform.openai.com/settings/organization/billing

---

## 📝 ÖZET

### ✅ YAPILMASI GEREKENLER

1. **Tracing'i aç:** https://platform.openai.com/settings/organization/tracing
2. **Agent çalıştır:** Thunder ERP'de agent test et
3. **Traces'e git:** https://platform.openai.com/traces
4. **Filter uygula:** `source:thunder-erp`
5. **Trace'leri incele:** Timeline, cost, metadata
6. **Optimize et:** Yavaş adımları iyileştir

### ❌ YAPMAMASI GEREKENLER

1. ❌ Agent Builder'a gitme (https://platform.openai.com/agent-builder) - Boş olacak
2. ❌ Hemen trace bekleme - Birkaç saniye gecikmeli
3. ❌ Dar date range seçme - İlk testte "Last 7 days" kullan
4. ❌ Tracing kapalıyken test etme - Hiçbir şey görünmez

---

**🎯 TL;DR:** Thunder ERP agent'larını **Traces Dashboard**'da izle, Agent Builder'da değil!

**📍 Doğru Link:** https://platform.openai.com/traces

---

**📅 Son Güncelleme:** 2025-12-19  
**🔄 Versiyon:** 1.0.0  
**🎯 Hedef:** Traces Dashboard Mastery

