# 🔧 OpenAI Dashboard Setup Guide

Thunder ERP AI Agent'larını OpenAI Dashboard'da izlemek için adım adım kurulum rehberi.

## 📋 Gereksinimler

- OpenAI Account (https://platform.openai.com)
- API Key (sk-proj-... ile başlar)
- Credit/Balance (minimum $5)
- Thunder ERP localhost veya sunucu erişimi

## 🚀 Adım Adım Kurulum

### 1. OpenAI Account ve API Key

#### 1.1 OpenAI'ye Kaydolun

```bash
# 1. Browser'da aç
https://platform.openai.com/signup

# 2. Email ile kaydol
# 3. Email doğrula
# 4. Login yap
```

#### 1.2 API Key Oluştur

```bash
# 1. API Keys sayfasına git
https://platform.openai.com/api-keys

# 2. "Create new secret key" butonuna tıkla

# 3. Key'e isim ver (örn: "ThunderERP-Production")

# 4. Permissions seç:
   - ✅ All (Recommended)
   - veya
   - ✅ Chat Completions
   - ✅ Assistants & Threads

# 5. "Create secret key" butonuna tıkla

# 6. Key'i KOPYALA (bir daha gösterilmez!)
   sk-proj-abcd1234efgh5678...

# 7. Güvenli bir yere kaydet (1Password, LastPass, etc.)
```

#### 1.3 Credit Ekle (Gerekirse)

```bash
# 1. Billing sayfasına git
https://platform.openai.com/settings/organization/billing/overview

# 2. "Add payment method" tıkla

# 3. Kredi kartı bilgilerini gir

# 4. Minimum $5 credit ekle
   - GPT-4o: ~$0.0025 per 1K input tokens
   - GPT-4o: ~$0.01 per 1K output tokens
   - Ortalama conversation: ~$0.01-0.05
```

### 2. Tracing'i Aktifleştir

#### 2.1 Tracing Settings

```bash
# 1. Organization settings'e git
https://platform.openai.com/settings/organization/tracing

# 2. "Enable tracing" toggle'ı AÇ (ON)

# 3. (Opsiyonel) Trace retention period ayarla
   - Default: 30 days
   - Recommended: 90 days

# 4. "Save" butonuna tıkla
```

#### 2.2 Tracing Verification

```bash
# 1. Traces sayfasına git
https://platform.openai.com/traces

# 2. "No traces yet" mesajı görmeli
   (İlk conversation'dan sonra trace'ler görünür)
```

### 3. Thunder ERP'de API Key Ayarla

#### 3.1 Localhost Setup

```bash
# 1. Thunder ERP dizinine git
cd /path/to/ThunderV2

# 2. .env.local dosyasını aç (veya oluştur)
nano .env.local

# 3. API key'i ekle
OPENAI_API_KEY=sk-proj-abcd1234efgh5678...
AGENT_ENABLED=true
AGENT_LOGGING_ENABLED=true

# 4. Kaydet ve kapat (Ctrl+X, Y, Enter)

# 5. Next.js'i restart et
npm run dev
```

#### 3.2 Production Server Setup

```bash
# 1. SSH ile sunucuya bağlan
ssh user@192.168.1.250

# 2. Thunder ERP dizinine git
cd /var/www/thunder-erp

# 3. .env.local dosyasını aç
sudo nano .env.local

# 4. API key'i ekle (yukarıdaki gibi)

# 5. PM2'yi restart et
pm2 restart thunder-erp

# 6. Logları kontrol et
pm2 logs thunder-erp --lines 50
```

### 4. Agent Builder UI'yi Test Et

#### 4.1 Browser'da Aç

```bash
# Localhost
http://localhost:3000/ai-agent-builder

# Production
http://192.168.1.250/ai-agent-builder
```

#### 4.2 Agent Info Yükle

1. "Agent Bilgilerini Yükle" butonuna tıkla
2. Status kontrolü:
   - ✅ **API Key Configured** - Hazır!
   - ❌ **API Key Missing** - .env.local kontrol et
3. **6 Agents Active** görmeli

#### 4.3 İlk Agent Testi

**Single Agent Mode:**

1. Agent: **Planning Agent** seç
2. Request Type: **Query** seç
3. "Örnek Prompt Yükle" butonuna tıkla
4. Veya manuel prompt gir:
   ```
   100 adet Ürün A için üretim planı oluştur. 
   Termin: 7 gün. Mevcut stok kontrolü yap.
   ```
5. "Agent Çalıştır" butonuna tıkla
6. Bekle (5-10 saniye)
7. ✅ **Result Card** görmeli:
   - Final Decision: approved/rejected/needs_review
   - Agent Reasoning
   - Confidence Score
   - Workflow ID

#### 4.4 Multi-Agent Testi

1. **Multi-Agent** moduna geç
2. Agent'ları seç:
   - ✅ Planning Agent
   - ✅ Warehouse Agent
   - ✅ Production Agent
3. Request Type: **Validation** seç
4. Prompt gir:
   ```
   Yeni sipariş: 500 adet Ürün B
   Termin: 48 saat
   Müşteri: ABC Ltd.
   ```
5. "Multi-Agent Çalıştır" butonuna tıkla
6. ✅ **Multi-Agent Result** görmeli:
   - Her agent'ın cevabı
   - Consensus (2 approve, 0 reject, 1 review)
   - Final Decision

### 5. OpenAI Dashboard'da İzle

#### 5.1 Traces'e Git

```bash
# 1. Result Card'da "Dashboard'da Görüntüle" butonuna tıkla
# veya
# 2. Direkt link aç
https://platform.openai.com/traces
```

#### 5.2 Trace Filtrele

```bash
# 1. Search bar'a workflow ID gir
planning_agent_workflow

# 2. veya
# 3. Filters tıkla
#    - Source: "thunder-erp"
#    - Date range: Last 24 hours
```

#### 5.3 Trace Detaylarını Gör

**Trace Card'da:**
- **Request:** Agent'a gönderilen prompt
- **Response:** Agent'ın cevabı
- **Tokens:** Input/Output token sayısı
- **Cost:** Toplam maliyet ($)
- **Duration:** Response süresi (ms)
- **Model:** gpt-4o
- **Metadata:**
  - workflow_id
  - agent_role
  - request_id
  - request_type

**Timeline View:**
- Conversation akışı
- Her message'ın timestamp'i
- Token usage breakdown

### 6. API Test (Opsiyonel)

#### 6.1 cURL ile Test

```bash
# Single Agent Test
curl -X POST http://localhost:3000/api/ai/agent-builder-test \
  -H "Content-Type: application/json" \
  -d '{
    "agentRole": "planning",
    "prompt": "100 adet Ürün A üretim planı",
    "type": "request"
  }'

# Multi-Agent Test
curl -X PUT http://localhost:3000/api/ai/agent-builder-test \
  -H "Content-Type: application/json" \
  -d '{
    "agentRoles": ["planning", "warehouse", "production"],
    "prompt": "500 adet Ürün B siparişi",
    "type": "validation"
  }'

# Agent Info
curl http://localhost:3000/api/ai/agent-builder-test
```

#### 6.2 Response Kontrolü

```json
{
  "success": true,
  "conversationId": "test_1234567890",
  "finalDecision": "approved",
  "agentResponse": {
    "agentName": "Planning Agent",
    "decision": "approved",
    "reasoning": "Üretim planı uygun...",
    "confidence": 0.95
  },
  "workflowIds": ["planning_agent_workflow"],
  "dashboardLinks": {
    "traces": "https://platform.openai.com/traces",
    "agents": [...]
  }
}
```

## 🔍 Troubleshooting

### API Key Hatası

**Hata:**
```
OPENAI_API_KEY not configured
```

**Çözüm:**
```bash
# 1. .env.local kontrolü
cat .env.local | grep OPENAI_API_KEY

# 2. Eksikse ekle
echo "OPENAI_API_KEY=sk-proj-..." >> .env.local

# 3. Restart
npm run dev  # veya pm2 restart thunder-erp
```

### Trace Görünmüyor

**Sorun:** OpenAI Dashboard'da trace yok

**Çözümler:**

1. **Tracing aktif mi?**
   ```
   https://platform.openai.com/settings/organization/tracing
   Enable tracing: ON
   ```

2. **API call başarılı mı?**
   ```bash
   # Thunder ERP logs kontrol
   pm2 logs thunder-erp | grep "Agent Builder"
   
   # Success görmen gereken:
   "🤖 Agent Builder Wrapper created"
   "✅ Traced execution completed"
   ```

3. **API key doğru mu?**
   ```bash
   # Test et
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   
   # 200 OK görmeli
   ```

4. **Filtreleme yanlış mı?**
   ```
   Dashboard'da:
   - Clear all filters
   - Date range: Last 7 days
   - Source: "thunder-erp"
   ```

### Quota Exceeded

**Hata:**
```
429 Too Many Requests
```

**Çözüm:**
```bash
# 1. Billing kontrol
https://platform.openai.com/settings/organization/billing/overview

# 2. Credit ekle ($5-$10)

# 3. Rate limit kontrol
https://platform.openai.com/settings/organization/limits

# 4. Thunder ERP'de quota manager kontrol
# lib/ai/utils/quota-manager.ts
```

### Agent Hatası

**Hata:**
```
Agent execution failed
```

**Debug:**

1. **Console logs:**
   ```bash
   pm2 logs thunder-erp --lines 100
   ```

2. **Database logs:**
   ```sql
   SELECT * FROM agent_logs 
   WHERE action = 'agent_builder_response' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. **OpenAI Dashboard:**
   ```
   Traces → Filter by date → Check error messages
   ```

## 📊 Best Practices

### 1. Development vs Production

**Development:**
- Use `gpt-4o-mini` (cheaper, faster)
- Enable verbose logging
- Test with dummy data

**Production:**
- Use `gpt-4o` (more accurate)
- Enable only essential logging
- Monitor costs daily

### 2. Cost Optimization

```typescript
// Use lower temperature for deterministic results
temperature: 0.3  // vs 0.7

// Reduce max tokens for short responses
maxTokens: 1024   // vs 2048

// Cache common prompts
// Agent Builder wrapper already does this
```

### 3. Monitoring

**Daily:**
- Check OpenAI Dashboard costs
- Review failed traces
- Monitor response times

**Weekly:**
- Analyze agent accuracy
- Optimize prompts
- Review consensus patterns

**Monthly:**
- Cost analysis report
- Agent performance review
- Model upgrade evaluation

## 🎯 Success Metrics

### Agent Performance
- ✅ Response time < 5 seconds
- ✅ Confidence score > 0.85
- ✅ Decision accuracy > 90%
- ✅ Error rate < 5%

### Cost Efficiency
- ✅ Average cost per conversation < $0.05
- ✅ Monthly budget < $100
- ✅ ROI > 300% (time saved)

### User Adoption
- ✅ 80% of orders use AI validation
- ✅ 90% of production logs verified
- ✅ 95% user satisfaction

## 🔗 Useful Links

- **OpenAI Platform:** https://platform.openai.com
- **API Keys:** https://platform.openai.com/api-keys
- **Traces:** https://platform.openai.com/traces
- **Billing:** https://platform.openai.com/settings/organization/billing
- **Usage:** https://platform.openai.com/usage
- **Docs:** https://platform.openai.com/docs

- **Thunder ERP Docs:**
  - [Agent Builder Integration](./AGENT_BUILDER_INTEGRATION.md)
  - [Multi-Agent Architecture](./MULTI_AGENT_ARCHITECTURE.md)
  - [AI Agent Implementation](./AI_AGENT_IMPLEMENTATION_NOTES.md)

## 🎉 Başarılı Setup!

Eğer:
- ✅ Agent Builder UI'de "API Key Configured" görüyorsan
- ✅ Agent test'i başarılı olduysa
- ✅ OpenAI Dashboard'da trace görüyorsan

**Tebrikler! Setup tamamlandı! 🚀**

Artık Thunder ERP AI Agent'larını OpenAI Dashboard'da izleyebilir, optimize edebilir ve production'da kullanabilirsin!

---

**📅 Son Güncelleme:** 2025-12-19  
**🔄 Versiyon:** 1.0.0  
**🤖 OpenAI Agent Builder Ready!**

