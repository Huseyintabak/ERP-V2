# 🚀 Thunder ERP + n8n Sunucu Kurulum Talimatları

## Adım 1: Sunucuya Bağlan

```bash
ssh vipkrom@192.168.1.250
# Şifre: vip123
```

## Adım 2: Thunder ERP Dizinine Git

```bash
cd /var/www/thunder-erp
```

## Adım 3: En Son Kodu Çek

```bash
git pull origin main
```

## Adım 4: Setup Script'ini Çalıştır

```bash
chmod +x setup-n8n-server.sh
./setup-n8n-server.sh
```

### Script Ne Yapacak?

1. ✅ Docker kurulumu kontrolü (yoksa otomatik yükler)
2. ✅ n8n data dizini oluşturma
3. ✅ docker-compose.yml oluşturma
4. ✅ .env.local güncelleme (N8N_WEBHOOK_URL)
5. ✅ Thunder ERP güncelleme (git pull, npm install, build)
6. ✅ n8n Docker container başlatma
7. ✅ Thunder ERP PM2 restart
8. ✅ Nginx yapılandırması (opsiyonel)
9. ✅ Health check'ler

### Kurulum Süresi

Yaklaşık **5-10 dakika** (Docker ilk kurulumda daha uzun sürebilir)

---

## 📍 Kurulum Sonrası Erişim Bilgileri

### Thunder ERP
- URL: http://192.168.1.250
- AI Agent Builder: http://192.168.1.250/ai-agent-builder

### n8n Workflow Editor
- URL: http://192.168.1.250:5678
- Kullanıcı: `admin`
- Şifre: `Thunder2025!`

### n8n Webhook Base URL
- http://192.168.1.250:5678/webhook/

---

## 📚 Kurulum Sonrası Yapılacaklar

### 1. n8n'e Giriş Yap

Tarayıcıdan: http://192.168.1.250:5678

**Login:**
- Username: `admin`
- Password: `Thunder2025!`

### 2. n8n'de Credentials Ekle

#### a) OpenAI API Key

1. n8n UI'da: **Settings** → **Credentials** → **Add Credential**
2. **Type:** OpenAI
3. **API Key:** `sk-proj-...` (Thunder ERP .env.local'deki OPENAI_API_KEY)
4. **Save**

#### b) PostgreSQL (Supabase)

1. **Settings** → **Credentials** → **Add Credential**
2. **Type:** Postgres
3. **Ayarlar:**
   ```
   Host: db.unodzubpvymgownyjrgz.supabase.co
   Database: postgres
   User: postgres
   Password: [Supabase project password]
   Port: 5432
   SSL: Require
   ```
4. **Save**

### 3. İlk Workflow'u İmport Et

1. n8n UI'da: **Workflows** → **Import from JSON**
2. JSON kodu: `/var/www/thunder-erp/docs/N8N_AGENT_WORKFLOWS.md` dosyasından kopyala
3. Örnek workflow'lar:
   - **Basic Planning Agent** (basit test için)
   - **Advanced Planning Agent** (BOM ve stok kontrolü ile)
   - **Multi-Agent Consensus** (3 agent + Manager onayı)

### 4. Workflow'u Test Et

#### Thunder ERP'den Test:

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H 'Content-Type: application/json' \
  -d '{
    "workflow": "planning",
    "prompt": "Sipariş #12345 için üretim planı oluştur",
    "context": {
      "orderId": "12345",
      "productId": "PRD-001"
    }
  }'
```

#### Direkt Webhook'tan Test:

```bash
curl -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Test mesajı",
    "context": {}
  }'
```

---

## 🐳 Docker Komutları (Sunucuda)

### n8n Loglarını Görüntüle

```bash
cd /var/www/thunder-erp
docker compose logs -f n8n
```

### n8n'i Yeniden Başlat

```bash
docker compose restart n8n
```

### n8n'i Durdur

```bash
docker compose down
```

### n8n'i Başlat

```bash
docker compose up -d
```

### Container Durumunu Kontrol Et

```bash
docker compose ps
```

### Container'a Gir (Debug için)

```bash
docker exec -it thunder-n8n sh
```

---

## 🔧 Sorun Giderme

### n8n'e Erişilemiyor

1. Container çalışıyor mu?
   ```bash
   docker compose ps
   ```

2. Port açık mı?
   ```bash
   sudo netstat -tlnp | grep 5678
   ```

3. Firewall kontrolü:
   ```bash
   sudo ufw status
   sudo ufw allow 5678/tcp
   ```

### Workflow Çalışmıyor

1. n8n loglarını kontrol et:
   ```bash
   docker compose logs -f n8n
   ```

2. Credentials doğru mu?
   - OpenAI API key geçerli mi?
   - Supabase connection çalışıyor mu?

3. Webhook URL doğru mu?
   - Thunder ERP .env.local: `N8N_WEBHOOK_URL=http://localhost:5678`

