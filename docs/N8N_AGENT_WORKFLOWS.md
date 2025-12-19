# 🚀 n8n ile Thunder ERP AI Agent Workflows

n8n kullanarak Thunder ERP AI agent'larını visual workflow olarak tasarlama rehberi.

## 🎯 NEDEN N8N?

| Özellik | OpenAI Agent Builder | n8n Workflows |
|---------|---------------------|---------------|
| **Visual Editor** | ✅ Basit | ✅ **Çok güçlü** |
| **Conditional Logic** | ❌ Sınırlı | ✅ **Unlimited** |
| **External APIs** | ⚠️ Function calling | ✅ **Native integration** |
| **Database Access** | ❌ Yok | ✅ **Direct SQL** |
| **Multi-step Workflows** | ⚠️ Tek agent | ✅ **Multi-agent orchestration** |
| **Error Handling** | ⚠️ Basic | ✅ **Advanced (retry, fallback)** |
| **Deployment** | ☁️ OpenAI hosted | ✅ **Self-hosted** |
| **Cost** | $$$$ OpenAI API | ✅ **Sadece OpenAI API** |
| **Custom Logic** | ❌ Limited | ✅ **JavaScript/Python** |
| **Webhook Support** | ❌ Yok | ✅ **Built-in** |

**TL;DR:** n8n = OpenAI Agent Builder + Superpowers 🚀

---

## 📦 KURULUM

### 1. n8n'i Kur

```bash
# Docker ile (recommended)
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=password123 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# veya npm ile
npm install n8n -g
n8n start
```

```bash
# n8n'e eriş
http://localhost:5678
```

### 2. OpenAI Credentials Ekle

n8n UI'de:
1. **Settings** → **Credentials** → **Add Credential**
2. **OpenAI**'yi seç
3. API Key gir: `sk-proj-...`
4. Save

### 3. Supabase/PostgreSQL Credentials Ekle

1. **Add Credential** → **Postgres**
2. Thunder ERP database bilgileri:
   ```
   Host: db.unodzubpvymgownyjrgz.supabase.co
   Database: postgres
   User: postgres
   Password: [Supabase password]
   Port: 5432
   SSL: true
   ```
3. Save

---

## 🎨 WORKFLOW 1: Planning Agent (Basit)

### JSON Workflow

```json
{
  "name": "Thunder Planning Agent",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "planning-agent",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "webhook-trigger",
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "resource": "text",
        "operation": "message",
        "modelId": "gpt-4o",
        "prompt": "={{ $json.body.prompt }}",
        "options": {
          "systemMessage": "Sen Thunder ERP'nin üretim planlama agent'ısın.\n\nGörevlerin:\n1. Sipariş bilgilerini analiz et\n2. BOM (Bill of Materials) kontrol et\n3. Stok durumunu değerlendir\n4. Üretim sürelerini hesapla\n5. Optimum üretim planı oluştur\n\nYanıt formatı JSON:\n{\n  \"decision\": \"approved\" | \"rejected\" | \"needs_review\",\n  \"reasoning\": \"Karar gerekçesi\",\n  \"production_plan\": {\n    \"start_date\": \"2025-12-20\",\n    \"end_date\": \"2025-12-27\",\n    \"estimated_duration_hours\": 168,\n    \"required_materials\": [],\n    \"warnings\": []\n  },\n  \"confidence\": 0.95\n}",
          "temperature": 0.7,
          "maxTokens": 2048
        }
      },
      "id": "openai-agent",
      "name": "Planning Agent (GPT-4o)",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 1,
      "position": [450, 300],
      "credentials": {
        "openAiApi": {
          "id": "openai-credentials",
          "name": "OpenAI API"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ {\n  \"success\": true,\n  \"agent\": \"planning\",\n  \"response\": $json.message.content,\n  \"tokens\": $json.usage.total_tokens,\n  \"cost\": ($json.usage.prompt_tokens * 0.005 / 1000) + ($json.usage.completion_tokens * 0.015 / 1000)\n} }}"
      },
      "id": "response",
      "name": "Respond to Webhook",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Webhook Trigger": {
      "main": [[{ "node": "Planning Agent (GPT-4o)", "type": "main", "index": 0 }]]
    },
    "Planning Agent (GPT-4o)": {
      "main": [[{ "node": "Respond to Webhook", "type": "main", "index": 0 }]]
    }
  }
}
```

