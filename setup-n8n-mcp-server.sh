#!/bin/bash

# ============================================
# n8n MCP Server Kurulum Script'i
# Sunucuda çalıştırılacak
# ============================================

set -e

echo "🔧 n8n MCP Server Kurulumu"
echo "======================================"
echo ""

cd /var/www/thunder-erp

echo "📋 Adım 1: n8n Container Durumu Kontrolü"
echo "============================================"
if sudo docker compose ps | grep -q n8n; then
    echo "✅ n8n container çalışıyor"
    sudo docker compose ps | grep n8n
else
    echo "❌ n8n container çalışmıyor!"
    echo "💡 Önce n8n'i başlatın:"
    echo "   cd /var/www/thunder-erp"
    echo "   sudo docker compose up -d n8n"
    exit 1
fi

echo ""
echo "============================================"
echo "📋 Adım 2: n8n UI'de MCP Server Aktifleştirme"
echo "============================================"
echo ""
echo "🌐 n8n UI'yi açın:"
echo "   http://192.168.1.250:5678"
echo ""
echo "📝 Yapılacaklar:"
echo "   1. n8n'e giriş yapın (admin / Thunder2025!)"
echo "   2. Settings → MCP Server'a gidin"
echo "   3. 'Enable MCP Server' seçeneğini aktifleştirin"
echo "   4. 'Generate Access Token' butonuna tıklayın"
echo "   5. Token'ı kopyalayın"
echo ""
read -p "Token'ı kopyaladınız mı? (Enter'a basın devam etmek için)..."

echo ""
echo "============================================"
echo "📋 Adım 3: Access Token'ı Girin"
echo "============================================"
echo ""
read -p "MCP Server Access Token'ı yapıştırın: " MCP_TOKEN

if [ -z "$MCP_TOKEN" ]; then
    echo "❌ Token boş olamaz!"
    exit 1
fi

echo ""
echo "✅ Token alındı: ${MCP_TOKEN:0:20}..."

echo ""
echo "============================================"
echo "📋 Adım 4: .env.local Dosyasını Güncelleme"
echo "============================================"

# .env.local yedekle
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ .env.local yedeklendi"
fi

# MCP Server variables güncelle
if grep -q "N8N_MCP_SERVER_URL" .env.local 2>/dev/null; then
    sed -i "s|N8N_MCP_SERVER_URL=.*|N8N_MCP_SERVER_URL=http://192.168.1.250:5678/mcp-server/http|" .env.local
    sed -i "s|N8N_MCP_ACCESS_TOKEN=.*|N8N_MCP_ACCESS_TOKEN=${MCP_TOKEN}|" .env.local
    echo "✅ MCP Server variables güncellendi"
else
    echo "" >> .env.local
    echo "# n8n MCP Server Configuration" >> .env.local
    echo "N8N_MCP_SERVER_URL=http://192.168.1.250:5678/mcp-server/http" >> .env.local
    echo "N8N_MCP_ACCESS_TOKEN=${MCP_TOKEN}" >> .env.local
    echo "✅ MCP Server variables eklendi"
fi

echo ""
echo "============================================"
echo "📋 Adım 5: PM2 Ecosystem Config Güncelleme"
echo "============================================"

if [ -f update-pm2-env.sh ]; then
    chmod +x update-pm2-env.sh
    ./update-pm2-env.sh
else
    echo "⚠️  update-pm2-env.sh bulunamadı, manuel restart gerekebilir"
fi

echo ""
echo "============================================"
echo "📋 Adım 6: PM2 Restart"
echo "============================================"
pm2 restart thunder-erp --update-env
echo "✅ PM2 restart edildi"

echo ""
echo "============================================"
echo "📋 Adım 7: Test"
echo "============================================"
sleep 3

echo ""
echo "🧪 MCP Server Test:"
curl -s "http://localhost:3000/api/ai/n8n-mcp?debug=true" | head -c 500
echo ""

echo ""
echo "============================================"
echo "✅ KURULUM TAMAMLANDI!"
echo "============================================"
echo ""
echo "📋 Yapılanlar:"
echo "   ✅ n8n MCP Server aktifleştirildi"
echo "   ✅ Access Token .env.local'e eklendi"
echo "   ✅ PM2 ecosystem.config.js güncellendi"
echo "   ✅ PM2 restart edildi"
echo ""
echo "🧪 Test Komutları:"
echo "   curl 'http://192.168.1.250:3000/api/ai/n8n-mcp?debug=true'"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-mcp"
echo ""
echo "💡 Sorun giderme:"
echo "   1. n8n UI'de MCP Server aktif mi kontrol edin"
echo "   2. Token doğru mu kontrol edin: grep N8N_MCP_ACCESS_TOKEN .env.local"
echo "   3. PM2 logs: pm2 logs thunder-erp --lines 50"
echo ""

