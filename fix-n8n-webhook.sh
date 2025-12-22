#!/bin/bash

# ============================================
# n8n Webhook Sorun Giderme Script'i
# ============================================

echo "🔧 n8n Webhook Sorun Giderme"
echo "======================================"
echo ""

cd /var/www/thunder-erp

echo "1️⃣  Son değişiklikleri çekiyor..."
git pull origin main

echo ""
echo "2️⃣  PM2'yi restart ediyor..."
pm2 restart thunder-erp --update-env

echo ""
echo "3️⃣  3 saniye bekleniyor..."
sleep 3

echo ""
echo "4️⃣  Production Webhook Test (detaylı):"
echo "======================================"
curl -v -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' \
  2>&1 | grep -E "HTTP|success|error|response|agent"

echo ""
echo "5️⃣  Thunder ERP API Test:"
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
echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Kontrol Edin:"
echo "   1. n8n UI'de workflow Active mi?"
echo "   2. Webhook Trigger node'una tıklayın → Production URL'i kontrol edin"
echo "   3. OpenAI credentials doğru mu?"
echo "   4. n8n Executions sekmesinde hata var mı?"
echo ""

