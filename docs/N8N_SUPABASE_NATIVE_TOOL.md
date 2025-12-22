# n8n Native Supabase Tool ile AI Agent Workflow

## 🎯 Yaklaşım

n8n'in **native Supabase node**'unu AI Agent'lara **tool** olarak ekliyoruz. Bu yaklaşım:

- ✅ **Native Integration**: Built-in Supabase node kullanımı
- ✅ **AI Tool Support**: Supabase node AI tool olarak kullanılabilir ([docs](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/))
- ✅ **Auto Parameters**: AI agent tool parametrelerini otomatik belirleyebilir
- ✅ **Memory Support**: Conversation context korunur
- ✅ **Optimized**: HTTP Request yerine native node daha optimize

## 📋 Workflow Yapısı

```
Webhook Trigger
    ↓
    ├─→ Planning Agent (AI Agent Node)
    │   ├─→ GPT-4o Model
    │   ├─→ Simple Memory
    │   └─→ Supabase Tool (Native Supabase Node)
    │
    ├─→ Production Agent (AI Agent Node)
    │   ├─→ GPT-4o Model
    │   ├─→ Simple Memory
    │   └─→ Supabase Tool (Native Supabase Node)
    │
    └─→ Warehouse Agent (AI Agent Node)
        ├─→ GPT-4o Model
        ├─→ Simple Memory
        └─→ Supabase Tool (Native Supabase Node)
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

### 1. Supabase Credentials (n8n)

n8n Settings → Credentials → Add Credential → Supabase:

- **Host**: `https://your-project.supabase.co`
- **Service Role Secret**: Supabase Dashboard → Settings → API → Service Role Key

**Not**: Service Role Key kullanmalısın çünkü RLS (Row Level Security) bypass için gerekli.

### 2. OpenAI Credentials

n8n Settings → Credentials → Add Credential → OpenAI:
- API Key: `sk-proj-...`

### 3. Workflow Import

1. n8n UI → Workflows → Import from File
2. `multi-agent-consensus-supabase-tool.json` dosyasını seç
3. Import et

### 4. AI Agent Node Bağlantıları

Her AI Agent node için:

1. **Language Model** bağlantısı:
   - GPT-4o node'unu AI Agent node'unun altındaki **"Language Model"** bağlantısına bağla

2. **Memory** bağlantısı:
   - Simple Memory node'unu AI Agent node'unun altındaki **"Memory"** bağlantısına bağla

3. **Tool** bağlantısı:
   - Supabase node'unu AI Agent node'unun altındaki **"Tool"** bağlantısına bağla

### 5. Supabase Node Yapılandırması

Her Supabase Tool node için:

- **Operation**: `Get All Rows` (veya `Get Row` gerekirse)
- **Table**: AI agent tarafından belirlenebilir (`toolInput.table`)
- **Select**: AI agent tarafından belirlenebilir (`toolInput.select`)
- **Filter**: AI agent tarafından belirlenebilir

**AI Tool Parameters**: Supabase node AI tool olarak kullanıldığında, birçok parametre otomatik olarak AI tarafından belirlenebilir. [AI tool parameters documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)'a bak.

## 🧪 Test

```bash
curl -X POST http://192.168.1.250:5678/webhook/multi-agent-consensus \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "ffc05ebe-2ca8-496e-84f8-7eec001b89ac"}'
```

## 💡 AI Agent'ların Supabase Tool Kullanımı

AI Agent'lar Supabase tool'unu kullanarak şu işlemleri yapabilir:

### Planning Agent:
- `production_plans` tablosundan plan bilgileri
- `orders` tablosundan sipariş bilgileri
- `finished_products` tablosundan ürün bilgileri
- `operators` tablosundan kapasite bilgileri

### Production Agent:
- `operators` tablosundan aktif operatörler
- `production_plans` tablosundan aktif planlar
- Kapasite hesaplamaları

### Warehouse Agent:
- `production_plans` tablosundan product_id
- `bom` tablosundan malzeme listesi
- `raw_materials` tablosundan stok bilgileri
- `semi_finished_products` tablosundan stok bilgileri
- `finished_products` tablosundan stok bilgileri

Agent'lar kendi başlarına karar verir:
- Hangi tabloyu sorgulamalı?
- Hangi filtreleri kullanmalı?
- Ne zaman çekmeli?
- Nasıl analiz etmeli?

## 📚 Kaynaklar

- [n8n Supabase Node Documentation](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.supabase/)
- [n8n AI Agent Tutorial](https://docs.n8n.io/advanced-ai/intro-tutorial/)
- [Supabase REST API](https://supabase.com/docs/reference/javascript/introduction)

## 🔍 Önemli Notlar

1. **Service Role Key**: RLS bypass için Service Role Key kullanmalısın
2. **AI Tool Parameters**: Supabase node AI tool olarak kullanıldığında, parametreler AI tarafından otomatik belirlenebilir
3. **Table Selection**: AI agent `toolInput.table` ile hangi tabloyu sorgulayacağını belirler
4. **Filtering**: AI agent `toolInput.filter` ile filtreleme yapabilir
5. **Memory**: Her agent'ın kendi memory'si var, conversation context korunur

