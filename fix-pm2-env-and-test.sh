#!/bin/bash

# ============================================
# PM2 Environment Variables Fix & Test
# ============================================

echo "🔧 PM2 Environment Variables Fix & Test"
echo "======================================"
echo ""

echo "1️⃣  .env.local Kontrolü:"
echo "======================================"
if [ -f .env.local ]; then
    echo "✅ .env.local dosyası mevcut"
    echo ""
    echo "n8n Değişkenleri:"
    grep "N8N_" .env.local | head -10
else
    echo "❌ .env.local dosyası bulunamadı!"
    exit 1
fi

echo ""
echo "2️⃣  PM2 Hard Restart:"
echo "======================================"
pm2 stop thunder-erp
pm2 delete thunder-erp
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "3️⃣  PM2 Status:"
echo "======================================"
pm2 status

echo ""
echo "4️⃣  PM2 Environment Variables Kontrolü:"
echo "======================================"
pm2 env 1 | grep N8N_ || echo "⚠️  N8N_ değişkenleri görüntülenemedi"

echo ""
echo "5️⃣  Thunder ERP API Test:"
echo "======================================"
sleep 3  # PM2'nin başlaması için bekle
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
echo "6️⃣  n8n Webhook Test:"
echo "======================================"
curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' | jq '.' 2>/dev/null || curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'

echo ""
echo ""
echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Notlar:"
echo "- Eğer Thunder ERP API hala 404 dönüyorsa:"
echo "  1. .env.local'de N8N_WEBHOOK_URL kontrol edin"
echo "  2. PM2 logs kontrol edin: pm2 logs thunder-erp --lines 50"
echo ""
echo "- Eğer n8n webhook response boşsa:"
echo "  n8n UI'de Respond to Webhook node'unun expression'ını kontrol edin"
echo ""

