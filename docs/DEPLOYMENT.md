# 🚀 ThunderV2 Deployment Guide

## 📋 Deployment Seçenekleri

### 1. Vercel (Önerilen)

**Avantajlar:**
- Next.js ile mükemmel entegrasyon
- Otomatik CI/CD
- Edge functions desteği
- Global CDN
- Ücretsiz tier yeterli

**Kurulum:**
```bash
# Vercel CLI ile
npm install -g vercel
vercel

# Veya GitHub'a push edin, Vercel otomatik deploy eder
```

**Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
```

### 2. Production Server (Ubuntu)

**Gereksinimler:**
- Ubuntu 20.04+
- Node.js 18+
- PM2 (process manager)
- Nginx (reverse proxy)

**Kurulum:**
```bash
# Server'a bağlan
ssh user@your-server

# Node.js kur
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kur
sudo npm install -g pm2

# Projeyi klonla
git clone <your-repo-url>
cd ThunderV2

# Bağımlılıkları yükle
npm install

# Build al
npm run build

# PM2 ile başlat
pm2 start npm --name "thunder-erp" -- start
pm2 save
pm2 startup
```

**Nginx Konfigürasyonu:**
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Environment Configuration

### Development
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=thunder-erp-super-secret-jwt-key-minimum-32-characters-long
```

### Production
```env
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=super-secure-production-jwt-secret-minimum-32-characters
```

## 🗄️ Database Setup

### Supabase Cloud (Önerilen)

1. **Proje Oluştur:**
   - https://supabase.com → Sign in
   - "New Project" → İsim: thunder-erp-v2
   - Database Password kaydet
   - Region: Frankfurt (Europe West)

2. **Schema Kurulumu:**
   - Supabase Dashboard → SQL Editor
   - `supabase/migration.sql` dosyasını çalıştır
   - `supabase/seed.sql` ile test verilerini yükle

3. **Realtime Aktivasyonu:**
   - Settings → API → Realtime
   - Gerekli tabloları enable et

### Self-hosted PostgreSQL

```sql
-- Database oluştur
CREATE DATABASE thunder_erp;

-- User oluştur
CREATE USER thunder_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE thunder_erp TO thunder_user;

-- Schema'yı import et
psql -h localhost -U thunder_user -d thunder_erp -f migration.sql
```

## 🔒 Security Checklist

### Production Güvenlik
- [ ] JWT secret güçlü (32+ karakter)
- [ ] httpOnly cookies aktif
- [ ] HTTPS zorunlu
- [ ] CORS ayarları yapılandırıldı
- [ ] Rate limiting aktif
- [ ] SQL injection koruması (Supabase otomatik)
- [ ] XSS koruması (React otomatik)

### Database Güvenlik
- [ ] RLS (Row Level Security) aktif
- [ ] Service role key güvenli
- [ ] Database backup stratejisi
- [ ] Connection pooling yapılandırıldı

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# PM2 monitoring
pm2 monit

# Logs
pm2 logs thunder-erp

# Restart
pm2 restart thunder-erp
```

### Database Monitoring
- Supabase Dashboard → Logs
- Query performance monitoring
- Error tracking
- Usage analytics

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - run: npm run test
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 🚨 Troubleshooting

### Common Issues

**1. Build Hatası:**
```bash
# Node modules temizle
rm -rf node_modules package-lock.json
npm install
npm run build
```

**2. Database Connection:**
```bash
# Supabase connection test
npm run test:db
```

**3. Memory Issues:**
```bash
# PM2 memory limit
pm2 start npm --name "thunder-erp" --node-args="--max-old-space-size=4096" -- start
```

**4. Port Conflicts:**
```bash
# Port kontrolü
lsof -i :3000
# Process'i kill et
kill -9 <PID>
```

## 📈 Performance Optimization

### Frontend
- [ ] Image optimization (next/image)
- [ ] Code splitting
- [ ] Bundle analysis
- [ ] CDN kullanımı

### Backend
- [ ] Database query optimization
- [ ] Caching strategies
- [ ] Connection pooling
- [ ] Rate limiting

### Database
- [ ] Index optimization
- [ ] Query performance monitoring
- [ ] Connection pooling
- [ ] Read replicas (gerekirse)

## 🔄 Backup Strategy

### Database Backup
```bash
# Supabase otomatik backup
# Manuel backup (gerekirse)
pg_dump -h db.supabase.co -U postgres -d thunder_erp > backup.sql
```

### Application Backup
```bash
# Code backup
git push origin main

# Environment backup
cp .env.local .env.backup
```

## 📞 Support

**Deployment Sorunları:**
- GitHub Issues: [Proje Issues](https://github.com/your-repo/issues)
- Email: info@thunder-erp.com

**Database Sorunları:**
- Supabase Support: https://supabase.com/support
- Documentation: https://supabase.com/docs

---

**🎉 Deployment tamamlandı!** Sistem production'da çalışıyor.
