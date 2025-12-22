#!/bin/bash

# ============================================
# n8n Response Debug
# ============================================

echo "🔍 n8n Response Debug"
echo "======================================"
echo ""

echo "1️⃣  n8n Webhook Raw Response:"
echo "======================================"
RESPONSE=$(curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}')

echo "Response Length: ${#RESPONSE} characters"
echo ""
if [ -z "$RESPONSE" ]; then
    echo "❌ Response BOŞ!"
else
    echo "Response Content:"
    echo "$RESPONSE"
    echo ""
    echo "JSON Parse Test:"
    echo "$RESPONSE" | jq '.' 2>&1 || echo "⚠️  JSON parse hatası!"
fi

echo ""
echo "2️⃣  n8n Webhook Verbose Test:"
echo "======================================"
curl -v --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test mesajı"}' 2>&1 | tail -20

echo ""
echo ""
echo "======================================"
echo "💡 n8n UI'de Kontrol Edin:"
echo "======================================"
echo ""
echo "1. Workflow'u açın"
echo "2. Executions sekmesine gidin"
echo "3. Son execution'ı açın"
echo "4. Respond to Webhook node'una tıklayın"
echo "5. Output sekmesinde response'u kontrol edin"
echo ""
echo "Eğer response boşsa veya hatalıysa:"
echo "- Expression modunda olduğundan emin olun ({{ }} işaretleri görünmeli)"
echo "- 'Fixed' yerine 'Expression' butonuna tıklayın"
echo "- $json[0].message.content kullanıldığından emin olun"
echo ""

