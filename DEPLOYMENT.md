# 🚀 ThunderERP Deployment Kılavuzu

## Ubuntu Sunucu Deployment

### 📋 Gereksinimler
- Ubuntu 24.04 LTS
- Node.js 20.x veya üzeri
- npm 10.x veya üzeri
- PM2 (process manager)
- Git

### 🔧 İlk Kurulum

```bash
# 1. Proje dizinine git
cd /var/www/thunder-erp

# 2. Git pull
git pull origin main

# 3. Dependencies yükle
npm install

# 4. .env.local dosyasını oluştur
nano .env.local
```

**.env.local içeriği:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret_min_32_characters
NODE_ENV=production
```

```bash
# 5. Production build
npm run build

# 6. PM2 ile başlat
pm2 start npm --name "thunder-erp" -- start
pm2 save
pm2 startup  # Otomatik başlatma için
```

---

## ⚡ Hızlı Deployment (Güncelleme)

### Yöntem 1: Otomatik Script

```bash
cd /var/www/thunder-erp
./deploy.sh
```

Bu script:
- ✅ Git'ten son değişiklikleri çeker
- ✅ Cache'i temizler
- ✅ Dependencies'i günceller
- ✅ Production build yapar
- ✅ PM2'yi restart eder

### Yöntem 2: Manuel Deployment

```bash
cd /var/www/thunder-erp

# 1. Git pull
git pull origin main

# 2. Cache temizle
rm -rf .next
rm -rf node_modules/.cache

# 3. Dependencies güncelle (gerekirse)
npm install

# 4. Build
npm run build

# 5. PM2 restart
pm2 restart thunder-erp
```

---

## 🐛 Build Hatası Aldıysanız

### Hata: `Cannot find module '/.next/server/pages/_app.js'`

**Çözüm:**

```bash
cd /var/www/thunder-erp
./fix-build.sh
```

Bu script:
1. PM2'yi durdurur
2. Tüm cache'i temizler
3. Opsiyon: Node modules'u yeniden yükler
4. Temiz build yapar
5. PM2'yi yeniden başlatır

### Manuel Çözüm:

```bash
# 1. PM2 durdur
pm2 stop thunder-erp

# 2. Tam temizlik
rm -rf .next
rm -rf node_modules/.cache
rm -rf node_modules
rm -rf package-lock.json

# 3. Yeniden yükle
npm install

# 4. Build
npm run build

# 5. Başlat
pm2 start npm --name "thunder-erp" -- start
pm2 save
```

---

## 📊 PM2 Komutları

```bash
# Durum kontrolü
pm2 status

# Logları göster
pm2 logs thunder-erp

# Gerçek zamanlı loglar
pm2 logs thunder-erp --lines 100

# Restart
pm2 restart thunder-erp

# Stop
pm2 stop thunder-erp

# Start
pm2 start thunder-erp

# Bellek kullanımı
pm2 monit

# Uygulama detayları
pm2 info thunder-erp
```

---

## 🔍 Sorun Giderme

### Build Uyarısı: `experimental.turbo is deprecated`

**Normal:** Bu sadece bir uyarıdır, build çalışmaya devam eder.

**Çözüldü:** Son commit'te düzeltildi.

### Build Başarılı Ama Uygulama Çalışmıyor

```bash
# Port kontrolü
sudo netstat -tulpn | grep :3000

# PM2 durumu
pm2 status thunder-erp

# Logları kontrol et
pm2 logs thunder-erp --lines 50
```

### Supabase Bağlantı Sorunu

```bash
# .env.local dosyasını kontrol et
cat .env.local

# Environment variables yüklendi mi?
pm2 restart thunder-erp --update-env
```

---

## 🌐 Nginx Konfigürasyonu (Opsiyonel)

Eğer Nginx kullanıyorsanız:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📝 Deployment Checklist

- [ ] Git pull yapıldı
- [ ] .env.local dosyası mevcut ve doğru
- [ ] Dependencies güncellendi
- [ ] Cache temizlendi
- [ ] Build başarılı
- [ ] PM2 ile başlatıldı
- [ ] Uygulama çalışıyor (http://localhost:3000)
- [ ] Loglar kontrol edildi
- [ ] Production ortamında test edildi

---

## 🆘 Acil Durum

Uygulama tamamen çalışmıyorsa:

```bash
# 1. Tüm cache'i sil
rm -rf .next node_modules .turbo package-lock.json

# 2. Yeniden başla
npm install
npm run build

# 3. PM2'yi temizle ve yeniden başlat
pm2 delete thunder-erp
pm2 start npm --name "thunder-erp" -- start
pm2 save
```

---

## 📞 Destek

Sorun devam ediyorsa:
1. `pm2 logs thunder-erp` çıktısını kaydet
2. `npm run build` hata mesajını kaydet
3. `.env.local` dosyasının varlığını kontrol et
4. Node.js versiyonunu kontrol et: `node -v` (20.x+ olmalı)

