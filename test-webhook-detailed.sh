#!/bin/bash

# ============================================
# n8n Webhook Detaylı Test
# ============================================

echo "🧪 n8n Webhook Detaylı Test"
echo "======================================"
echo ""

echo "1️⃣  Production Webhook Test (Full Response):"
echo "======================================"
RESPONSE=$(curl -s -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$RESPONSE" | head -c 1000
echo ""
echo ""

if [ -z "$RESPONSE" ]; then
    echo "⚠️  Response body boş!"
    echo "💡 n8n UI'de kontrol edin:"
    echo "   1. Workflow → Executions sekmesi"
    echo "   2. Son execution'ı açın"
    echo "   3. 'Respond to Webhook' node'unun çalıştığını kontrol edin"
    echo ""
fi

echo "2️⃣  Thunder ERP API Test:"
echo "======================================"
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }'

echo ""
echo ""

echo "3️⃣  PM2 Process Kontrolü:"
echo "======================================"
pm2 show thunder-erp | grep -E "status|restarts|uptime" || echo "PM2 process bulunamadı"

echo ""
echo "4️⃣  Environment Variables Kontrolü:"
echo "======================================"
echo "N8N_WEBHOOK_URL:"
grep "N8N_WEBHOOK_URL" .env.local || echo "  ❌ Bulunamadı"

echo ""
echo "======================================"
echo "💡 Sorun Giderme:"
echo "======================================"
echo ""
echo "Eğer response body boşsa:"
echo "  1. n8n UI → Workflow → Executions"
echo "  2. Son execution'ı açın"
echo "  3. 'Respond to Webhook' node'una tıklayın"
echo "  4. Response Body ayarlarını kontrol edin"
echo ""
echo "Eğer Thunder ERP API 404 dönüyorsa:"
echo "  1. PM2'yi restart edin: pm2 restart thunder-erp"
echo "  2. Client kodunun güncellendiğinden emin olun"
echo ""