### Test Et

```bash
# Webhook URL (n8n'den al)
curl -X POST http://localhost:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "100 adet Ürün A için üretim planı oluştur. Termin: 7 gün."
  }'
```

---

## 🔥 WORKFLOW 2: Advanced Planning Agent (Database Entegrasyonlu)

### JSON Workflow

```json
{
  "name": "Thunder Planning Agent Advanced",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "planning-agent-advanced",
        "responseMode": "responseNode"
      },
      "id": "webhook",
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 400]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT p.*, f.name as product_name, f.quantity as required_quantity\nFROM production_plans p\nJOIN finished_products f ON p.product_id = f.id\nWHERE p.id = '{{ $json.body.plan_id }}'\nLIMIT 1",
        "options": {}
      },
      "id": "get-plan",
      "name": "Get Production Plan",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2,
      "position": [450, 300],
      "credentials": {
        "postgres": {
          "id": "supabase-postgres",
          "name": "Thunder ERP Supabase"
        }
      }
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "SELECT bom.*, rm.name, rm.quantity as stock_quantity, rm.unit\nFROM bom\nJOIN raw_materials rm ON bom.raw_material_id = rm.id\nWHERE bom.finished_product_id = '{{ $json.product_id }}'\nORDER BY bom.quantity DESC",
        "options": {}
      },
      "id": "get-bom",
      "name": "Get BOM (Bill of Materials)",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2,
      "position": [450, 500],
      "credentials": {
        "postgres": {
          "id": "supabase-postgres",
          "name": "Thunder ERP Supabase"
        }
      }
    },
    {
      "parameters": {
        "jsCode": "// BOM ve stok verilerini birleştir\nconst plan = $input.first().json;\nconst bomItems = $input.all()[1].map(item => item.json);\n\n// Stok yeterliliği kontrolü\nconst stockAnalysis = bomItems.map(item => {\n  const required = item.quantity * plan.required_quantity;\n  const available = item.stock_quantity;\n  const sufficient = available >= required;\n  \n  return {\n    material: item.name,\n    required,\n    available,\n    unit: item.unit,\n    sufficient,\n    shortage: sufficient ? 0 : required - available\n  };\n});\n\nconst allMaterialsAvailable = stockAnalysis.every(item => item.sufficient);\n\nreturn [{\n  json: {\n    plan,\n    bom: bomItems,\n    stockAnalysis,\n    allMaterialsAvailable,\n    prompt: `Üretim planı analizi:\n\nSipariş: ${plan.required_quantity} adet ${plan.product_name}\nTermin: ${plan.target_date}\nDurum: ${plan.status}\n\nMalzeme durumu:\n${stockAnalysis.map(s => \n  `- ${s.material}: ${s.required} ${s.unit} gerekli, ${s.available} ${s.unit} mevcut ${s.sufficient ? '✅' : '❌ Eksik: ' + s.shortage}`\n).join('\\n')}\n\nBu üretim planını değerlendir ve karar ver.`\n  }\n}];"
      },
      "id": "prepare-context",
      "name": "Prepare Context",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [650, 400]
    },
    {
      "parameters": {
        "resource": "text",
        "operation": "message",
        "modelId": "gpt-4o",
        "prompt": "={{ $json.prompt }}",
        "options": {
          "systemMessage": "Sen Thunder ERP'nin üretim planlama agent'ısın.\n\nVerilen BOM ve stok bilgilerine göre:\n1. Malzeme yeterliliğini değerlendir\n2. Üretim yapılabilirliğini analiz et\n3. Varsa riskleri belirt\n4. Karar ver: approved/rejected/needs_review\n\nYanıt formatı JSON:\n{\n  \"decision\": \"approved\" | \"rejected\" | \"needs_review\",\n  \"reasoning\": \"Detaylı açıklama\",\n  \"confidence\": 0.95,\n  \"warnings\": [],\n  \"recommendations\": []\n}",
          "temperature": 0.5,
          "maxTokens": 1024
        }
      },
      "id": "planning-agent",
      "name": "Planning Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "typeVersion": 1,
      "position": [850, 400],
      "credentials": {
        "openAiApi": {
          "id": "openai-credentials",
          "name": "OpenAI API"
        }
      }
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{ JSON.parse($json.message.content).decision }}",
              "operation": "equals",
              "value2": "approved"
            }
          ]
        }
      },
      "id": "decision-router",
      "name": "Decision Router",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1050, 400]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE production_plans\nSET \n  status = 'approved',\n  ai_validation_result = '{{ $json.message.content }}',\n  updated_at = NOW()\nWHERE id = '{{ $node[\"Webhook\"].json[\"body\"][\"plan_id\"] }}'",
        "options": {}
      },
      "id": "update-approved",
      "name": "Update Plan (Approved)",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2,
      "position": [1250, 300],
      "credentials": {
        "postgres": {
          "id": "supabase-postgres",
          "name": "Thunder ERP Supabase"
        }
      }
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "UPDATE production_plans\nSET \n  status = 'rejected',\n  ai_validation_result = '{{ $json.message.content }}',\n  updated_at = NOW()\nWHERE id = '{{ $node[\"Webhook\"].json[\"body\"][\"plan_id\"] }}'",
        "options": {}
      },
      "id": "update-rejected",
      "name": "Update Plan (Rejected)",
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2,
      "position": [1250, 500],
      "credentials": {
        "postgres": {
          "id": "supabase-postgres",
          "name": "Thunder ERP Supabase"
        }
      }
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ {\n  \"success\": true,\n  \"plan_id\": $node[\"Webhook\"].json[\"body\"][\"plan_id\"],\n  \"decision\": JSON.parse($json.message.content).decision,\n  \"agent_response\": JSON.parse($json.message.content),\n  \"stock_analysis\": $node[\"Prepare Context\"].json[\"stockAnalysis\"],\n  \"tokens\": $json.usage.total_tokens,\n  \"cost\": ($json.usage.prompt_tokens * 0.005 / 1000) + ($json.usage.completion_tokens * 0.015 / 1000)\n} }}"
      },
      "id": "response",
      "name": "Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1,
      "position": [1450, 400]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          { "node": "Get Production Plan", "type": "main", "index": 0 },
          { "node": "Get BOM (Bill of Materials)", "type": "main", "index": 0 }
        ]
      ]
    },
    "Get Production Plan": {
      "main": [[{ "node": "Prepare Context", "type": "main", "index": 0 }]]
    },
    "Get BOM (Bill of Materials)": {
      "main": [[{ "node": "Prepare Context", "type": "main", "index": 0 }]]
    },
    "Prepare Context": {
      "main": [[{ "node": "Planning Agent", "type": "main", "index": 0 }]]
    },
    "Planning Agent": {
      "main": [[{ "node": "Decision Router", "type": "main", "index": 0 }]]
    },
    "Decision Router": {
      "main": [
        [{ "node": "Update Plan (Approved)", "type": "main", "index": 0 }],
        [{ "node": "Update Plan (Rejected)", "type": "main", "index": 0 }]
      ]
    },
    "Update Plan (Approved)": {
      "main": [[{ "node": "Response", "type": "main", "index": 0 }]]
    },
    "Update Plan (Rejected)": {
      "main": [[{ "node": "Response", "type": "main", "index": 0 }]]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

### Test Et

```bash
curl -X POST http://localhost:5678/webhook/planning-agent-advanced \
  -H "Content-Type: application/json" \
  -d '{
    "plan_id": "uuid-of-production-plan"
  }'
