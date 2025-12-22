#!/bin/bash

# ============================================
# Production Webhook Test Script
# ============================================

echo "🧪 Production Webhook Test"
echo "======================================"
echo ""

echo "1️⃣  Production Webhook Test:"
echo "======================================"
RESPONSE=$(curl -s -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

if [ "$HTTP_CODE" == "200" ]; then
    echo "✅ Production webhook çalışıyor!"
    
    # Response içeriğini kontrol et
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo "✅ Response formatı doğru"
    else
        echo "⚠️  Response formatı beklenenden farklı"
    fi
    
    if echo "$RESPONSE" | grep -q '"agent":"planning"'; then
        echo "✅ Agent bilgisi var"
    fi
    
    if echo "$RESPONSE" | grep -q '"response"'; then
        echo "✅ Response içeriği var"
    fi
else
    echo "❌ Production webhook hatası: HTTP $HTTP_CODE"
fi

echo ""
echo "2️⃣  Thunder ERP API Test:"
echo "======================================"
curl -s -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }' | jq '.' 2>/dev/null || curl -s -X POST http://192.168.1.250:3000/api/ai/n8n \
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

