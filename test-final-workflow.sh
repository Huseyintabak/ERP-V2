#!/bin/bash

# ============================================
# Final Workflow Test
# ============================================

echo "🧪 Final Workflow Test"
echo "======================================"
echo ""

echo "1️⃣  n8n Webhook Test:"
echo "======================================"
RESPONSE=$(curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ Response formatı doğru!"
fi

echo ""
echo "2️⃣  Thunder ERP API Test:"
echo "======================================"
API_RESPONSE=$(curl -s --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }')

API_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }')

echo "HTTP Status: $API_HTTP_CODE"
echo ""
echo "Response:"
echo "$API_RESPONSE" | jq '.' 2>/dev/null || echo "$API_RESPONSE"

if echo "$API_RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ Thunder ERP API çalışıyor!"
elif echo "$API_RESPONSE" | grep -q '"error"'; then
    echo ""
    echo "❌ Thunder ERP API hatası var!"
else
    echo ""
    echo "⚠️  Thunder ERP API response beklenmedik format!"
fi

echo ""
echo ""
echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Sonuçlar:"
echo "- n8n Webhook: HTTP $HTTP_CODE"
echo "- Thunder ERP API: HTTP $API_HTTP_CODE"
echo ""
if [ "$HTTP_CODE" == "200" ] && echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ n8n workflow başarıyla çalışıyor!"
fi
if [ "$API_HTTP_CODE" == "200" ] && echo "$API_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Thunder ERP API entegrasyonu başarılı!"
fi
echo ""

