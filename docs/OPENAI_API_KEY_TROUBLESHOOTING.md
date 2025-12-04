# 🔧 OpenAI API Key Troubleshooting Guide

## ❌ "IA valid" veya "Invalid API key" Hatası

### 1. API Key Format Kontrolü

OpenAI API key'leri şu formatlardan birine sahip olmalıdır:
- `sk-proj-...` (Yeni format - Project API keys)
- `sk-...` (Eski format - Personal API keys)

**Kontrol:**
```bash
# Sunucuda
cd /var/www/thunder-erp
cat .env.local | grep OPENAI_API_KEY
```

**Örnek doğru format:**
```env
OPENAI_API_KEY=sk-proj-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
```

**❌ Yanlış formatlar:**
```env
OPENAI_API_KEY=sk-proj-your-key-here  # Placeholder değer
OPENAI_API_KEY= sk-proj-...          # Başında boşluk
OPENAI_API_KEY=sk-proj-...            # Sonunda boşluk
OPENAI_API_KEY="sk-proj-..."          # Tırnak içinde (gereksiz)
```

### 2. .env.local Dosyası Kontrolü

**Sunucuda kontrol edin:**
```bash
cd /var/www/thunder-erp
nano .env.local
```

**Doğru format:**
```env
# OpenAI API Key (AI özellikleri için)
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Opsiyonel: AI Agent'ları aktif et
AGENT_ENABLED=true
```

**Önemli:**
- `OPENAI_API_KEY=` satırında **tırnak işareti OLMAMALI**
- Key'in başında/sonunda **boşluk OLMAMALI**
- Key **tam olarak** kopyalanmış olmalı (kesik olmamalı)

### 3. PM2 Environment Variables Kontrolü

PM2, `.env.local` dosyasını otomatik olarak okumaz. Environment variables'ı manuel olarak yüklemek gerekir.

**Yöntem 1: PM2 Restart (Önerilen)**
```bash
cd /var/www/thunder-erp
pm2 restart thunder-erp --update-env
```

**Yöntem 2: PM2 Environment'ı Kontrol Et**
```bash
pm2 show thunder-erp
```

Çıktıda `env` bölümünde `OPENAI_API_KEY` görünmeli.

**Yöntem 3: ecosystem.config.js ile (Alternatif)**

`ecosystem.config.js` dosyasını güncelleyin:
```javascript
module.exports = {
  apps: [{
    name: 'thunder-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/thunder-erp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // .env.local dosyasından oku (Next.js otomatik okur)
      // Ama PM2 için manuel eklemek gerekebilir
    },
    env_file: '.env.local', // PM2 5.0+ için
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
```

**⚠️ GÜVENLİK UYARISI:** `ecosystem.config.js` dosyasına API key eklemeyin! `.gitignore`'a ekleyin.

### 4. Next.js Environment Variables

Next.js, `.env.local` dosyasını **build time** ve **runtime**'da okur.

**Build time:** `npm run build` sırasında
**Runtime:** Server-side API routes'da

**Kontrol:**
```bash
# Sunucuda build'i yeniden yapın (environment variables'ı yüklemek için)
cd /var/www/thunder-erp
npm run build
pm2 restart thunder-erp
```

### 5. API Key Validation Testi

**Sunucuda test edin:**
```bash
cd /var/www/thunder-erp

# API key'i oku
API_KEY=$(grep OPENAI_API_KEY .env.local | cut -d '=' -f2 | tr -d ' ')

# OpenAI API'ye test isteği gönder
curl -H "Authorization: Bearer $API_KEY" \
     https://api.openai.com/v1/models | head -20
```

**Beklenen çıktı:** JSON response (model listesi)

**Hata çıktısı:**
```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error",
    "param": null,
    "code": "invalid_api_key"
  }
}
```

### 6. Yaygın Hatalar ve Çözümleri

#### Hata 1: "OPENAI_API_KEY not found"
**Sebep:** Environment variable yüklenmemiş
**Çözüm:**
```bash
pm2 restart thunder-erp --update-env
```

#### Hata 2: "Invalid API key"
**Sebep:** API key yanlış veya geçersiz
**Çözüm:**
1. OpenAI dashboard'dan yeni key oluşturun: https://platform.openai.com/api-keys
2. `.env.local` dosyasını güncelleyin
3. PM2'yi restart edin

#### Hata 3: "IA valid" (Kısaltılmış hata)
**Sebep:** Muhtemelen "Invalid API key" hatasının kısaltılmış versiyonu
**Çözüm:** Yukarıdaki adımları takip edin

#### Hata 4: API key PM2'de görünmüyor
**Sebep:** PM2, `.env.local` dosyasını otomatik okumaz
**Çözüm:**
```bash
# Yöntem 1: PM2 restart (önerilen)
pm2 restart thunder-erp --update-env

# Yöntem 2: PM2 delete ve yeniden start
pm2 delete thunder-erp
cd /var/www/thunder-erp
pm2 start ecosystem.config.js
```

### 7. Debug Adımları

**Adım 1: .env.local Kontrolü**
```bash
cd /var/www/thunder-erp
cat .env.local
```

**Adım 2: PM2 Log Kontrolü**
```bash
pm2 logs thunder-erp --lines 100 | grep -i "openai\|api\|key\|invalid"
```

**Adım 3: Node.js Process Environment Kontrolü**
```bash
# PM2 process'in environment'ını kontrol et
pm2 show thunder-erp | grep -A 20 "env:"
```

**Adım 4: API Key Test (Node.js ile)**
```bash
cd /var/www/thunder-erp
node -e "
const key = require('fs').readFileSync('.env.local', 'utf-8')
  .match(/OPENAI_API_KEY=(.+)/)[1].trim();
console.log('Key:', key.substring(0, 20) + '...');
console.log('Length:', key.length);
"
```

### 8. Hızlı Çözüm (Sunucuda)

```bash
# 1. Proje dizinine git
cd /var/www/thunder-erp

# 2. .env.local dosyasını kontrol et
cat .env.local | grep OPENAI_API_KEY

# 3. Eğer key yoksa veya yanlışsa, düzenle
nano .env.local
# OPENAI_API_KEY=sk-proj-your-actual-key-here ekle/kontrol et

# 4. PM2'yi restart et
pm2 restart thunder-erp --update-env

# 5. Log'ları kontrol et
pm2 logs thunder-erp --lines 50

# 6. Eğer hala hata varsa, build'i yeniden yap
npm run build
pm2 restart thunder-erp
```

### 9. Kontrol Script'i

Proje kök dizininde `scripts/check-openai-env.mjs` script'ini çalıştırın:

```bash
cd /var/www/thunder-erp
node scripts/check-openai-env.mjs

# API key'i test etmek için:
node scripts/check-openai-env.mjs --test
```

---

## ✅ Başarılı Kurulum Kontrolü

**PM2 log'larında şunları görmelisiniz:**
- ❌ "OPENAI_API_KEY not found" uyarısı **OLMAMALI**
- ✅ AI agent işlemleri başarıyla çalışmalı
- ✅ `/api/ai/*` endpoint'leri çalışmalı

**Test:**
```bash
# Sunucuda
curl http://localhost:3000/api/ai/status
```

Beklenen response: AI agent'ların durumu (JSON)

---

## 📞 Destek

Eğer hala sorun yaşıyorsanız:
1. PM2 log'larını kontrol edin: `pm2 logs thunder-erp --lines 100`
2. `.env.local` dosyasını kontrol edin
3. API key'in OpenAI dashboard'da aktif olduğunu kontrol edin
4. API key'in quota/limit aşmadığını kontrol edin

