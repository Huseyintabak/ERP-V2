#!/bin/bash

# ============================================
# PM2 Hard Restart - n8n Client Fix
# ============================================

echo "🔄 PM2 Hard Restart - n8n Client Fix"
echo "======================================"
echo ""

cd /var/www/thunder-erp

echo "1️⃣  Son değişiklikleri çekiyor..."
git pull origin main

echo ""
echo "2️⃣  Build cache temizleniyor..."
rm -rf .next

echo ""
echo "3️⃣  Yeniden build ediliyor..."
npm run build

echo ""
echo "4️⃣  PM2 durduruluyor..."
pm2 stop thunder-erp || true
pm2 delete thunder-erp || true

echo ""
echo "5️⃣  PM2 yeniden başlatılıyor..."
pm2 start ecosystem.config.js --update-env

echo ""
echo "6️⃣  5 saniye bekleniyor..."
sleep 5

echo ""
echo "7️⃣  Thunder ERP API Test:"
echo "======================================"
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }' | jq '.' 2>/dev/null || curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }'

echo ""
echo ""
echo "8️⃣  PM2 Logs (son 20 satır):"
echo "======================================"
pm2 logs thunder-erp --lines 20 --nostream

echo ""
echo "======================================"
echo "✅ Hard Restart Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Eğer hala 404 alıyorsanız:"
echo "   1. Client kodunu kontrol edin: grep 'planning-agent' lib/ai/n8n-client.ts"
echo "   2. PM2 environment variables: pm2 show thunder-erp | grep N8N"
echo "   3. .env.local kontrol: grep N8N_WEBHOOK_URL .env.local"
echo ""

