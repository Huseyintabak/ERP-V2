# 🤖 OpenAI Agent Builder Integration

Thunder ERP'nin AI Agent sistemi artık **OpenAI Agent Builder** ile entegre! Bu sayede tüm agent aktivitelerini OpenAI Dashboard'dan izleyebilir, debug edebilir ve optimize edebilirsiniz.

## 📋 İçerik

- [Nedir?](#nedir)
- [Kurulum](#kurulum)
- [Kullanım](#kullanım)
- [API Endpoints](#api-endpoints)
- [Dashboard'da İzleme](#dashboardda-izleme)
- [Mevcut Sistemle Karşılaştırma](#mevcut-sistemle-karşılaştırma)

## 🎯 Nedir?

OpenAI Agent Builder, agent konuşmalarını ve decision-making süreçlerini OpenAI Dashboard'da görselleştirmenizi sağlar. Thunder ERP'de:

- **6 Specialized Agent:**
  - Planning Agent - Üretim planlaması
  - Production Agent - Üretim doğrulama
  - Warehouse Agent - Depo yönetimi
  - Purchase Agent - Satın alma
  - Manager Agent - Koordinasyon
  - Developer Agent - Sistem analizi

- **Real-time Tracing:** Tüm agent aktiviteleri OpenAI'da trace edilir
- **Cost Tracking:** Token ve maliyet takibi
- **Conversation Logs:** Database'de kalıcı log
- **Workflow IDs:** Her agent için unique trace ID

## 🚀 Kurulum

### 1. Paket Kurulumu

```bash
npm install @openai/agents
```

### 2. Environment Variable

`.env.local` dosyanıza ekleyin:

```bash
# OpenAI API Key (ZORUNLU)
OPENAI_API_KEY=sk-proj-...

# Agent Builder Enablement (ZORUNLU)
AGENT_ENABLED=true
AGENT_LOGGING_ENABLED=true
```

### 3. Kontrol

```bash
# Agent info'yu kontrol et
curl http://localhost:3000/api/ai/agent-builder-test

# Response:
{
  "success": true,
  "agents": [
    {
      "role": "planning",
      "name": "Planning Agent",
      "model": "gpt-4o",
      "workflowId": "planning_agent_workflow"
    },
    ...
  ],
  "dashboardLinks": {
    "traces": "https://platform.openai.com/traces",
    "agents": [...]
  },
  "openaiApiKeyConfigured": true
}
```

## 💻 Kullanım

### Single Agent Test

```typescript
// Client-side veya API route'dan
const response = await fetch('/api/ai/agent-builder-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentRole: 'planning',
    prompt: 'Üretim planı oluştur: 100 adet Ürün A',
    type: 'request',
    context: {
      productId: '123',
      quantity: 100,
      deadline: '2025-01-01'
    }
  })
});

const result = await response.json();
console.log('Decision:', result.finalDecision);
console.log('Reasoning:', result.agentResponse.reasoning);
console.log('Dashboard:', result.dashboardLinks.traces);
```

### Multi-Agent Test

```typescript
const response = await fetch('/api/ai/agent-builder-test', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    agentRoles: ['planning', 'warehouse', 'production'],
    prompt: 'Yeni sipariş doğrulama: 500 adet Ürün B',
    type: 'validation',
    context: {
      orderId: '456',
      customerId: '789'
    }
  })
});

const result = await response.json();
console.log('Consensus:', result.consensus);
console.log('Final Decision:', result.finalDecision);
console.log('Agent Responses:', result.agentResponses);
```

### Programmatic Usage

```typescript
import { getAgentBuilderOrchestrator } from '@/lib/ai/agent-builder-orchestrator';

const orchestrator = getAgentBuilderOrchestrator();

// Single agent
const result = await orchestrator.startConversation('production', {
  id: 'custom_id',
  prompt: 'Üretim logu doğrula: ...',
  type: 'validation',
  context: { ... },
  urgency: 'high'
});

// Multi-agent
const multiResult = await orchestrator.startMultiAgentConversation(
  ['planning', 'production', 'manager'],
  {
    id: 'multi_custom_id',
    prompt: 'Kritik karar: ...',
    type: 'request',
    urgency: 'critical'
  }
);
```

## 🔌 API Endpoints

### GET `/api/ai/agent-builder-test`
Agent bilgileri ve dashboard link'leri

**Response:**
```json
{
  "success": true,
  "agents": [...],
  "dashboardLinks": {
    "traces": "https://platform.openai.com/traces",
    "agents": [...]
  },
  "openaiApiKeyConfigured": true
}
```

### POST `/api/ai/agent-builder-test`
Single agent testi

**Request:**
```json
{
  "agentRole": "planning",
  "prompt": "Test prompt",
  "type": "query",
  "context": {}
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "test_1234567890",
  "finalDecision": "approved",
  "agentResponse": {
    "agentName": "Planning Agent",
    "decision": "approved",
    "reasoning": "...",
    "confidence": 0.95
  },
  "workflowIds": ["planning_agent_workflow"],
  "dashboardLinks": {...}
}
```

### PUT `/api/ai/agent-builder-test`
Multi-agent testi

**Request:**
```json
{
  "agentRoles": ["planning", "production", "warehouse"],
  "prompt": "Test prompt",
  "type": "validation",
  "context": {}
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "multi_test_1234567890",
  "finalDecision": "approved",
  "agentResponses": [...],
  "consensus": {
    "approve": 2,
    "reject": 0,
    "needs_review": 1,
    "total": 3
  },
  "workflowIds": [...],
  "dashboardLinks": {...}
}
```

## 📊 Dashboard'da İzleme

### OpenAI Dashboard Erişimi

1. **Traces Sayfası:**
   ```
   https://platform.openai.com/traces
   ```

2. **Workflow ID ile Filtreleme:**
   - `planning_agent_workflow`
   - `production_agent_workflow`
   - `warehouse_agent_workflow`
   - `purchase_agent_workflow`
   - `manager_agent_workflow`
   - `developer_agent_workflow`

3. **Ne Görebilirsiniz?**
   - Agent konuşma akışı
   - Token kullanımı (input/output)
   - Response süreleri
   - Model parametreleri (temperature, maxTokens)
   - Conversation history
   - Error trace'leri

### Trace Metadata

Her conversation'da şu metadata'lar kaydedilir:

```typescript
{
  __trace_source__: "thunder-erp",
  workflow_id: "planning_agent_workflow",
  agent_role: "planning",
  request_id: "req_1234567890",
  request_type: "validation",
  timestamp: "2025-12-19T10:00:00Z"
}
```

## 🆚 Mevcut Sistemle Karşılaştırma

### Mevcut Sistem (BaseAgent)
```typescript
import { PlanningAgent } from '@/lib/ai/agents/planning-agent';

const agent = new PlanningAgent();
const response = await agent.processRequest({
  type: 'validation',
  data: '...',
  context: {}
});
```

**Pros:**
- Fully custom implementation
- Zero Error Protocol integration
- Cross-agent validation
- Database logging

**Cons:**
- Hard to debug
- No visual trace
- Manual cost tracking

### Agent Builder (Yeni Sistem)
```typescript
import { getAgentBuilderOrchestrator } from '@/lib/ai/agent-builder-orchestrator';

const orchestrator = getAgentBuilderOrchestrator();
const result = await orchestrator.startConversation('planning', {
  id: 'req_123',
  prompt: '...',
  type: 'validation'
});
```

**Pros:**
- OpenAI Dashboard visualization
- Real-time tracing
- Built-in cost tracking
- Easy debugging
- Conversation store

**Cons:**
- Requires OpenAI SDK
- Less flexibility
- Network dependency

### Recommendation

**Use Agent Builder when:**
- ✅ Development/testing
- ✅ Debugging agent behavior
- ✅ Cost analysis
- ✅ Performance optimization
- ✅ Stakeholder demos

**Use Mevcut System when:**
- ✅ Production (stable)
- ✅ Custom validation logic
- ✅ Zero Error Protocol required
- ✅ Multi-agent consensus needed

## 🔧 Configuration

### Agent Parameters

```typescript
const config: ThunderAgentConfig = {
  name: "Custom Agent",
  role: "custom",
  instructions: "...",
  model: "gpt-4o",          // veya "gpt-4o-mini"
  temperature: 0.3,         // 0-1 (düşük = deterministik)
  maxTokens: 2048,          // max response length
  workflowId: "custom_wf"   // trace için unique ID
};

const agent = ThunderAgentFactory.createAgent(config);
```

### Cost Estimation

Agent Builder otomatik cost tracking yapar:

```typescript
// GPT-4o pricing (Dec 2024)
Input:  $0.0025 / 1K tokens
Output: $0.01   / 1K tokens

// Example:
// 1000 input + 500 output tokens = 
// (1000 * 0.0025/1000) + (500 * 0.01/1000) = $0.0075
```

## 📝 Database Logging

Agent Builder konuşmaları `agent_logs` tablosuna kaydedilir:

```sql
SELECT 
  conversation_id,
  agent_name,
  action,
  request_data,
  response_data,
  metadata->>'workflowIds' as workflow_ids,
  created_at
FROM agent_logs
WHERE action = 'agent_builder_response'
ORDER BY created_at DESC;
```

## 🐛 Troubleshooting

### OPENAI_API_KEY not configured

```bash
# .env.local kontrolü
echo $OPENAI_API_KEY

# Yoksa ekle
echo "OPENAI_API_KEY=sk-proj-..." >> .env.local

# Next.js restart
npm run dev
```

### Agent not found: xyz

```typescript
// Available agents:
const availableRoles = [
  'planning',
  'production',
  'warehouse',
  'purchase',
  'manager',
  'developer'
];
```

### No traces in dashboard

1. OpenAI Dashboard'da "Traces" sekmesini kontrol edin
2. Workflow ID ile filtreleyin
3. API key'in doğru olduğundan emin olun
4. `withTrace()` wrapper'ının çalıştığını kontrol edin

## 🎉 Başarı Örnekleri

### Production Log Validation

```bash
curl -X POST http://localhost:3000/api/ai/agent-builder-test \
  -H "Content-Type: application/json" \
  -d '{
    "agentRole": "production",
    "prompt": "Operatör Ali, 100 adet Ürün A üretti. Standart süre 60 dakika, gerçek süre 55 dakika. Kalite kontrolden geçti.",
    "type": "validation",
    "context": {
      "operatorId": "op_123",
      "productId": "prod_456",
      "quantity": 100
    }
  }'
```

### Multi-Agent Order Approval

```bash
curl -X PUT http://localhost:3000/api/ai/agent-builder-test \
  -H "Content-Type: application/json" \
  -d '{
    "agentRoles": ["planning", "warehouse", "manager"],
    "prompt": "Yeni sipariş: 500 adet Ürün B, termin: 7 gün, müşteri: ABC Ltd.",
    "type": "request",
    "context": {
      "customerId": "cust_789",
      "productId": "prod_b",
      "quantity": 500,
      "deadline": "2025-01-26"
    }
  }'
```

## 📚 İleri Okuma

- [OpenAI Agents SDK](https://github.com/openai/agent-sdk)
- [Thunder ERP Multi-Agent Architecture](./MULTI_AGENT_ARCHITECTURE.md)
- [AI Agent Implementation Notes](./AI_AGENT_IMPLEMENTATION_NOTES.md)
- [Zero Error Protocol](./MULTI_AGENT_ARCHITECTURE.md#zero-error-protocol)

---

**🚀 Thunder ERP - AI-Powered Manufacturing Excellence**

