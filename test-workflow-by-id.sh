#!/bin/bash

# ============================================
# n8n Workflow Test (Workflow ID ile)
# ============================================

WORKFLOW_ID="xLB2DXzkv3BeT3zF"
BASE_URL="http://192.168.1.250:5678"

echo "🧪 n8n Workflow Test (ID: $WORKFLOW_ID)"
echo "======================================"
echo ""

echo "1️⃣  Workflow Link:"
echo "   $BASE_URL/workflow/$WORKFLOW_ID"
echo ""

echo "2️⃣  Webhook Path Kontrolü:"
echo "   n8n UI'de workflow'u açın → Webhook Trigger node'una tıklayın"
echo "   Production URL'i kopyalayın"
echo ""

echo "3️⃣  Production Webhook Test:"
curl -X POST "$BASE_URL/webhook/planning-agent" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' \
  -w "\n\nHTTP Status: %{http_code}\n"

echo ""
echo "4️⃣  Alternatif: Workflow ID ile Test (eğer path farklıysa):"
echo "   Not: n8n'de webhook path'i workflow ID'den bağımsızdır"
echo "   Webhook path'i Webhook Trigger node'unda belirlenir"
echo ""

echo "5️⃣  Thunder ERP API Test:"
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
echo "💡 Önemli Notlar:"
echo "======================================"
echo ""
echo "1. Webhook URL'i workflow ID'den bağımsızdır"
echo "2. Webhook path'i Webhook Trigger node'unda 'path' parametresinde belirlenir"
echo "3. Mevcut workflow'unuzda path: 'planning-agent'"
echo "4. Production URL: $BASE_URL/webhook/planning-agent"
echo ""
echo "5. n8n UI'de kontrol edin:"
echo "   - Workflow → Webhook Trigger node → Production URL"
echo "   - Workflow Active mi? (sağ üstte toggle)"
echo "   - Executions sekmesinde hata var mı?"
echo ""

