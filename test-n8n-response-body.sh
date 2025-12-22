#!/bin/bash

# ============================================
# n8n Response Body Test
# ============================================

echo "🧪 n8n Response Body Test"
echo "======================================"
echo ""

echo "1️⃣  PM2 Environment Variables:"
echo "======================================"
pm2 env 3 | grep N8N_WEBHOOK_URL || echo "⚠️  N8N_WEBHOOK_URL görüntülenemedi"

echo ""
echo "2️⃣  n8n Webhook Response (Raw):"
echo "======================================"
RESPONSE=$(curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

echo "Response Length: ${#RESPONSE} characters"
echo ""
echo "Response (first 500 chars):"
echo "$RESPONSE" | head -c 500
echo ""

echo ""
echo "3️⃣  n8n Webhook Response (JSON Parse Test):"
echo "======================================"
echo "$RESPONSE" | jq '.' 2>&1 | head -20 || echo "⚠️  JSON parse hatası!"

echo ""
echo "4️⃣  Thunder ERP API Test (Verbose):"
echo "======================================"
curl -v --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }' 2>&1 | grep -A 10 -E "success|error|response|agent|JSON"

echo ""
echo ""
echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Notlar:"
echo "- Eğer response boşsa, n8n UI'de Respond to Webhook node'unu kontrol edin"
echo "- Expression modunda olmalı: ={{ {...} }}"
echo "- $json[0].message.content kullanmalı"
echo ""

