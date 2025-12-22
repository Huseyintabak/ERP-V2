#!/bin/bash

# ============================================
# n8n URL'lerini Düzeltme
# ============================================

echo "🔧 n8n URL'lerini Düzeltme"
echo "======================================"
echo ""

# Yedekle
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ .env.local yedeklendi"
else
    echo "❌ .env.local dosyası bulunamadı!"
    exit 1
fi

echo ""
echo "1️⃣  N8N_WEBHOOK_URL güncelleniyor..."
echo "======================================"
sed -i 's|N8N_WEBHOOK_URL=http://localhost:5678|N8N_WEBHOOK_URL=http://192.168.1.250:5678|' .env.local
echo "✅ N8N_WEBHOOK_URL güncellendi"

echo ""
echo "2️⃣  N8N_BASE_URL güncelleniyor..."
echo "======================================"
sed -i 's|N8N_BASE_URL=http://localhost:5678|N8N_BASE_URL=http://192.168.1.250:5678|' .env.local
echo "✅ N8N_BASE_URL güncellendi"

echo ""
echo "3️⃣  N8N_MCP_SERVER_URL güncelleniyor..."
echo "======================================"
sed -i 's|N8N_MCP_SERVER_URL=http://localhost:5678|N8N_MCP_SERVER_URL=http://192.168.1.250:5678|' .env.local
echo "✅ N8N_MCP_SERVER_URL güncellendi"

echo ""
echo "4️⃣  Güncellenmiş değerler:"
echo "======================================"
grep "N8N_" .env.local | grep -E "(WEBHOOK_URL|BASE_URL|MCP_SERVER_URL)"

echo ""
echo "5️⃣  PM2 Restart:"
echo "======================================"
pm2 restart thunder-erp --update-env

echo ""
echo "6️⃣  Test:"
echo "======================================"
sleep 3
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
echo "✅ Tamamlandı!"
echo "======================================"
echo ""

