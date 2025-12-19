#!/bin/bash

# ============================================
# Fix API Routes 404 Error
# Build ve PM2 restart ile düzelt
# ============================================

set -e

echo "🔧 API Routes 404 Hatası Düzeltiliyor..."
echo ""

cd /var/www/thunder-erp

# 1. Git pull
echo "1. Son kodları çekiyorum..."
git pull origin main

# 2. Dependencies kontrol
echo "2. Dependencies kontrol ediliyor..."
npm install

# 3. Build
echo "3. Production build oluşturuluyor..."
rm -rf .next
npm run build

# 4. PM2 restart with --update-env
echo "4. PM2 restart (environment variables ile)..."
pm2 stop thunder-erp || true
sleep 2
pm2 start thunder-erp --update-env
sleep 5

# 5. Durum kontrolü
echo ""
echo "5. Durum kontrolü..."
pm2 list | grep thunder-erp

echo ""
echo "============================================"
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "🧪 Test edin:"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-mcp"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-workflows"
echo ""
echo "📋 PM2 Logları:"
echo "   pm2 logs thunder-erp --lines 30"
echo ""

