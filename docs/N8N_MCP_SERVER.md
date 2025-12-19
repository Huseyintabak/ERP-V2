# 🔗 n8n MCP Server Entegrasyonu

Thunder ERP'yi n8n'in Model Context Protocol (MCP) Server'ına bağlama rehberi.

## 🎯 NEDEN MCP SERVER?

MCP Server, n8n workflow'larınızı AI agent'larınızdan direkt olarak çağırabilmenizi sağlar:

- ✅ **Direct Integration:** n8n workflow'larını AI agent'lardan çağır
- ✅ **Tool Access:** n8n'deki tool'ları AI agent'lar kullanabilir
- ✅ **Resource Access:** n8n resource'larına erişim
- ✅ **Prompt Templates:** n8n'deki prompt'ları kullan

---

## 📦 KURULUM

### 1. n8n'de MCP Server'ı Aktifleştir

n8n UI'de:
1. **Settings** → **MCP Server**
2. **Enable MCP Server** seçeneğini aktifleştir
3. **Access Token** oluştur
4. **Server URL**'i kopyala:
   ```
   http://192.168.1.250:5678/mcp-server/http
   ```

### 2. Thunder ERP'ye Environment Variable'ları Ekle

Sunucuda `.env.local` dosyasına ekle:

```bash
cd /var/www/thunder-erp

# .env.local dosyasına ekle
cat >> .env.local << 'EOF'

# n8n MCP Server Configuration
N8N_MCP_SERVER_URL=http://192.168.1.250:5678/mcp-server/http
N8N_MCP_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EOF
```

**ÖNEMLİ:** `N8N_MCP_ACCESS_TOKEN` değerini n8n UI'den aldığınız token ile değiştirin!

### 3. Thunder ERP'yi Yeniden Başlat

```bash
pm2 restart thunder-erp
```

---

## 🧪 TEST ETME

### 1. MCP Server Bağlantısını Test Et

```bash
curl http://192.168.1.250:3000/api/ai/n8n-mcp
```

**Beklenen Çıktı:**
```json
{
  "success": true,
  "serverInfo": {
    "name": "n8n",
    "version": "1.x.x",
    "protocolVersion": "2024-11-05",
    "capabilities": { ... }
  },
  "tools": [...],
  "resources": [...],
  "prompts": [...]
}
```

### 2. MCP Tool Çağır

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n-mcp \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "workflow-trigger",
    "arguments": {
      "workflowId": "workflow-uuid",
      "data": {
        "prompt": "Test mesajı"
      }
    }
  }'
```

---

## 💻 KOD KULLANIMI

### TypeScript'te MCP Client Kullanımı

```typescript
import { getN8nMCPClient } from '@/lib/ai/n8n-mcp-client';

// MCP Client'ı al
const mcpClient = getN8nMCPClient();

// Server bilgilerini al
const serverInfo = await mcpClient.getServerInfo();
console.log('MCP Server:', serverInfo.name, serverInfo.version);

// Mevcut tool'ları listele
const tools = await mcpClient.listTools();
console.log('Available tools:', tools.map(t => t.name));

// Tool çağır
const result = await mcpClient.callTool('workflow-trigger', {
  workflowId: 'workflow-uuid',
  data: { prompt: 'Test' }
});

// Resource'ları listele
const resources = await mcpClient.listResources();

// Resource oku
const resource = await mcpClient.readResource('resource-uri');

// Prompt'ları listele
const prompts = await mcpClient.listPrompts();

// Prompt kullan
const prompt = await mcpClient.getPrompt('planning-prompt', {
  orderId: '12345'
});
```

---

## 🔧 API ENDPOINTS

### GET `/api/ai/n8n-mcp`

MCP Server bilgilerini ve mevcut tool'ları listele.

**Response:**
```json
{
  "success": true,
  "serverInfo": { ... },
  "tools": [ ... ],
  "resources": [ ... ],
  "prompts": [ ... ]
}
```

### POST `/api/ai/n8n-mcp`

MCP Tool çağır.

**Request Body:**
```json
{
  "toolName": "workflow-trigger",
  "arguments": {
    "workflowId": "uuid",
    "data": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "toolName": "workflow-trigger",
  "result": { ... }
}
```

---

## 🎨 USE CASES

### 1. AI Agent'tan n8n Workflow Çağırma

```typescript
// AI Agent içinde
const mcpClient = getN8nMCPClient();

// Planning workflow'unu çağır
const result = await mcpClient.callTool('trigger-workflow', {
  workflowId: 'planning-agent-workflow-id',
  data: {
    prompt: '100 adet Ürün A için plan oluştur',
    plan_id: 'uuid'
  }
});
```

### 2. n8n Resource'larını Kullanma

```typescript
// n8n'deki resource'ları oku
const resources = await mcpClient.listResources();
const bomData = await mcpClient.readResource('bom://product-123');
```

### 3. n8n Prompt Template'lerini Kullanma

```typescript
// n8n'deki prompt template'ini kullan
const prompt = await mcpClient.getPrompt('production-planning-prompt', {
  orderId: '12345',
  quantity: 100
});
```

---

## 🔒 GÜVENLİK

- ✅ **Access Token:** `.env.local` dosyasında saklanır (git'e commit edilmez)
- ✅ **HTTPS:** Production'da HTTPS kullanın
- ✅ **Token Rotation:** Düzenli olarak token'ı yenileyin

---

## 🐛 SORUN GİDERME

### MCP Server'a Bağlanamıyorum

1. **Environment variable'ları kontrol et:**
   ```bash
   cd /var/www/thunder-erp
   cat .env.local | grep N8N_MCP
   ```

2. **n8n MCP Server aktif mi?**
   - n8n UI → Settings → MCP Server
   - "Enable MCP Server" aktif olmalı

3. **Access Token doğru mu?**
   - n8n UI'den yeni token oluştur
   - `.env.local`'e ekle
   - PM2'yi restart et

### Tool Bulunamıyor

1. **Mevcut tool'ları listele:**
   ```bash
   curl http://192.168.1.250:3000/api/ai/n8n-mcp
   ```

2. **Tool adını kontrol et:**
   - n8n UI'de workflow'u aç
   - MCP tool node'una bak
   - Tool adını doğru yazdığından emin ol

---

## 📚 KAYNAKLAR

- **n8n MCP Docs:** https://docs.n8n.io/integrations/mcp-server
- **MCP Protocol:** https://modelcontextprotocol.io
- **Thunder ERP n8n Docs:** `/docs/N8N_AGENT_WORKFLOWS.md`

---

## 🎊 SONUÇ

Artık Thunder ERP AI agent'larınız n8n workflow'larınızı direkt olarak çağırabilir!

**📅 Son Güncelleme:** 2025-01-27  
**🔄 Versiyon:** 1.0.0  
**🚀 Thunder ERP + n8n MCP = Perfect Integration!**

