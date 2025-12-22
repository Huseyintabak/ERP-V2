#!/bin/bash

# ============================================
# PM2 Environment Variables ve n8n Kontrolü
# ============================================

echo "🔍 PM2 Environment Variables ve n8n Kontrolü"
echo "======================================"
echo ""

echo "1️⃣  .env.local Kontrolü:"
echo "======================================"
grep "N8N_" .env.local

echo ""
echo "2️⃣  PM2 Environment Variables:"
echo "======================================"
pm2 env 3 | grep N8N_ || echo "⚠️  N8N_ değişkenleri görüntülenemedi"

echo ""
echo "3️⃣  PM2 Process Info:"
echo "======================================"
pm2 info thunder-erp | grep -A 20 "env:"

echo ""
echo "4️⃣  n8n Webhook Test (Detaylı):"
echo "======================================"
echo "Test webhook:"
curl -v --max-time 60 -X POST http://192.168.1.250:5678/webhook-test/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test mesajı"}' 2>&1 | grep -E "HTTP|success|response|agent|404|200"

echo ""
echo "Production webhook:"
curl -v --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' 2>&1 | head -30

echo ""
echo "5️⃣  Thunder ERP API Test (Debug):"
echo "======================================"
curl -v --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }' 2>&1 | head -40

echo ""
echo ""
echo "======================================"
echo "✅ Kontrol Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Notlar:"
echo "- Eğer PM2 environment variables'da N8N_ değişkenleri yoksa:"
echo "  pm2 stop thunder-erp"
echo "  pm2 delete thunder-erp"
echo "  pm2 start ecosystem.config.js"
echo ""
echo "- Eğer n8n webhook response boşsa:"
echo "  n8n UI'de Respond to Webhook node'unun expression'ını kontrol edin"
echo ""

