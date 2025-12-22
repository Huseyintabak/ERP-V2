#!/bin/bash

# ============================================
# PM2 Environment Variables Hard Fix
# PM2'yi tamamen durdurup yeniden başlatır
# ============================================

set -e

echo "🔄 PM2 Environment Variables Hard Fix"
echo "======================================"
echo ""

cd /var/www/thunder-erp

# 1. PM2 ecosystem.config.js'i güncelle
echo "1️⃣  PM2 ecosystem.config.js güncelleniyor..."
if [ -f update-pm2-env.sh ]; then
    chmod +x update-pm2-env.sh
    ./update-pm2-env.sh
else
    echo "⚠️  update-pm2-env.sh bulunamadı, manuel güncelleme yapılıyor..."
    
    # .env.local'den değişkenleri oku
    N8N_MCP_SERVER_URL=$(grep "N8N_MCP_SERVER_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    N8N_MCP_ACCESS_TOKEN=$(grep "N8N_MCP_ACCESS_TOKEN" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    N8N_BASE_URL=$(grep "N8N_BASE_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    N8N_API_KEY=$(grep "N8N_API_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
    
    # ecosystem.config.js'i güncelle (basit sed ile)
    if [ -f ecosystem.config.js ]; then
        # Eğer N8N değişkenleri yoksa ekle
        if ! grep -q "N8N_MCP_SERVER_URL" ecosystem.config.js; then
            # env: { kısmından sonra ekle
            sed -i '/env: {/a\      N8N_MCP_SERVER_URL: '\''${N8N_MCP_SERVER_URL}'\'',' ecosystem.config.js
            sed -i '/N8N_MCP_SERVER_URL/a\      N8N_MCP_ACCESS_TOKEN: '\''${N8N_MCP_ACCESS_TOKEN}'\'',' ecosystem.config.js
            sed -i '/N8N_MCP_ACCESS_TOKEN/a\      N8N_BASE_URL: '\''${N8N_BASE_URL}'\'',' ecosystem.config.js
            sed -i '/N8N_BASE_URL/a\      N8N_API_KEY: '\''${N8N_API_KEY}'\'',' ecosystem.config.js
        fi
    fi
fi

echo ""
echo "2️⃣  PM2 durduruluyor..."
pm2 stop thunder-erp || true
pm2 delete thunder-erp || true

echo ""
echo "3️⃣  PM2 yeniden başlatılıyor (ecosystem.config.js ile)..."
pm2 start ecosystem.config.js --update-env

echo ""
echo "4️⃣  PM2 environment variables kontrol ediliyor..."
sleep 2

# PM2 process'lerinin environment variable'larını kontrol et
echo ""
echo "📋 PM2 Process Environment Variables:"
pm2 show thunder-erp | grep -E "N8N_|env:" || echo "⚠️  Environment variables görüntülenemedi"

echo ""
echo "5️⃣  Test ediliyor..."
sleep 3

echo ""
echo "🧪 MCP Server Test:"
curl -s http://192.168.1.250:3000/api/ai/n8n-mcp | head -c 200
echo ""

echo ""
echo "============================================"
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "💡 Eğer hala çalışmıyorsa:"
echo "   1. PM2 logs kontrol et: pm2 logs thunder-erp --lines 50"
echo "   2. .env.local kontrol et: grep N8N_ .env.local"
echo "   3. ecosystem.config.js kontrol et: cat ecosystem.config.js"
echo ""

