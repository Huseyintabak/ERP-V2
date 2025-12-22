#!/bin/bash

# ============================================
# Hostname Fix ve Test
# ============================================

echo "🔧 Hostname Fix ve Test"
echo "======================================"
echo ""

echo "1️⃣  Git Pull:"
echo "======================================"
git pull origin main

echo ""
echo "2️⃣  PM2 Restart:"
echo "======================================"
pm2 restart thunder-erp --update-env

echo ""
echo "3️⃣  PM2 Status:"
echo "======================================"
pm2 status

echo ""
echo "4️⃣  Port Kontrolü (5 saniye bekle):"
echo "======================================"
sleep 5
ss -tulpn | grep :3000

echo ""
echo "5️⃣  Localhost Test:"
echo "======================================"
curl -I http://localhost:3000 2>&1 | head -5

echo ""
echo "6️⃣  Network Test (192.168.1.250:3000):"
echo "======================================"
curl -I http://192.168.1.250:3000 2>&1 | head -5

echo ""
echo "7️⃣  Thunder ERP API Test:"
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

