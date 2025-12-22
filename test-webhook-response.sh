#!/bin/bash

# ============================================
# Webhook Response Test (Response Body Gösterme)
# ============================================

echo "🧪 Webhook Response Test"
echo "======================================"
echo ""

echo "1️⃣  Production Webhook Test (Response Body):"
echo "======================================"
RESPONSE=$(curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response Body:"
if [ -z "$RESPONSE" ]; then
    echo "⚠️  Response body boş!"
    echo ""
    echo "💡 Verbose test yapılıyor..."
    curl -v --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
      -H "Content-Type: application/json" \
      -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' \
      2>&1 | grep -A 20 "< HTTP"
else
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
fi

echo ""
echo ""
echo "2️⃣  Thunder ERP API Test:"
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
echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""

