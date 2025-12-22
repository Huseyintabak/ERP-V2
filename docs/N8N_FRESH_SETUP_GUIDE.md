# 🚀 n8n Sıfırdan Kurulum Rehberi

Adım adım, her şeyi teyit ederek n8n'i sıfırdan kuralım.

---

## 📋 ADIM 1: n8n Container Durumu Kontrolü

### Sunucuda çalıştırın:

```bash
ssh vipkrom@192.168.1.250
cd /var/www/thunder-erp

# n8n container durumunu kontrol et
sudo docker compose ps | grep n8n
```

**Beklenen çıktı:**
```
thunder-n8n   running   ...   0.0.0.0:5678->5678/tcp
```

**Eğer çalışmıyorsa:**
```bash
sudo docker compose up -d n8n
```

**✅ Teyit:** Container çalışıyor mu? (Evet/Hayır)

---

## 📋 ADIM 2: n8n Health Check

```bash
curl http://192.168.1.250:5678/healthz
```

**Beklenen çıktı:**
```json
{"status":"ok"}
```

**✅ Teyit:** Health check başarılı mı? (Evet/Hayır)

---

## 📋 ADIM 3: n8n UI'ye Giriş

1. Browser'da açın: `http://192.168.1.250:5678`
2. Giriş bilgileri:
   - **Username:** `admin`
   - **Password:** `Thunder2025!`

**✅ Teyit:** n8n UI'ye giriş yapabildiniz mi? (Evet/Hayır)

---

## 📋 ADIM 4: OpenAI Credentials Oluşturma

### 4.1. Thunder ERP'den API Key'i Alın

```bash
# Sunucuda
cd /var/www/thunder-erp
grep "OPENAI_API_KEY" .env.local
```

**API Key formatı:** `sk-proj-...`

**✅ Teyit:** API Key'i kopyaladınız mı? (Evet/Hayır)

### 4.2. n8n'de Credential Oluşturun

1. n8n UI'de: **Settings** → **Credentials** → **Add Credential**
2. **OpenAI**'yi seçin
3. **API Key** alanına Thunder ERP'den aldığınız API Key'i yapıştırın
4. **Save** butonuna tıklayın
5. Credential'a bir isim verin: **"OpenAI API"**

**✅ Teyit:** OpenAI credential oluşturuldu mu? (Evet/Hayır)

---

## 📋 ADIM 5: İlk Workflow'u Oluşturma

### 5.1. Yeni Workflow Oluşturun

1. n8n UI'de: **Workflows** → **Add Workflow**
2. Workflow adını değiştirin: **"Thunder Planning Agent (Basic)"**

**✅ Teyit:** Yeni workflow oluşturuldu mu? (Evet/Hayır)

### 5.2. Webhook Trigger Node Ekleme

1. Canvas'da **"+"** butonuna tıklayın
2. **"Webhook"** yazın ve seçin
3. Webhook node'una tıklayın
4. Ayarları yapın:
   - **HTTP Method:** `POST`
   - **Path:** `planning-agent`
   - **Response Mode:** `Respond to Webhook`
5. **Save** butonuna tıklayın

**✅ Teyit:** Webhook Trigger node eklendi mi? (Evet/Hayır)
**✅ Teyit:** Production URL nedir? (Yazın: `http://192.168.1.250:5678/webhook/planning-agent`)

---

## 📋 ADIM 6: OpenAI Node Ekleme

### 6.1. OpenAI Node Ekleme

1. Webhook node'unun sağına **"+"** butonuna tıklayın
2. **"OpenAI"** yazın ve seçin
3. OpenAI node'una tıklayın

### 6.2. OpenAI Node Ayarları

**Credentials:**
- **OpenAI API:** Oluşturduğunuz credential'ı seçin

**Resource:**
- **Text**

**Operation:**
- **Message**

**Model:**
- **gpt-4o**

**Prompt:**
```
={{ $json.body.prompt }}
```

**System Message:**
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

**Temperature:**
- `0.7`

**Max Tokens:**
- `2048`

4. **Save** butonuna tıklayın

**✅ Teyit:** OpenAI node eklendi ve yapılandırıldı mı? (Evet/Hayır)

---

## 📋 ADIM 7: Respond to Webhook Node Ekleme

### 7.1. Respond to Webhook Node Ekleme

1. OpenAI node'unun sağına **"+"** butonuna tıklayın
2. **"Respond to Webhook"** yazın ve seçin
3. Respond to Webhook node'una tıklayın

### 7.2. Respond to Webhook Node Ayarları

**Respond With:**
- **JSON**

**Response Body:**
```json
={{
  "success": true,
  "agent": "planning",
  "response": $json.message.content,
  "tokens": $json.usage.total_tokens,
  "cost": ($json.usage.prompt_tokens * 0.005 / 1000) + ($json.usage.completion_tokens * 0.015 / 1000)
}}
```

