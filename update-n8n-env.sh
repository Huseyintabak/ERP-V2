#!/bin/bash

# ============================================
# n8n Environment Variables Güncelleme Script'i
# Sunucuda çalıştırılacak
# ============================================

set -e

echo "🔧 n8n Environment Variables Güncelleniyor..."
echo ""

cd /var/www/thunder-erp

# .env.local dosyasını yedekle
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ .env.local yedeklendi"
fi

# MCP Server variables (eğer yoksa ekle)
if ! grep -q "N8N_MCP_SERVER_URL" .env.local 2>/dev/null; then
    echo "" >> .env.local
    echo "# n8n MCP Server Configuration" >> .env.local
    echo "N8N_MCP_SERVER_URL=http://192.168.1.250:5678/mcp-server/http" >> .env.local
    echo "N8N_MCP_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWU5NTE1OS1lYWE0LTRjNGUtYWRmMy1hNTUyYmU5MTUxMzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjkyMWVmMzVjLWY1NWItNGUyYi04YzMxLTg3NWJlZmNjOTlkNSIsImlhdCI6MTc2NjEzOTU4M30.O_JaYljeMl4gme_Cp4prl8DBHaaL82ie3lUWUwJR-uc" >> .env.local
    echo "✅ MCP Server variables eklendi"
else
    # Güncelle
    sed -i 's|N8N_MCP_SERVER_URL=.*|N8N_MCP_SERVER_URL=http://192.168.1.250:5678/mcp-server/http|' .env.local
    sed -i 's|N8N_MCP_ACCESS_TOKEN=.*|N8N_MCP_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWU5NTE1OS1lYWE0LTRjNGUtYWRmMy1hNTUyYmU5MTUxMzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjkyMWVmMzVjLWY1NWItNGUyYi04YzMxLTg3NWJlZmNjOTlkNSIsImlhdCI6MTc2NjEzOTU4M30.O_JaYljeMl4gme_Cp4prl8DBHaaL82ie3lUWUwJR-uc|' .env.local
    echo "✅ MCP Server variables güncellendi"
fi

# API Configuration (eğer yoksa ekle)
if ! grep -q "N8N_BASE_URL" .env.local 2>/dev/null; then
    echo "" >> .env.local
    echo "# n8n API Configuration" >> .env.local
    echo "N8N_BASE_URL=http://192.168.1.250:5678" >> .env.local
    echo "N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWU5NTE1OS1lYWE0LTRjNGUtYWRmMy1hNTUyYmU5MTUxMzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MTM5ODQ2fQ.UfJMfG9Kj7HdirBa61NP_mUjX3txUXeF84BaIb6j8NY" >> .env.local
    echo "✅ API variables eklendi"
else
    # Güncelle
    sed -i 's|N8N_BASE_URL=.*|N8N_BASE_URL=http://192.168.1.250:5678|' .env.local
    sed -i 's|N8N_API_KEY=.*|N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkOWU5NTE1OS1lYWE0LTRjNGUtYWRmMy1hNTUyYmU5MTUxMzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY2MTM5ODQ2fQ.UfJMfG9Kj7HdirBa61NP_mUjX3txUXeF84BaIb6j8NY|' .env.local
    echo "✅ API variables güncellendi"
fi

echo ""
echo "============================================"
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "📋 Eklenen/Güncellenen Variables:"
echo "   - N8N_MCP_SERVER_URL"
echo "   - N8N_MCP_ACCESS_TOKEN"
echo "   - N8N_BASE_URL"
echo "   - N8N_API_KEY"
echo ""
echo "🔄 Thunder ERP'yi yeniden başlatın:"
echo "   pm2 restart thunder-erp"
echo ""
echo "🧪 Test edin:"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-mcp"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-workflows"
echo ""

