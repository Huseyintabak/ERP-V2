#!/bin/bash

# ============================================
# .env.local Güncellemesi Sonrası Test
# ============================================

echo "🧪 .env.local Güncellemesi Sonrası Test"
echo "======================================"
echo ""

echo "1️⃣  PM2 Restart:"
echo "======================================"
pm2 restart thunder-erp --update-env

echo ""
echo "2️⃣  PM2 Status:"
echo "======================================"
pm2 status

echo ""
echo "3️⃣  Environment Variables Kontrolü:"
echo "======================================"
echo ""
echo "n8n Değişkenleri:"
grep "N8N_" .env.local | head -10

echo ""
echo "4️⃣  Thunder ERP API Test:"
echo "======================================"
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
echo "5️⃣  n8n Webhook Test:"
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
echo "- Eğer Thunder ERP API hala 404 dönüyorsa, PM2 logs kontrol edin:"
echo "  pm2 logs thunder-erp --lines 50"
echo ""
echo "- Eğer n8n webhook response body boşsa, n8n UI'de Respond to Webhook node'unu kontrol edin"
echo ""

