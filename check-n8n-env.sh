#!/bin/bash

# ============================================
# n8n Environment Variables Kontrol Script'i
# ============================================

echo "🔍 n8n Environment Variables Kontrolü"
echo "======================================"
echo ""

cd /var/www/thunder-erp

# 1. .env.local'deki değerleri kontrol et
echo "1. .env.local dosyasındaki değerler:"
echo ""
if [ -f .env.local ]; then
    echo "✅ .env.local dosyası mevcut"
    echo ""
    echo "N8N_MCP_SERVER_URL:"
    grep "N8N_MCP_SERVER_URL" .env.local || echo "  ❌ Bulunamadı"
    echo ""
    echo "N8N_MCP_ACCESS_TOKEN:"
    grep "N8N_MCP_ACCESS_TOKEN" .env.local | sed 's/\(.*=\).*/\1***/' || echo "  ❌ Bulunamadı"
    echo ""
    echo "N8N_BASE_URL:"
    grep "N8N_BASE_URL" .env.local || echo "  ❌ Bulunamadı"
    echo ""
    echo "N8N_API_KEY:"
    grep "N8N_API_KEY" .env.local | sed 's/\(.*=\).*/\1***/' || echo "  ❌ Bulunamadı"
else
    echo "❌ .env.local dosyası bulunamadı!"
fi

echo ""
echo "============================================"
echo "2. PM2 Environment Variables:"
echo "============================================"
echo ""
pm2 show thunder-erp | grep -E "N8N_|env:" || echo "⚠️  PM2 environment variables görüntülenemedi"

echo ""
echo "============================================"
echo "3. MCP Server Erişilebilirlik Testi:"
echo "============================================"
echo ""

MCP_URL=$(grep "N8N_MCP_SERVER_URL" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")
MCP_TOKEN=$(grep "N8N_MCP_ACCESS_TOKEN" .env.local 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$MCP_URL" ]; then
    echo "❌ N8N_MCP_SERVER_URL bulunamadı"
else
    echo "📍 MCP Server URL: $MCP_URL"
    echo ""
    echo "🧪 Health check..."
    if curl -s -H "Authorization: Bearer $MCP_TOKEN" "$MCP_URL/healthz" > /dev/null 2>&1; then
        echo "✅ MCP Server erişilebilir"
    else
        echo "❌ MCP Server'a erişilemiyor"
        echo ""
        echo "💡 Kontrol edin:"
        echo "   1. n8n container çalışıyor mu?"
        echo "      sudo docker compose ps"
        echo ""
        echo "   2. MCP Server aktif mi?"
        echo "      n8n UI → Settings → MCP Server"
        echo ""
        echo "   3. Access token doğru mu?"
        echo "      n8n UI'den yeni token oluşturun"
    fi
fi

echo ""
echo "============================================"
echo "4. Öneriler:"
echo "============================================"
echo ""
echo "Eğer environment variables PM2'ye yüklenmemişse:"
echo "  pm2 restart thunder-erp --update-env"
echo ""
echo "Veya hard restart:"
echo "  pm2 stop thunder-erp"
echo "  pm2 start thunder-erp --update-env"
echo ""