### Thunder ERP n8n'e Bağlanamıyor

1. Thunder ERP PM2 logları:
   ```bash
   pm2 logs thunder-erp --lines 50
   ```

2. n8n sağlık kontrolü:
   ```bash
   curl http://localhost:5678/healthz
   ```

3. Thunder ERP API testi:
   ```bash
   curl http://localhost:3000/api/ai/n8n
   ```

---

## 📊 Health Check Komutları

### Tüm Servisleri Kontrol Et

```bash
# n8n container
docker compose ps | grep n8n

# Thunder ERP PM2
pm2 list | grep thunder-erp

# n8n health
curl http://localhost:5678/healthz

# Thunder ERP n8n integration
curl http://localhost:3000/api/ai/n8n
```

---

## 🔄 Güncelleme (Thunder ERP + n8n)

```bash
cd /var/www/thunder-erp

# Thunder ERP güncelle
git pull origin main
npm install
npm run build
pm2 restart thunder-erp

# n8n güncelle
docker compose pull
docker compose up -d
```

---

## 📖 Dokümantasyon

- **n8n Workflow Örnekleri:** `/var/www/thunder-erp/docs/N8N_AGENT_WORKFLOWS.md`
- **OpenAI Agent Builder:** `/var/www/thunder-erp/docs/AGENT_BUILDER_UI_SETUP.md`
- **Deployment:** `/var/www/thunder-erp/docs/DEPLOYMENT.md`

---

## 🎯 Örnek Workflow Senaryoları

### 1. Üretim Planı Oluşturma (BOM ile)

**Workflow:** Advanced Planning Agent

**Özellikleri:**
- BOM (Bill of Materials) kontrolü
- Stok kontrolü (Supabase)
- Eksik malzeme tespit
- Otomatik satınalma önerisi

**Test:**
```bash
curl -X POST http://192.168.1.250:5678/webhook/planning-advanced \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Sipariş #12345 için üretim planı oluştur",
    "orderId": "12345",
    "productId": "PRD-001",
    "quantity": 100
  }'
```

### 2. Üretim Kaydı Validasyonu

**Workflow:** Production Log Validator

**Özellikleri:**
- Operator üretim kaydı doğrulama
- Kalite kontrol
- Stok güncelleme kontrolü
- Anomali tespit

**Test:**
```bash
curl -X POST http://192.168.1.250:5678/webhook/production-validator \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Üretim kaydını doğrula",
    "productionLogId": "PL-12345",
    "productId": "PRD-001",
    "quantityProduced": 95,
    "wasteRate": 5
  }'
```

### 3. Multi-Agent Konsensüs

**Workflow:** Multi-Agent Consensus

**Özellikleri:**
- 3 agent'tan görüş alma (Planning, Production, Warehouse)
- Konsensüs algoritması
- Manager onayı
- Human approval trigger

**Test:**
```bash
curl -X POST http://192.168.1.250:5678/webhook/multi-agent-consensus \
  -H 'Content-Type: application/json' \
  -d '{
    "prompt": "Acil sipariş #12345 için karar ver",
    "orderId": "12345",
    "urgency": "critical",
    "context": {
      "requestType": "urgent_order",
      "customerPriority": "high"
    }
  }'
```

---

## 🚀 Hızlı Başlangıç Checklist

- [ ] Sunucuya SSH ile bağlan
- [ ] Thunder ERP dizinine git
- [ ] `git pull origin main`
- [ ] `./setup-n8n-server.sh` çalıştır
- [ ] http://192.168.1.250:5678 açılıyor mu kontrol et
- [ ] n8n'e login ol (admin / Thunder2025!)
- [ ] OpenAI credential ekle
- [ ] Supabase (PostgreSQL) credential ekle
- [ ] İlk workflow'u import et
- [ ] Test webhook çağrısı yap
- [ ] Thunder ERP'den test et

---

## 🎉 Kurulum Tamamlandığında

1. ✅ n8n Docker container çalışıyor
2. ✅ Thunder ERP n8n'e bağlanabiliyor
3. ✅ Workflow'lar aktif
4. ✅ Webhook'lar çalışıyor
5. ✅ OpenAI API entegre
6. ✅ Supabase database erişimi var

**Artık Thunder ERP'de AI Agent workflow'larını görsel olarak tasarlayabilirsiniz! 🚀**

---

## 📞 Destek

Sorun yaşarsanız:

1. n8n logları: `docker compose logs -f n8n`
2. Thunder ERP logları: `pm2 logs thunder-erp`
3. Dokümantasyon: `/var/www/thunder-erp/docs/`

**İyi çalışmalar! 🎊**

