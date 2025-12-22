# n8n AI Agent Node ile Multi-Agent Consensus Workflow

## 🎯 Yaklaşım

n8n'in native **AI Agent node**'unu kullanarak Supabase'i **tool** olarak ekliyoruz. Bu yaklaşım:

- ✅ **Daha modüler**: Her agent kendi başına karar verir
- ✅ **Memory desteği**: Conversation context korunur
- ✅ **Tool-based**: Agent'lar Supabase'den veri çekebilir
- ✅ **Genişletilebilir**: Yeni tool'lar kolayca eklenebilir

## 📋 Workflow Yapısı

```
Webhook Trigger
    ↓
    ├─→ Planning Agent (AI Agent Node)
    │   ├─→ GPT-4o Model
    │   ├─→ Simple Memory
    │   └─→ Supabase Tool (HTTP Request)
    │
    ├─→ Production Agent (AI Agent Node)
    │   ├─→ GPT-4o Model
    │   ├─→ Simple Memory
    │   └─→ Supabase Tool (HTTP Request)
    │
    └─→ Warehouse Agent (AI Agent Node)
        ├─→ GPT-4o Model
        ├─→ Simple Memory
        └─→ Supabase Tool (HTTP Request)
            ↓
    Aggregate Responses (Code Node)
            ↓
    Manager Agent (AI Agent Node)
        ├─→ GPT-4o Model
        └─→ Simple Memory
            ↓
    Format Response (Code Node)
            ↓
    Respond to Webhook
```

## 🔧 Kurulum

### 1. Environment Variables (n8n)

n8n Settings → Environment Variables:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. OpenAI Credentials

n8n Settings → Credentials → Add Credential → OpenAI:
- API Key: `sk-proj-...`

### 3. Workflow Import

1. n8n UI → Workflows → Import from File
2. `multi-agent-consensus-ai-agent.json` dosyasını seç
3. Import et

### 4. AI Agent Node Yapılandırması

Her AI Agent node için:

1. **Chat Model** bağlantısı:
   - GPT-4o node'unu AI Agent node'unun altındaki **"Language Model"** bağlantısına bağla

2. **Memory** bağlantısı:
   - Simple Memory node'unu AI Agent node'unun altındaki **"Memory"** bağlantısına bağla

3. **Tool** bağlantısı:
   - Supabase HTTP Request node'unu AI Agent node'unun altındaki **"Tool"** bağlantısına bağla

### 5. Supabase Tool Yapılandırması

Her Supabase Tool (HTTP Request node) için:

- **Method**: GET
- **URL**: `={{ $env.SUPABASE_URL }}/rest/v1/{{ $json.toolInput.table }}`
- **Headers**:
  - `apikey`: `={{ $env.SUPABASE_SERVICE_ROLE_KEY }}`
  - `Authorization`: `={{ \`Bearer ${$env.SUPABASE_SERVICE_ROLE_KEY}\` }}`
  - `Content-Type`: `application/json`
- **Query Parameters**:
  - `select`: `={{ $json.toolInput.select || '*' }}`
  - `id`: `={{ $json.toolInput.id ? \`eq.${$json.toolInput.id}\` : undefined }}`

## 🧪 Test

```bash
curl -X POST http://192.168.1.250:5678/webhook/multi-agent-consensus \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "ffc05ebe-2ca8-496e-84f8-7eec001b89ac"}'
```

## 💡 AI Agent'ların Tool Kullanımı

AI Agent'lar Supabase tool'unu kullanarak şu sorguları yapabilir:

- `production_plans` tablosundan plan bilgileri
- `orders` tablosundan sipariş bilgileri
- `bom` tablosundan malzeme listesi
- `raw_materials`, `semi_finished_products`, `finished_products` tablolarından stok bilgileri
- `operators` tablosundan kapasite bilgileri

Agent'lar kendi başlarına karar verir:
- Hangi veriyi çekmeli?
- Ne zaman çekmeli?
- Nasıl analiz etmeli?

## 📚 Kaynaklar

- [n8n AI Agent Tutorial](https://docs.n8n.io/advanced-ai/intro-tutorial/)
- [n8n AI Agent Node Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.aiagent/)
- [Supabase REST API](https://supabase.com/docs/reference/javascript/introduction)