4. **Save** butonuna tıklayın

**✅ Teyit:** Respond to Webhook node eklendi mi? (Evet/Hayır)

---

## 📋 ADIM 8: Workflow'u Test Etme

### 8.1. n8n UI'de Test

1. Workflow'u açın
2. Sağ üstte **"Execute Workflow"** butonuna tıklayın
3. Test data girin:
   ```json
   {
     "prompt": "100 adet Ürün A için üretim planı oluştur"
   }
   ```
4. **Execute** butonuna tıklayın
5. Sonuçları kontrol edin

**✅ Teyit:** Workflow test başarılı mı? (Evet/Hayır)
**✅ Teyit:** Response geldi mi? (Evet/Hayır)

### 8.2. Terminal'den Test

```bash
# Sunucuda
curl -X POST http://192.168.1.250:5678/webhook-test/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

**✅ Teyit:** Test webhook çalıştı mı? (Evet/Hayır)

---

## 📋 ADIM 9: Workflow'u Aktifleştirme

1. Workflow'u açın
2. Sağ üstteki **"Inactive"** toggle'ını **"Active"** yapın
3. Workflow artık production'da çalışır!

**✅ Teyit:** Workflow aktif mi? (Evet/Hayır)

---

## 📋 ADIM 10: Production Webhook Test

```bash
# Sunucuda
curl -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

**Beklenen çıktı:**
```json
{
  "success": true,
  "agent": "planning",
  "response": "...",
  "tokens": 1234,
  "cost": 0.0123
}
```

**✅ Teyit:** Production webhook çalıştı mı? (Evet/Hayır)
**✅ Teyit:** Response geldi mi? (Evet/Hayır)

---

## 📋 ADIM 11: Thunder ERP Environment Variables

### 11.1. .env.local Kontrolü

```bash
# Sunucuda
cd /var/www/thunder-erp
grep "N8N" .env.local
```

**Beklenen değişkenler:**
```
N8N_WEBHOOK_URL=http://localhost:5678
N8N_BASE_URL=http://192.168.1.250:5678
N8N_API_KEY=...
```

**✅ Teyit:** N8N değişkenleri var mı? (Evet/Hayır)

### 11.2. Eksikse Ekleme

```bash
# Eğer eksikse
cat >> .env.local << 'EOF'

# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678
N8N_BASE_URL=http://192.168.1.250:5678
EOF
```

**✅ Teyit:** N8N değişkenleri eklendi mi? (Evet/Hayır)

---

## 📋 ADIM 12: PM2 Ecosystem Config Güncelleme

```bash
# Sunucuda
cd /var/www/thunder-erp

# PM2 config'i güncelle
./update-pm2-env.sh

# Veya manuel olarak ecosystem.config.js'i kontrol edin
cat ecosystem.config.js | grep N8N
```

**✅ Teyit:** PM2 config güncellendi mi? (Evet/Hayır)

---

## 📋 ADIM 13: PM2 Restart

```bash
# Sunucuda
pm2 restart thunder-erp --update-env

# Durumu kontrol et
pm2 show thunder-erp | grep status
```

**✅ Teyit:** PM2 restart edildi mi? (Evet/Hayır)
**✅ Teyit:** PM2 status nedir? (online/stopped)

---

## 📋 ADIM 14: Thunder ERP API Test

```bash
# Sunucuda
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }'
```

**Beklenen çıktı:**
```json
{
  "success": true,
  "workflow": "planning",
  "result": {
    "success": true,
    "agent": "planning",
    "response": "...",
    "tokens": 1234,
    "cost": 0.0123
  },
  "message": "n8n workflow completed successfully!"
}
```

**✅ Teyit:** Thunder ERP API çalıştı mı? (Evet/Hayır)
**✅ Teyit:** Response geldi mi? (Evet/Hayır)

---

## 🎉 TAMAMLANDI!

Tüm adımları tamamladıysanız, n8n entegrasyonu hazır!

---

## 🐛 Sorun Giderme

### Webhook 404 hatası
- Workflow aktif mi kontrol edin
- Webhook path'i doğru mu kontrol edin
- n8n container çalışıyor mu kontrol edin

### Thunder ERP API 404 hatası
- PM2 restart edildi mi kontrol edin
- Client kodunu kontrol edin: `grep "planning-agent" lib/ai/n8n-client.ts`
- Environment variables yüklü mü kontrol edin

### Response body boş
- Respond to Webhook node'unun çalıştığını kontrol edin
- n8n Executions sekmesinde hata var mı kontrol edin
- OpenAI node'unun başarılı çalıştığını kontrol edin

---

**📅 Son Güncelleme:** 2025-01-27  
**🔄 Versiyon:** 1.0.0 Fresh Setup

