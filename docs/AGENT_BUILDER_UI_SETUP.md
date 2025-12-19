# 🎨 OpenAI Agent Builder UI - Visual Workflow Setup

Thunder ERP agent'larını OpenAI Agent Builder UI'de visual olarak oluşturma ve yönetme rehberi.

## 🎯 HEDEF

**SDK (Kod) yerine Agent Builder UI (Visual) kullanarak:**
- 📋 Agent'ları browser'da tasarla
- 🔧 Workflow'ları visual editor'de düzenle
- 🧪 Direkt UI'den test et
- 📊 Dashboard'da canlı izle
- 👥 Takım üyeleriyle collaborate et

---

## 📋 ADIM 1: Agent Builder'a Giriş

### 1.1 Agent Builder Sayfasına Git

```bash
https://platform.openai.com/agent-builder
```

### 1.2 İlk Workflow Oluştur

1. **"Create workflow"** butonuna tıkla
2. Workflow adı ver: `Thunder ERP - Planning Agent`
3. Description: `Üretim planlaması yapan AI agent`

### 1.3 Agent Settings

```yaml
Name: Planning Agent
Description: Üretim planlaması ve kaynak optimizasyonu
Model: gpt-4o
Temperature: 0.7
Max tokens: 2048
```

---

## 🔧 ADIM 2: Workflow Tasarımı

### 2.1 Agent Node Ekle

**Agent Builder UI'de:**

1. **Start Node** (otomatik var)
2. **Agent Node** ekle (sağ menüden)
   - Name: `Planning Agent`
   - Model: `gpt-4o`
   - Instructions:
     ```
     Sen Thunder ERP'nin üretim planlama agent'ısın.
     
     Görevlerin:
     1. Sipariş bilgilerini analiz et
     2. BOM (Bill of Materials) kontrol et
     3. Stok durumunu değerlendir
     4. Üretim sürelerini hesapla
     5. Optimum üretim planı oluştur
     
     Yanıt formatı JSON:
     {
       "decision": "approved" | "rejected" | "needs_review",
       "reasoning": "Karar gerekçesi",
       "production_plan": {
         "start_date": "2025-12-20",
         "end_date": "2025-12-27",
         "estimated_duration_hours": 168,
         "required_materials": [],
         "warnings": []
       },
       "confidence": 0.95
     }
     ```

3. **End Node** ekle

### 2.2 Tool/Function Ekle (Opsiyonel)

**Thunder ERP API'lerini agent'a bağla:**

```typescript
// Custom tool definition
{
  "name": "check_stock",
  "description": "Check raw material stock levels",
  "parameters": {
    "type": "object",
    "properties": {
      "material_id": { "type": "string" },
      "required_quantity": { "type": "number" }
    }
  },
  "endpoint": "https://thunder-erp.com/api/stock/check"
}
```

---

## 🚀 ADIM 3: Thunder ERP'den Agent Builder'ı Çağırma

### 3.1 Assistant API Kullan

Agent Builder'da oluşturulan agent'lar **Assistant API** ile çağrılır:

```typescript
// lib/ai/agent-builder-api-client.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runAgentBuilderWorkflow(
  assistantId: string, // Agent Builder'dan alınacak
  prompt: string,
  context?: any
) {
  // 1. Thread oluştur
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    metadata: {
      source: "thunder-erp",
      context: JSON.stringify(context)
    }
  });

  // 2. Agent'ı çalıştır
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
    instructions: "Thunder ERP production planning request"
  });

  // 3. Tamamlanmasını bekle
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  
  while (runStatus.status !== 'completed') {
    if (runStatus.status === 'failed') {
      throw new Error(`Agent run failed: ${runStatus.last_error?.message}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  }

  // 4. Mesajları al
  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessage = messages.data[0];

  // 5. Response parse et
  const response = lastMessage.content[0];
  const text = response.type === 'text' ? response.text.value : '';

  return {
    threadId: thread.id,
    runId: run.id,
    response: text,
    assistantId,
    status: runStatus.status
  };
}
```

### 3.2 Assistant ID'yi Al

**Agent Builder UI'den:**

1. Workflow'u kaydet
2. **"Deploy"** veya **"Publish"** butonuna tıkla
3. **Assistant ID** görünecek: `asst_abc123...`
4. Kopyala ve `.env.local`'e ekle:

```bash
# .env.local
OPENAI_PLANNING_AGENT_ID=asst_abc123...
OPENAI_PRODUCTION_AGENT_ID=asst_def456...
OPENAI_WAREHOUSE_AGENT_ID=asst_ghi789...
```

---

## 🔗 ADIM 4: Thunder ERP Entegrasyonu

### 4.1 Agent Factory Güncelle

```typescript
// lib/ai/agent-builder-ui-factory.ts
import { runAgentBuilderWorkflow } from './agent-builder-api-client';

