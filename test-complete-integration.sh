#!/bin/bash

# ============================================
# Complete Integration Test
# ============================================

echo "🎉 Complete Integration Test"
echo "======================================"
echo ""

echo "1️⃣  n8n Webhook Test:"
echo "======================================"
N8N_RESPONSE=$(curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

N8N_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

echo "HTTP Status: $N8N_HTTP_CODE"
echo ""
echo "Response:"
echo "$N8N_RESPONSE" | jq '.' 2>/dev/null || echo "$N8N_RESPONSE"

if echo "$N8N_RESPONSE" | grep -q '"success":true'; then
    echo ""
    echo "✅ n8n webhook çalışıyor!"
else
    echo ""
    echo "❌ n8n webhook hatası!"
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
    echo "❌ Thunder ERP API hatası!"
    echo "$API_RESPONSE" | jq '.error, .message' 2>/dev/null || echo "$API_RESPONSE"
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
echo "📊 Özet:"
echo "- n8n Webhook: HTTP $N8N_HTTP_CODE"
echo "- Thunder ERP API: HTTP $API_HTTP_CODE"
echo ""
if [ "$N8N_HTTP_CODE" == "200" ] && echo "$N8N_RESPONSE" | grep -q '"success":true'; then
    echo "✅ n8n workflow başarıyla çalışıyor!"
fi
if [ "$API_HTTP_CODE" == "200" ] && echo "$API_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Thunder ERP API entegrasyonu başarılı!"
    echo ""
    echo "🎉 Tüm entegrasyon tamamlandı!"
fi
echo ""

