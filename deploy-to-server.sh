#!/bin/bash

# Thunder ERP Sunucu Deploy Script
# Bu script sunucuda çalıştırılmalıdır

set -e

echo "🚀 Thunder ERP Deploy Başlatılıyor..."
echo "======================================"
echo ""

# Sunucu dizinine git
cd /var/www/thunder-erp

# 1. Git pull
echo "📥 1. Git pull yapılıyor..."
git pull origin main
echo "✅ Git pull tamamlandı"
echo ""

# 2. Dependencies kontrolü
echo "📦 2. Dependencies kontrol ediliyor..."
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
echo "✅ Dependencies yüklendi"
echo ""

# 3. Build
echo "🔨 3. Next.js build yapılıyor..."
rm -rf .next
npm run build
echo "✅ Build tamamlandı"
echo ""

# 4. PM2 restart
echo "🔄 4. PM2 restart yapılıyor..."
pm2 restart thunder-erp --update-env
echo "✅ PM2 restart tamamlandı"
echo ""

# 5. PM2 status
echo "📊 5. PM2 durumu:"
pm2 status thunder-erp
echo ""

# 6. Son log'ları göster
echo "📋 6. Son log'lar (son 20 satır):"
pm2 logs thunder-erp --lines 20 --nostream
echo ""

echo "✅ Deploy tamamlandı!"
echo ""
echo "🌐 Uygulama: http://192.168.1.250"
echo "📊 PM2 Dashboard: pm2 monit"