export class AgentBuilderUIFactory {
  private static assistantIds = {
    planning: process.env.OPENAI_PLANNING_AGENT_ID!,
    production: process.env.OPENAI_PRODUCTION_AGENT_ID!,
    warehouse: process.env.OPENAI_WAREHOUSE_AGENT_ID!,
    purchase: process.env.OPENAI_PURCHASE_AGENT_ID!,
    manager: process.env.OPENAI_MANAGER_AGENT_ID!,
    developer: process.env.OPENAI_DEVELOPER_AGENT_ID!,
  };

  static async runAgent(
    role: keyof typeof AgentBuilderUIFactory.assistantIds,
    prompt: string,
    context?: any
  ) {
    const assistantId = this.assistantIds[role];
    
    if (!assistantId) {
      throw new Error(`Assistant ID not configured for ${role} agent`);
    }

    return await runAgentBuilderWorkflow(assistantId, prompt, context);
  }
}
```

### 4.2 API Route Ekle

```typescript
// app/api/ai/agent-builder-ui/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AgentBuilderUIFactory } from '@/lib/ai/agent-builder-ui-factory';

export async function POST(request: NextRequest) {
  try {
    const { agentRole, prompt, context } = await request.json();

    const result = await AgentBuilderUIFactory.runAgent(
      agentRole,
      prompt,
      context
    );

    return NextResponse.json({
      success: true,
      threadId: result.threadId,
      runId: result.runId,
      response: result.response,
      dashboardLink: `https://platform.openai.com/threads/${result.threadId}`
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 4.3 UI Komponenti Güncelle

```typescript
// app/(dashboard)/ai-agent-builder/page.tsx
const runAgentBuilderUI = async () => {
  setLoading(true);
  
  try {
    const response = await fetch('/api/ai/agent-builder-ui', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentRole: selectedAgent,
        prompt,
        context: { source: 'agent-builder-ui-page' }
      })
    });

    const data = await response.json();
    
    if (data.success) {
      setResult(data);
      toast.success('Agent Builder UI workflow tamamlandı!');
      
      // Thread'e git
      window.open(data.dashboardLink, '_blank');
    }
  } catch (error) {
    toast.error('Hata: ' + error.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 📊 ADIM 5: Dashboard'da İzleme

### 5.1 Threads Dashboard

```bash
https://platform.openai.com/threads
```

**Her thread:**
- Thread ID: `thread_abc123`
- Messages: User + Assistant
- Run history
- Cost breakdown
- Duration

### 5.2 Agent Builder'dan Thread'e Git

1. Agent Builder UI → Workflow seç
2. **"Test"** tab'e git
3. Test çalıştır
4. **"View in Dashboard"** → Thread'e git

---

## 🎯 ADIM 6: Her Agent için Workflow Oluştur

### 6.1 Planning Agent

```yaml
Name: Thunder Planning Agent
Assistant ID: asst_planning_123
Instructions: |
  Üretim planlaması yap.
  BOM kontrolü, stok analizi, termin hesaplama.
  JSON response döndür.
```

### 6.2 Production Agent

```yaml
Name: Thunder Production Agent
Assistant ID: asst_production_456
Instructions: |
  Üretim kayıtlarını doğrula.
  Kalite kontrol, süre analizi, verimlillik.
  JSON response döndür.
```

### 6.3 Warehouse Agent

```yaml
Name: Thunder Warehouse Agent
Assistant ID: asst_warehouse_789
Instructions: |
  Depo yönetimi ve stok hareketleri.
  Zone kontrolü, transfer validasyonu.
  JSON response döndür.
```

### 6.4 Purchase Agent

```yaml
Name: Thunder Purchase Agent
Assistant ID: asst_purchase_abc
Instructions: |
  Satın alma yönetimi.
  Tedarikçi analizi, fiyat kontrolü.
  JSON response döndür.
```

### 6.5 Manager Agent

```yaml
Name: Thunder Manager Agent
Assistant ID: asst_manager_def
Instructions: |
  Yönetici onayları ve stratejik kararlar.
  Konsensüs analizi, risk değerlendirme.
  JSON response döndür.
```

### 6.6 Developer Agent

```yaml
Name: Thunder Developer Agent
Assistant ID: asst_developer_ghi
Instructions: |
  Sistem analizi ve debugging.
  Performance monitoring, error analysis.
  JSON response döndür.
```

---

## 🔧 ADIM 7: Advanced Features

### 7.1 File Upload

Agent'a dosya gönder (Excel, PDF):

```typescript
const file = await openai.files.create({
  file: fs.createReadStream('bom.xlsx'),
  purpose: 'assistants'
});

const message = await openai.beta.threads.messages.create(threadId, {
  role: "user",
  content: "BOM dosyasını analiz et",
  file_ids: [file.id]
});
```

### 7.2 Code Interpreter

Agent'ın kod çalıştırmasına izin ver:

```typescript
const assistant = await openai.beta.assistants.create({
  name: "Planning Agent",
  instructions: "...",
  tools: [{ type: "code_interpreter" }],
  model: "gpt-4o"
});
```

### 7.3 Function Calling

Thunder ERP API'lerini agent'a bağla:

```typescript
const assistant = await openai.beta.assistants.create({
  name: "Planning Agent",
  instructions: "...",
  tools: [
    {
      type: "function",
      function: {
        name: "get_stock_level",
        description: "Get current stock level for a material",
        parameters: {
          type: "object",
          properties: {
            material_id: { type: "string" }
          },
          required: ["material_id"]
        }
      }
    }
  ],
  model: "gpt-4o"
});
```

---

## 💰 MALİYET KARŞILAŞTIRMASI

| Özellik | SDK (Kod) | Agent Builder UI |
|---------|-----------|------------------|
| Setup | 2 saat kod | 10 dakika UI |
| Güncelleme | Code deploy | UI'den düzenle |
| Test | Code çalıştır | UI'den test et |
| Collaboration | Git | UI paylaşımı |
| Version Control | Git | Agent versiyonları |
| Cost/call | ~$0.01 | ~$0.01 (aynı) |

---

## ✅ AVANTAJLAR

### Agent Builder UI
- ✅ **No-code:** Kod yazmadan agent oluştur
- ✅ **Visual:** Drag-drop workflow editor
- ✅ **Live testing:** Direkt UI'den test et
- ✅ **Version control:** Agent versiyonlarını yönet
- ✅ **Collaboration:** Takım üyeleriyle paylaş
- ✅ **Deployment:** Anında publish

### SDK (Kod)
- ✅ **Programmatic control:** Tam kontrol
- ✅ **Git integration:** Code versiyonlama
- ✅ **CI/CD:** Otomatik deployment
- ✅ **Custom logic:** Kompleks akışlar
- ✅ **Testing:** Unit/integration testler

---

## 🎯 HANGISINI KULLANMALI?

### Agent Builder UI Kullan Eğer:
- 👨‍💼 Non-technical takım üyeleri agent düzenleyecek
- 🚀 Hızlı prototipleme lazım
- 🔄 Sık sık prompt değişiklikleri yapılacak
- 👥 Collaboration önemli

### SDK (Kod) Kullan Eğer:
- 👨‍💻 Developer'lar full control istiyor
- 🏗️ Kompleks workflow'lar var
- 🧪 CI/CD pipeline entegrasyonu gerekli
- 📊 Custom analytics/logging lazım

### **HYBRID (İkisi Birden)** ⭐
- Agent Builder UI'de prototip yap
- SDK ile production'a al
- Test için UI, prod için SDK

---

## 🚀 HEMEN BAŞLA

### 1. Agent Builder UI'ye Git
```
https://platform.openai.com/agent-builder
```

### 2. İlk Agent'ı Oluştur
- Name: `Thunder Planning Agent (Test)`
- Model: `gpt-4o`
- Instructions: `Üretim planlaması yap`

### 3. Test Et
- Test prompt: `100 adet Ürün A üretim planı`
- Response kontrol et

### 4. Assistant ID'yi Al
- Deploy butonuna tıkla
- `asst_...` ID'yi kopyala

### 5. Thunder ERP'ye Ekle
```bash
# .env.local
OPENAI_PLANNING_AGENT_ID=asst_abc123...
```

### 6. API'den Çağır
```bash
curl -X POST http://localhost:3000/api/ai/agent-builder-ui \
  -H "Content-Type: application/json" \
  -d '{
    "agentRole": "planning",
    "prompt": "Test"
  }'
```

---

## 📚 KAYNAKLAR

- **Agent Builder:** https://platform.openai.com/agent-builder
- **Assistants API Docs:** https://platform.openai.com/docs/assistants
- **Threads Dashboard:** https://platform.openai.com/threads
- **Playground:** https://platform.openai.com/playground

---

**🎉 Sonuç:** Agent Builder UI ile Thunder ERP agent'larını visual olarak tasarla, test et ve deploy et!

**📅 Son Güncelleme:** 2025-12-19  
**🔄 Versiyon:** 1.0.0  
**🎨 Visual Agent Builder Ready!**

