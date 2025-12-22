#!/bin/bash

# ============================================
# Final Production Webhook Test
# ============================================

echo "🧪 Final Production Webhook Test"
echo "======================================"
echo ""

echo "1️⃣  Production Webhook Test:"
echo "======================================"
curl -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo ""
echo "2️⃣  Thunder ERP API Test:"
echo "======================================"
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo ""
echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""

