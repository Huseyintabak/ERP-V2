# 🚀 ThunderV2 - Ubuntu Server Deployment Guide

## 📋 İçindekiler

- [Gereksinimler](#gereksinimler)
- [Deployment Yöntemleri](#deployment-yöntemleri)
- [Otomatik Deployment](#otomatik-deployment-önerilir)
- [Manuel Deployment](#manuel-deployment)
- [Production Checklist](#production-checklist)
- [Troubleshooting](#troubleshooting)

---

## 🖥️ Gereksinimler

### Sunucu
- **OS:** Ubuntu 20.04+ (önerilir: 22.04 LTS)
- **RAM:** Minimum 2GB (önerilir: 4GB+)
- **Disk:** 20GB+ boş alan
- **CPU:** 2+ cores
- **Network:** Public IP veya domain

### Yazılım
- **Node.js:** 18.x LTS
- **PM2:** Process manager
- **Nginx:** Reverse proxy
- **Git:** Version control
- **Certbot:** SSL sertifikası (opsiyonel)

### Erişim
- Root veya sudo yetkisi
- SSH erişimi
- GitHub personal access token (private repo ise)

---

## 🎯 Deployment Yöntemleri

### Yöntem 1: Otomatik Script (Önerilir)
**Süre:** ~10 dakika  
**Zorluk:** Kolay  
**Kullanım:** Script çalıştır, soruları cevapla

### Yöntem 2: Manuel Adım Adım
**Süre:** ~30 dakika  
**Zorluk:** Orta  
**Kullanım:** Her adımı manuel olarak yap

---

## ⚡ Otomatik Deployment (Önerilir)

### 1. Sunucuya Bağlan

```bash
ssh root@your-server-ip
# veya
ssh ubuntu@your-server-ip
```

### 2. Script'i İndir

```bash
wget https://raw.githubusercontent.com/Huseyintabak/ERP-V2/main/deploy-ubuntu.sh
chmod +x deploy-ubuntu.sh
```

### 3. Script'i Çalıştır

```bash
bash deploy-ubuntu.sh
```

### 4. Soruları Cevapla

Script sırasıyla soracak:
- Environment variables (SUPABASE credentials)
- Domain adı (varsa)
- SSL kurulumu (evet/hayır)

### 5. Tamamlandı!

Script başarıyla bittiğinde URL'i göreceksin:
- **Domain ile:** `https://your-domain.com`
- **IP ile:** `http://your-server-ip`

---

## 🛠️ Manuel Deployment

### Adım 1: Sistem Güncellemeleri

```bash
sudo apt update
sudo apt upgrade -y
```

### Adım 2: Gerekli Paketleri Yükle

```bash
sudo apt install -y curl wget git build-essential nginx ufw
```

### Adım 3: Node.js 18 Kurulumu

```bash
# NodeSource repository ekle
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Node.js yükle
sudo apt install -y nodejs

# Versiyonu kontrol et
node -v  # v18.x.x olmalı
npm -v
```

### Adım 4: PM2 Kurulumu

```bash
# PM2'yi global olarak yükle
sudo npm install -g pm2

# PM2'yi sistem başlangıcına ekle
pm2 startup systemd
```

### Adım 5: Uygulama Dizini Oluştur

```bash
# Dizin oluştur
sudo mkdir -p /var/www/thunder-erp

# Ownership ayarla
sudo chown -R $USER:$USER /var/www/thunder-erp
```

### Adım 6: Kodu GitHub'dan Çek

```bash
cd /var/www
git clone https://github.com/Huseyintabak/ERP-V2.git thunder-erp
cd thunder-erp
```

### Adım 7: Environment Variables Ayarla

```bash
# .env.local oluştur
nano .env.local
```

Şu içeriği yapıştır:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT Secret (PRODUCTION İÇİN YENİ ÜRETİN!)
JWT_SECRET=your-production-jwt-secret-min-32-chars

# Environment
NODE_ENV=production
```

**⚠️ ÖNEMLİ:** Production JWT secret üret:

```bash
openssl rand -base64 32
```

Kaydet ve çık: `Ctrl+X`, `Y`, `Enter`

### Adım 8: Dependencies Yükle ve Build

```bash
# Dependencies
npm install

# Production build
npm run build
```

### Adım 9: PM2 Ecosystem Dosyası

```bash
nano ecosystem.config.js
```

Şu içeriği yapıştır:

```javascript
module.exports = {
  apps: [{
    name: 'thunder-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/thunder-erp',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### Adım 10: PM2 ile Başlat

```bash
# Logs dizini oluştur
mkdir -p logs

# PM2 ile başlat
pm2 start ecosystem.config.js

# PM2'yi kaydet
pm2 save

# Status kontrol et
pm2 status
```

### Adım 11: Nginx Reverse Proxy

```bash
# Nginx config oluştur
sudo nano /etc/nginx/sites-available/thunder-erp
```

Şu içeriği yapıştır:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # veya server IP

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Reverse proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static cache
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 10M;
}
```

### Adım 12: Nginx'i Etkinleştir

```bash
# Symlink oluştur
sudo ln -s /etc/nginx/sites-available/thunder-erp /etc/nginx/sites-enabled/

# Default config'i kaldır
sudo rm /etc/nginx/sites-enabled/default

# Nginx testi
sudo nginx -t

# Nginx restart
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### Adım 13: Firewall Ayarla

```bash
# SSH, HTTP, HTTPS portlarını aç
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# UFW'yi etkinleştir
sudo ufw enable
```

### Adım 14: SSL Sertifikası (Opsiyonel)

**Sadece domain adı varsa:**

```bash
# Certbot yükle
sudo apt install -y certbot python3-certbot-nginx

# SSL sertifikası al
sudo certbot --nginx -d your-domain.com

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

---

## ✅ Production Checklist

### Deployment Öncesi

- [ ] Sunucu gereksinimleri karşılanıyor
- [ ] SSH erişimi çalışıyor
- [ ] Supabase database hazır
- [ ] Production JWT secret üretildi
- [ ] Domain DNS ayarları yapıldı (varsa)

### Deployment Sırası

- [ ] Node.js 18 yüklü
- [ ] PM2 kuruldu
- [ ] Kod GitHub'dan çekildi
- [ ] .env.local doğru şekilde ayarlandı
- [ ] npm install tamamlandı
- [ ] npm run build başarılı
- [ ] PM2 ile uygulama başladı
- [ ] Nginx reverse proxy yapılandırıldı
- [ ] Firewall ayarlandı
- [ ] SSL kuruldu (domain varsa)

### Deployment Sonrası

- [ ] URL'de uygulama açılıyor
- [ ] Login sayfası görünüyor
- [ ] Default user'larla giriş yapılabiliyor
- [ ] Dashboard yükleniyor
- [ ] API endpoint'leri çalışıyor
- [ ] Real-time updates aktif
- [ ] Static files (images, CSS) yükleniyor
- [ ] Mobile responsive çalışıyor

### Güvenlik

- [ ] Production şifreleri değiştirildi
- [ ] .env.local commit edilmedi
- [ ] Firewall aktif
- [ ] SSL sertifikası yüklü (domain varsa)
- [ ] Nginx security headers aktif
- [ ] Supabase RLS policies aktif

---

## 🔧 Yararlı Komutlar

### PM2 Komutları

```bash
# Status kontrol
pm2 status

# Logs görüntüle
pm2 logs thunder-erp

# Gerçek zamanlı monitoring
pm2 monit

# Restart
pm2 restart thunder-erp

# Stop
pm2 stop thunder-erp

# Tüm logları temizle
pm2 flush
```

### Nginx Komutları

```bash
# Nginx testi
sudo nginx -t

# Restart
sudo systemctl restart nginx

# Status
sudo systemctl status nginx

# Logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Sistem Komutları

```bash
# Disk kullanımı
df -h

# Memory kullanımı
free -h

# CPU kullanımı
top

# Aktif portlar
sudo netstat -tulpn | grep LISTEN

# Process listesi
ps aux | grep node
```

---

## 🐛 Troubleshooting

### Problem: Uygulama başlamıyor

**Çözüm:**

```bash
# PM2 logs kontrol et
pm2 logs thunder-erp

# .env.local dosyası var mı?
ls -la /var/www/thunder-erp/.env.local

# Node version doğru mu?
node -v  # 18.x olmalı
```

### Problem: 502 Bad Gateway (Nginx)

**Çözüm:**

```bash
# PM2 çalışıyor mu?
pm2 status

# Port 3000 dinleniyor mu?
sudo netstat -tulpn | grep 3000

# PM2'yi restart et
pm2 restart thunder-erp
```

### Problem: SSL sertifikası hatası

**Çözüm:**

```bash
# Domain DNS doğru mu?
dig your-domain.com

# Certbot yeniden dene
sudo certbot --nginx -d your-domain.com --force-renewal
```

### Problem: Out of memory

**Çözüm:**

```bash
# Memory kontrol
free -h

# PM2 memory limiti artır
# ecosystem.config.js'de max_memory_restart: '2G'

# PM2 restart
pm2 restart thunder-erp
```

### Problem: Build hatası

**Çözüm:**

```bash
# node_modules'u sil
rm -rf node_modules

# Cache temizle
npm cache clean --force

# Yeniden yükle
npm install

# Build
npm run build
```

---

## 📊 Monitoring & Maintenance

### PM2 Plus (Opsiyonel)

```bash
# PM2 Plus hesabı oluştur
pm2 link <secret> <public>

# Web dashboard: https://app.pm2.io
```

### Log Rotation

```bash
# PM2 log rotation yükle
pm2 install pm2-logrotate

# Ayarlar
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Backup Stratejisi

```bash
# Database backup (Supabase otomatik yapar)
# Application code backup
cd /var/www
tar -czf thunder-erp-backup-$(date +%Y%m%d).tar.gz thunder-erp/

# .env.local backup (güvenli yerde sakla!)
```

---

## 🔄 Update/Deployment Workflow

### Kod Güncelleme

```bash
cd /var/www/thunder-erp

# Git pull
git pull origin main

# Dependencies güncel mi kontrol et
npm install

# Yeniden build
npm run build

# PM2 restart
pm2 restart thunder-erp
```

### Zero-Downtime Deployment

```bash
# PM2 reload kullan (cluster mode'da)
pm2 reload thunder-erp
```

---

## 📞 Destek

**Sorun yaşıyorsanız:**

1. Logs kontrol edin: `pm2 logs thunder-erp`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. GitHub Issues: https://github.com/Huseyintabak/ERP-V2/issues

---

## 🎉 Başarılı Deployment!

Tebrikler! ThunderV2 ERP sisteminiz artık production'da çalışıyor! 🚀

**Varsayılan Kullanıcılar:**
- Admin: admin@thunder.com / admin123
- Planlama: planlama@thunder.com / plan123
- Depo: depo@thunder.com / depo123
- Operatör: operator@thunder.com / op123

**⚠️ GÜVENLİK:** İlk işiniz bu şifreleri değiştirmek olsun!

