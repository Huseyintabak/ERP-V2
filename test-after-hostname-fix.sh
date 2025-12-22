#!/bin/bash

# ============================================
# Hostname Fix Sonrası Test
# ============================================

echo "🧪 Hostname Fix Sonrası Test"
echo "======================================"
echo ""

echo "1️⃣  PM2 Restart:"
echo "======================================"
pm2 restart thunder-erp --update-env

echo ""
echo "2️⃣  PM2 Status:"
echo "======================================"
pm2 status

echo ""
echo "3️⃣  Port Kontrolü (5 saniye bekle):"
echo "======================================"
sleep 5
echo "Port 3000 dinleniyor mu?"
ss -tulpn | grep :3000 || echo "⚠️  Port 3000 dinlenmiyor"

echo ""
echo "4️⃣  Localhost Test:"
echo "======================================"
curl -I http://localhost:3000 2>&1 | head -3

echo ""
echo "5️⃣  Network Test (192.168.1.250:3000):"
echo "======================================"
curl -I http://192.168.1.250:3000 2>&1 | head -5

echo ""
echo "6️⃣  Thunder ERP API Test:"
echo "======================================"
sleep 2
RESPONSE=$(curl -s --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }')

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }')

echo "HTTP Status: $HTTP_CODE"
echo ""
echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo ""
echo "7️⃣  n8n Webhook Test:"
echo "======================================"
curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' | jq '.' 2>/dev/null || curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'

echo ""
echo ""
echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Notlar:"
echo "- Eğer 192.168.1.250:3000 erişilemiyorsa, firewall kontrol edin:"
echo "  sudo ufw status"
echo ""
echo "- Eğer Thunder ERP API hala 404 dönüyorsa, PM2 logs kontrol edin:"
echo "  pm2 logs thunder-erp --lines 50"
echo ""

