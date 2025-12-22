#!/bin/bash

# ============================================
# Git Conflict Fix ve Hostname Fix
# ============================================

echo "🔧 Git Conflict Fix ve Hostname Fix"
echo "======================================"
echo ""

echo "1️⃣  Yerel Değişiklikleri Stash Ediyoruz:"
echo "======================================"
git stash

echo ""
echo "2️⃣  Git Pull:"
echo "======================================"
git pull origin main

echo ""
echo "3️⃣  ecosystem.config.js Kontrolü:"
echo "======================================"
if grep -q "HOSTNAME.*0.0.0.0" ecosystem.config.js; then
    echo "✅ HOSTNAME=0.0.0.0 zaten var"
else
    echo "⚠️  HOSTNAME=0.0.0.0 yok, ekleniyor..."
    # Yedekle
    cp ecosystem.config.js ecosystem.config.js.backup
    # HOSTNAME ekle
    sed -i '/PORT: 3000/a\      HOSTNAME: '\''0.0.0.0'\'',' ecosystem.config.js
    echo "✅ HOSTNAME=0.0.0.0 eklendi"
fi

echo ""
echo "4️⃣  PM2 Restart:"
echo "======================================"
pm2 restart thunder-erp --update-env

echo ""
echo "5️⃣  PM2 Status:"
echo "======================================"
pm2 status

echo ""
echo "6️⃣  Port Kontrolü (5 saniye bekle):"
echo "======================================"
sleep 5
ss -tulpn | grep :3000

echo ""
echo "7️⃣  Network Test (192.168.1.250:3000):"
echo "======================================"
curl -I http://192.168.1.250:3000 2>&1 | head -5

echo ""
echo "8️⃣  Thunder ERP API Test:"
echo "======================================"
sleep 2
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