```

---

## 🤖 WORKFLOW 3: Multi-Agent Consensus (Manager Approval)

### JSON Workflow (Abridged)

```json
{
  "name": "Thunder Multi-Agent Consensus",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "multi-agent-consensus"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 500]
    },
    {
      "parameters": {
        "resource": "text",
        "modelId": "gpt-4o",
        "prompt": "={{ $json.body.prompt }}",
        "options": {
          "systemMessage": "Sen Planning Agent'sın. Üretim planlaması yap."
        }
      },
      "name": "Planning Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [450, 300]
    },
    {
      "parameters": {
        "resource": "text",
        "modelId": "gpt-4o",
        "prompt": "={{ $json.body.prompt }}",
        "options": {
          "systemMessage": "Sen Production Agent'sın. Üretilebilirliği değerlendir."
        }
      },
      "name": "Production Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [450, 500]
    },
    {
      "parameters": {
        "resource": "text",
        "modelId": "gpt-4o",
        "prompt": "={{ $json.body.prompt }}",
        "options": {
          "systemMessage": "Sen Warehouse Agent'sın. Stok ve malzeme kontrolü yap."
        }
      },
      "name": "Warehouse Agent",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [450, 700]
    },
    {
      "parameters": {
        "jsCode": "// 3 agent'ın cevaplarını topla\nconst agents = [\n  { name: 'Planning', response: $input.first().json },\n  { name: 'Production', response: $input.all()[1].json },\n  { name: 'Warehouse', response: $input.all()[2].json }\n];\n\n// Konsensüs analizi için prompt hazırla\nconst consensusPrompt = `3 agent'tan gelen cevaplar:\n\n${agents.map((a, i) => \n  `${i+1}. ${a.name} Agent:\\n${a.response.message.content}\\n`\n).join('\\n')}\n\nBu 3 agent'ın cevaplarını analiz et ve nihai karar ver.`;\n\nreturn [{\n  json: {\n    agents,\n    consensusPrompt\n  }\n}];"
      },
      "name": "Aggregate Responses",
      "type": "n8n-nodes-base.code",
      "position": [650, 500]
    },
    {
      "parameters": {
        "resource": "text",
        "modelId": "gpt-4o",
        "prompt": "={{ $json.consensusPrompt }}",
        "options": {
          "systemMessage": "Sen Manager Agent'sın. 3 agent'ın görüşlerini değerlendirerek nihai karar ver.\\n\\nYanıt JSON:\\n{\\n  \\\"finalDecision\\\": \\\"approved\\\",\\n  \\\"reasoning\\\": \\\"...\\\",\\n  \\\"consensus\\\": {\\n    \\\"approve\\\": 2,\\n    \\\"reject\\\": 1\\n  }\\n}"
        }
      },
      "name": "Manager Agent (Consensus)",
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "position": [850, 500]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ {\n  \"success\": true,\n  \"finalDecision\": JSON.parse($json.message.content).finalDecision,\n  \"consensus\": JSON.parse($json.message.content).consensus,\n  \"agentResponses\": $node[\"Aggregate Responses\"].json[\"agents\"],\n  \"managerReasoning\": JSON.parse($json.message.content).reasoning\n} }}"
      },
      "name": "Response",
      "type": "n8n-nodes-base.respondToWebhook",
      "position": [1050, 500]
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [
          { "node": "Planning Agent" },
          { "node": "Production Agent" },
          { "node": "Warehouse Agent" }
        ]
      ]
    },
    "Planning Agent": {
      "main": [[{ "node": "Aggregate Responses" }]]
    },
    "Production Agent": {
      "main": [[{ "node": "Aggregate Responses" }]]
    },
    "Warehouse Agent": {
      "main": [[{ "node": "Aggregate Responses" }]]
    },
    "Aggregate Responses": {
      "main": [[{ "node": "Manager Agent (Consensus)" }]]
    },
    "Manager Agent (Consensus)": {
      "main": [[{ "node": "Response" }]]
    }
  }
}
```

---

## 🔗 Thunder ERP Entegrasyonu

### 1. n8n Webhook'larını Thunder ERP'den Çağır

```typescript
// lib/ai/n8n-client.ts
export class N8nClient {
  private baseUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';

