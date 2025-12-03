# 🔑 Production Environment Variables Setup

## PM2 ile Environment Variables Ayarlama

### Yöntem 1: `.env.local` Dosyasına Ekle (Önerilen) ✅

Next.js otomatik olarak `.env.local` dosyasını okur. Sunucuda şu adımları izleyin:

```bash
# Sunucuya SSH ile bağlan
ssh vipkrom@your-server-ip

# Proje dizinine git
cd /var/www/thunder-erp

# .env.local dosyasını düzenle
nano .env.local
```

`.env.local` dosyasına şu satırları ekleyin:

```env
# Mevcut environment variables (değiştirmeyin)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret
NODE_ENV=production

# YENİ: OpenAI API Key (AI özellikleri için)
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Opsiyonel: AI Agent'ları aktif et (true ise AI validation çalışır)
AGENT_ENABLED=true
```

Dosyayı kaydedin (Ctrl+O, Enter, Ctrl+X).

PM2'yi restart edin:
```bash
pm2 restart thunder-erp
```

---

### Yöntem 2: `ecosystem.config.js` Dosyasını Güncelle

Proje kök dizinindeki `ecosystem.config.js` dosyasını güncelleyin:

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
      // OpenAI API Key (AI özellikleri için)
      OPENAI_API_KEY: 'sk-proj-your-openai-api-key-here',
      // AI Agent'ları aktif et
      AGENT_ENABLED: 'true'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
```

**⚠️ GÜVENLİK UYARISI:** `ecosystem.config.js` dosyası git'e commit edilmemeli! `.gitignore`'a ekleyin.

Dosyayı güncelledikten sonra:
```bash
# Sunucuda git pull yapın
cd /var/www/thunder-erp
git pull origin main

# PM2'yi restart edin
pm2 restart thunder-erp
```

---

### Yöntem 3: PM2 Start Komutunda Direkt Belirtme

```bash
pm2 start ecosystem.config.js --update-env
pm2 restart thunder-erp --update-env
```

Veya direkt environment variable ile:
```bash
OPENAI_API_KEY=sk-proj-your-key-here pm2 restart thunder-erp --update-env
```

---

## ✅ Kontrol

Environment variable'ın yüklendiğini kontrol edin:

```bash
# PM2 log'larını kontrol et
pm2 logs thunder-erp --lines 50

# Eğer hala "OPENAI_API_KEY not found" hatası varsa, restart edin:
pm2 restart thunder-erp

# PM2 process environment'ı kontrol et
pm2 show thunder-erp
```

**Beklenen çıktı:** Artık "OPENAI_API_KEY not found" uyarısı görünmemeli.

---

## 🔐 OpenAI API Key Nasıl Alınır?

1. https://platform.openai.com/api-keys adresine gidin
2. Login olun
3. **"Create new secret key"** butonuna tıklayın
4. Key'e bir isim verin (örn: "Thunder ERP Production")
5. Key'i kopyalayın (sadece bir kez gösterilir!)
6. `.env.local` dosyasına ekleyin

**Fiyatlandırma:** OpenAI API kullanımı ücretlidir. Kullanım takibi için:
- https://platform.openai.com/usage adresinden kontrol edin
- Limit ayarlarını yapın (Settings > Billing > Limits)

---

## 🚨 Güvenlik Önerileri

1. **API Key'i asla git'e commit etmeyin**
   - `.env.local` zaten `.gitignore`'da olmalı
   - `ecosystem.config.js` içinde API key varsa, `.gitignore`'a ekleyin

2. **Production ve Development farklı key'ler kullanın**
   - Development için farklı bir OpenAI API key oluşturun
   - Production key'i sadece production sunucusunda kullanın

3. **Rate limiting ve quota ayarlayın**
   - OpenAI dashboard'dan usage limit'leri belirleyin
   - Beklenmedik maliyetlerden korunun

---

## 📝 Özet

**Hızlı Çözüm (Sunucuda):**
```bash
cd /var/www/thunder-erp
nano .env.local
# OPENAI_API_KEY=sk-proj-your-key-here ekle
# AGENT_ENABLED=true ekle (opsiyonel)
pm2 restart thunder-erp
```

