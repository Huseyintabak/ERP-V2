# 🚀 n8n İlk Workflow Oluşturma Rehberi

## 📋 Adım 1: n8n'e Giriş Yap

1. Browser'da açın: **http://192.168.1.250:5678**
2. Giriş bilgileri:
   - **Username:** `admin`
   - **Password:** `Thunder2025!`

---

## 📋 Adım 2: OpenAI Credentials Ekle

1. **Settings** → **Credentials** → **Add Credential**
2. **OpenAI**'yi seçin
3. **API Key** alanına Thunder ERP `.env.local` dosyasındaki `OPENAI_API_KEY` değerini yapıştırın
4. **Save** butonuna tıklayın
5. Credential'a bir isim verin (örn: "OpenAI API")

**Not:** API Key formatı: `sk-proj-...`

---

## 📋 Adım 3: İlk Workflow'u Import Et

### Yöntem 1: JSON Dosyasından Import

1. **Workflows** → **Import from JSON**
2. Aşağıdaki JSON içeriğini kopyalayıp yapıştırın:

```json
{
  "name": "Thunder Planning Agent (Basic)",
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
      "position": [250, 300],
      "webhookId": "planning-agent"
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
  },
  "pinData": {},
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "tags": [],
  "triggerCount": 0,
  "updatedAt": "2025-01-27T00:00:00.000Z",
  "versionId": "1"
}
```

3. **Import** butonuna tıklayın

### Yöntem 2: Dosyadan Import

1. **Workflows** → **Import from File**
2. `n8n-workflows/1-planning-agent-basic.json` dosyasını seçin
3. **Import** butonuna tıklayın

---

## 📋 Adım 4: Credentials'ı Düzenle

1. Workflow'u açın
2. **Planning Agent (GPT-4o)** node'una tıklayın
3. **Credentials** bölümünde oluşturduğunuz OpenAI credential'ı seçin
4. **Save** butonuna tıklayın

---

## 📋 Adım 5: Workflow'u Aktifleştir

1. Workflow'un sağ üst köşesindeki **Inactive** toggle'ını **Active** yapın
2. Workflow artık çalışır durumda!

---

## 📋 Adım 6: Webhook URL'ini Al

1. **Webhook Trigger** node'una tıklayın
2. **Production URL**'i kopyalayın:
   ```
   http://192.168.1.250:5678/webhook/planning-agent
   ```

---

## 🧪 Test Etme

### Terminal'den Test

```bash
curl -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "100 adet Ürün A için üretim planı oluştur. BOM kontrolü yap ve stok durumunu değerlendir."
  }'
```

### Thunder ERP API'den Test

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }'
```

---

## ✅ Başarı Kontrolü

Workflow başarıyla çalışıyorsa şu response'u almalısınız:

```json
{
  "success": true,
  "agent": "planning",
  "response": "...",
  "tokens": 1234,
  "cost": 0.0123
}
```

---

## 🎯 Sonraki Adımlar

1. ✅ İlk workflow çalışıyor mu test edin
2. 📊 n8n UI'de **Executions** sekmesinden workflow çalışmalarını görüntüleyin
3. 🔄 **2-planning-agent-advanced.json** workflow'unu import edin (database entegrasyonlu)
4. 🚀 **3-multi-agent-consensus.json** workflow'unu import edin (multi-agent)

---

## 🐛 Sorun Giderme

### "OpenAI API Key is invalid" hatası
- Credentials'ı kontrol edin
- API Key'in doğru olduğundan emin olun

### "Webhook not found" hatası
- Workflow'un **Active** olduğundan emin olun
- Webhook URL'ini kontrol edin

### "Node execution failed" hatası
- n8n UI'de **Executions** sekmesinden hata detaylarını görüntüleyin
- OpenAI API quota'nızı kontrol edin

---

**🎊 İlk workflow'unuz hazır!**