  async runPlanningAgent(prompt: string, context?: any) {
    const response = await fetch(`${this.baseUrl}/webhook/planning-agent-advanced`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, plan_id: context.plan_id })
    });
    return await response.json();
  }

  async runMultiAgentConsensus(prompt: string) {
    const response = await fetch(`${this.baseUrl}/webhook/multi-agent-consensus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    return await response.json();
  }
}
```

### 2. API Route Ekle

```typescript
// app/api/ai/n8n/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { N8nClient } from '@/lib/ai/n8n-client';

export async function POST(request: NextRequest) {
  try {
    const { workflow, prompt, context } = await request.json();
    const client = new N8nClient();

    let result;
    switch (workflow) {
      case 'planning':
        result = await client.runPlanningAgent(prompt, context);
        break;
      case 'multi-agent':
        result = await client.runMultiAgentConsensus(prompt);
        break;
      default:
        throw new Error(`Unknown workflow: ${workflow}`);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### 3. Test Et

```bash
curl -X POST http://localhost:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A",
    "context": { "plan_id": "uuid" }
  }'
```

---

## 📊 AVANTAJLAR: n8n vs Diğerleri

| Özellik | SDK (Kod) | Agent Builder UI | n8n |
|---------|-----------|------------------|-----|
| **Visual Editor** | ❌ | ✅ | ✅ **En güçlü** |
| **Database Access** | ✅ Code | ❌ | ✅ **Native** |
| **Conditional Logic** | ✅ Code | ❌ | ✅ **Visual** |
| **Error Handling** | ✅ Code | ⚠️ Basic | ✅ **Advanced** |
| **Multi-agent** | ✅ Code | ❌ | ✅ **Visual** |
| **Deployment** | PM2 | OpenAI | ✅ **Docker/Self-hosted** |
| **Non-technical** | ❌ | ✅ | ✅ **Better** |
| **Flexibility** | ✅ **Best** | ❌ | ✅ **Second best** |
| **Setup Time** | 2 hours | 10 min | **15 min** |
| **Integration** | ✅ Custom | ⚠️ Functions | ✅ **400+ nodes** |

---

## 🎯 USE CASES

### ✅ n8n Kullan Eğer:
- 🔗 **External APIs:** Tedarikçi API'leri, ERP entegrasyonları
- 🗄️ **Database operations:** Direkt SQL queries
- 🔀 **Complex workflows:** Multi-step, conditional logic
- ⚡ **Real-time triggers:** Webhook, schedule, cron
- 👥 **Team collaboration:** Visual workflow paylaşımı
- 🏗️ **Rapid prototyping:** Hızlı iterasyon

### ✅ SDK (Kod) Kullan Eğer:
- 🧪 **Unit testing:** Jest, automated tests
- 📊 **Custom analytics:** Advanced logging
- 🔒 **Git control:** Code review, versioning
- 🏢 **Enterprise:** Strict compliance

### ✅ Agent Builder UI Kullan Eğer:
- 🚀 **Simple agents:** Tek adımlı AI çağrıları
- 👨‍💼 **Non-technical:** Prompt fine-tuning

---

## 🚀 HEMEN BAŞLA

### 1. n8n'i Başlat

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### 2. Credentials Ekle

- OpenAI API Key
- Supabase Postgres

### 3. İlk Workflow'u İmport Et

n8n UI'de:
1. **Workflows** → **Import from JSON**
2. Yukarıdaki JSON'u yapıştır
3. **Credentials** düzenle
4. **Activate** workflow

### 4. Test Et

```bash
curl -X POST http://localhost:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Test"}'
```

---

## 💡 BEST PRACTICES

### 1. Error Handling

```json
{
  "name": "Error Handler",
  "type": "n8n-nodes-base.errorTrigger",
  "parameters": {
    "errorWorkflow": "Slack notification workflow"
  }
}
```

### 2. Retry Logic

```json
{
  "name": "OpenAI with Retry",
  "parameters": {
    "options": {
      "maxRetries": 3,
      "retryDelay": 1000
    }
  }
}
```

### 3. Cost Tracking

Her workflow'un sonunda:
```json
{
  "name": "Log Cost",
  "type": "n8n-nodes-base.postgres",
  "parameters": {
    "operation": "insert",
    "table": "agent_costs",
    "columns": "agent,tokens_used,cost_usd",
    "values": "={{ $json.agent }},={{ $json.tokens }},={{ $json.cost }}"
  }
}
```

---

## 📚 KAYNAKLAR

- **n8n Docs:** https://docs.n8n.io
- **Community Workflows:** https://n8n.io/workflows
- **Docker Hub:** https://hub.docker.com/r/n8nio/n8n
- **GitHub:** https://github.com/n8n-io/n8n

---

**🎊 SONUÇ:** n8n ile Thunder ERP AI agent'larını **görsel, güçlü ve esnek** şekilde yönet!

**📅 Son Güncelleme:** 2025-12-19  
**🔄 Versiyon:** 1.0.0  
**🚀 n8n + Thunder ERP = Perfect Match!**

