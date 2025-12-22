#!/bin/bash

# ============================================
# n8n Environment Variables Sunucuya Ekleme
# Hem .env.local hem de PM2'ye ekler
# ============================================

set -e

echo "🔧 n8n Environment Variables Sunucuya Ekleniyor..."
echo "============================================"
echo ""

cd /var/www/thunder-erp

# .env.local dosyasını yedekle
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ .env.local yedeklendi"
else
    echo "⚠️  .env.local dosyası bulunamadı, oluşturuluyor..."
    touch .env.local
fi

# MCP Server variables (eğer yoksa ekle)
if ! grep -q "N8N_MCP_SERVER_URL" .env.local 2>/dev/null; then
    echo "" >> .env.local
    echo "# n8n MCP Server Configuration" >> .env.local
    echo "N8N_MCP_SERVER_URL=http://192.168.1.250:5678/mcp-server/http" >> .env.local
    echo "N8N_MCP_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWU5NTE1OS1lYWE0LTRjNGUtYWRmMy1hNTUyYmU5MTUxMzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjkyMWVmMzVjLWY1NWItNGUyYi04YzMxLTg3NWJlZmNjOTlkNSIsImlhdCI6MTc2NjEzOTU4M30.O_JaYljeMl4gme_Cp4prl8DBHaaL82ie3lUWUwJR-uc" >> .env.local
    echo "✅ MCP Server variables eklendi"
else
    echo "ℹ️  MCP Server variables zaten mevcut"
fi

# API Configuration (eğer yoksa ekle)
if ! grep -q "N8N_BASE_URL" .env.local 2>/dev/null; then
    echo "" >> .env.local
    echo "# n8n API Configuration" >> .env.local
    echo "N8N_BASE_URL=http://192.168.1.250:5678" >> .env.local
    echo "N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWU5NTE1OS1lYWE0LTRjNGUtYWRmMy1hNTUyYmU5MTUxMzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MTM5ODQ2fQ.UfJMfG9Kj7HdirBa61NP_mUjX3txUXeF84BaIb6j8NY" >> .env.local
    echo "✅ API variables eklendi"
else
    echo "ℹ️  API variables zaten mevcut"
fi

echo ""
echo "============================================"
echo "📋 .env.local Kontrolü:"
echo "============================================"
grep -E "N8N_" .env.local || echo "⚠️  N8N değişkenleri bulunamadı"

echo ""
echo "============================================"
echo "🔄 PM2 Ecosystem Config Güncelleniyor..."
echo "============================================"

# PM2 ecosystem.config.js'i güncelle
if [ -f update-pm2-env.sh ]; then
    chmod +x update-pm2-env.sh
    ./update-pm2-env.sh
else
    echo "⚠️  update-pm2-env.sh bulunamadı, manuel olarak PM2'yi restart edin:"
    echo "   pm2 restart thunder-erp --update-env"
fi

echo ""
echo "============================================"
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "📋 Eklenen Variables:"
echo "   - N8N_MCP_SERVER_URL"
echo "   - N8N_MCP_ACCESS_TOKEN"
echo "   - N8N_BASE_URL"
echo "   - N8N_API_KEY"
echo ""
echo "🧪 Test edin:"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-mcp"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-workflows"
echo ""

