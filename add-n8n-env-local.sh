#!/bin/bash

# ============================================
# Local Development için n8n Environment Variables Ekleme
# ============================================

echo "🔧 Local Development için n8n Environment Variables Ekleniyor..."
echo "============================================"
echo ""

cd /Users/huseyintabak/Downloads/ThunderV2

# .env.local dosyasını kontrol et
if [ ! -f .env.local ]; then
    echo "❌ .env.local dosyası bulunamadı!"
    echo "💡 Önce .env.local dosyasını oluşturun"
    exit 1
fi

# Yedekle
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ .env.local yedeklendi"

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
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "📋 Eklenen Variables:"
grep "N8N_" .env.local || echo "⚠️  N8N değişkenleri bulunamadı"
echo ""
echo "🔄 Next.js dev server'ı restart edin:"
echo "   1. Ctrl+C ile durdurun (eğer çalışıyorsa)"
echo "   2. npm run dev ile yeniden başlatın"
echo ""
echo "🧪 Test edin:"
echo "   curl 'http://localhost:3000/api/ai/n8n-mcp?debug=true'"
echo "   curl http://localhost:3000/api/ai/n8n-mcp"
echo ""

