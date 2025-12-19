# 🚀 Thunder ERP n8n Workflows

Hazır JSON workflow'ları n8n'e import edin!

## 📦 Workflow'lar

### 1. Planning Agent (Basic) - `1-planning-agent-basic.json`
**En basit workflow** - Sadece OpenAI ile üretim planı oluşturur.

**Özellikler:**
- ✅ Webhook trigger
- ✅ OpenAI GPT-4o
- ✅ JSON response

**Webhook URL:** `http://192.168.1.250:5678/webhook/planning-agent`

**Test:**
```bash
curl -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

---

### 2. Planning Agent (Advanced) - `2-planning-agent-advanced.json`
**Database entegrasyonlu** - BOM ve stok kontrolü yapar.

**Özellikler:**
- ✅ Webhook trigger
- ✅ Supabase PostgreSQL queries
- ✅ BOM (Bill of Materials) kontrolü
- ✅ Stok yeterliliği analizi
- ✅ Conditional logic (approved/rejected)
- ✅ Database update

**Webhook URL:** `http://192.168.1.250:5678/webhook/planning-agent-advanced`

**Test:**
```bash
curl -X POST http://192.168.1.250:5678/webhook/planning-agent-advanced \
  -H "Content-Type: application/json" \
  -d '{"plan_id": "uuid-of-production-plan"}'
```

---

### 3. Multi-Agent Consensus - `3-multi-agent-consensus.json`
**3 agent + Manager onayı** - Konsensüs sistemi.

**Özellikler:**
- ✅ Webhook trigger
- ✅ 3 paralel agent (Planning, Production, Warehouse)
- ✅ Response aggregation
- ✅ Manager agent (final decision)
- ✅ Consensus analysis

**Webhook URL:** `http://192.168.1.250:5678/webhook/multi-agent-consensus`

**Test:**
```bash
curl -X POST http://192.168.1.250:5678/webhook/multi-agent-consensus \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Acil sipariş #12345 için karar ver"}'
```

---

## 📥 Import Etme

### n8n UI'de:

1. **n8n'e giriş yap:** http://192.168.1.250:5678
2. **Workflows** → **Import from JSON**
3. JSON dosyasını seç veya içeriğini yapıştır
4. **Credentials** düzenle:
   - OpenAI API Key
   - Supabase PostgreSQL
5. **Save** ve **Activate**

---

## ⚙️ Credentials Ayarlama

### 1. OpenAI API Key

**Settings** → **Credentials** → **Add Credential** → **OpenAI**

- **API Key:** Thunder ERP `.env.local` dosyasındaki `OPENAI_API_KEY`

### 2. Supabase PostgreSQL

**Settings** → **Credentials** → **Add Credential** → **Postgres**

- **Host:** `db.unodzubpvymgownyjrgz.supabase.co`
- **Database:** `postgres`
- **User:** `postgres`
- **Password:** [Supabase project password]
- **Port:** `5432`
- **SSL:** `Require`

---

## 🔗 Thunder ERP Entegrasyonu

Thunder ERP'den n8n workflow'larını çağırmak için:

```bash
# API endpoint
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "Test mesajı",
    "context": {}
  }'
```

---

## 📝 Notlar

- **Webhook URL'leri:** n8n UI'de workflow'u açtıktan sonra **Webhook** node'una tıklayarak gerçek URL'i görebilirsiniz
- **Credentials:** Her workflow'da credentials'ları düzenlemeyi unutmayın
- **Test:** Önce basit workflow'u test edin, sonra advanced'lere geçin

---

## 🎯 Sıralama

1. **İlk:** `1-planning-agent-basic.json` (en basit)
2. **İkinci:** `2-planning-agent-advanced.json` (database entegrasyonu)
3. **Üçüncü:** `3-multi-agent-consensus.json` (multi-agent)

---

**🎊 İyi çalışmalar!**

