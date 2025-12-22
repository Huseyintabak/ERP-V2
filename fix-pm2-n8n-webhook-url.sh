#!/bin/bash

# ============================================
# PM2 N8N_WEBHOOK_URL Fix
# ============================================

echo "🔧 PM2 N8N_WEBHOOK_URL Fix"
echo "======================================"
echo ""

# .env.local'den N8N_WEBHOOK_URL'i oku
if [ -f .env.local ]; then
    N8N_WEBHOOK_URL=$(grep "^N8N_WEBHOOK_URL=" .env.local | cut -d '=' -f2 | tr -d ' ' | tr -d '"')
    
    if [ -z "$N8N_WEBHOOK_URL" ]; then
        echo "❌ N8N_WEBHOOK_URL .env.local'de bulunamadı!"
        exit 1
    fi
    
    echo "✅ N8N_WEBHOOK_URL bulundu: $N8N_WEBHOOK_URL"
else
    echo "❌ .env.local dosyası bulunamadı!"
    exit 1
fi

echo ""
echo "1️⃣  PM2 Hard Restart (N8N_WEBHOOK_URL ile):"
echo "======================================"
pm2 stop thunder-erp
pm2 delete thunder-erp

# N8N_WEBHOOK_URL ile PM2'yi başlat
N8N_WEBHOOK_URL="$N8N_WEBHOOK_URL" pm2 start ecosystem.config.js --update-env
pm2 save

echo ""
echo "2️⃣  PM2 Status:"
echo "======================================"
pm2 status

echo ""
echo "3️⃣  PM2 Environment Variables Kontrolü:"
echo "======================================"
pm2 env 3 | grep N8N_WEBHOOK_URL || echo "⚠️  N8N_WEBHOOK_URL görüntülenemedi"

echo ""
echo "4️⃣  Test (5 saniye bekle):"
echo "======================================"
sleep 5
curl -s --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }' | jq '.' 2>/dev/null || curl -s --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }'

echo ""
echo ""
echo "======================================"
echo "✅ Tamamlandı!"
echo "======================================"
echo ""

