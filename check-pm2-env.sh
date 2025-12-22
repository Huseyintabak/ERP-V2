#!/bin/bash

# ============================================
# PM2 Environment Variables Kontrol Script'i
# ============================================

echo "🔍 PM2 Environment Variables Kontrolü"
echo "======================================"
echo ""

cd /var/www/thunder-erp

echo "1️⃣  .env.local dosyasındaki N8N değişkenleri:"
echo ""
grep "N8N_" .env.local || echo "❌ N8N değişkenleri bulunamadı"

echo ""
echo "============================================"
echo "2️⃣  ecosystem.config.js dosyasındaki N8N değişkenleri:"
echo ""
if [ -f ecosystem.config.js ]; then
    grep -A 20 "env:" ecosystem.config.js | grep "N8N_" || echo "❌ N8N değişkenleri ecosystem.config.js'de bulunamadı"
else
    echo "❌ ecosystem.config.js dosyası bulunamadı!"
fi

echo ""
echo "============================================"
echo "3️⃣  PM2 Process Environment Variables:"
echo ""
pm2 show thunder-erp 2>/dev/null | grep -E "N8N_|env:" || echo "⚠️  PM2 process görüntülenemedi veya N8N değişkenleri yok"

echo ""
echo "============================================"
echo "4️⃣  PM2 Process List:"
echo ""
pm2 list

echo ""
echo "============================================"
echo "5️⃣  Öneriler:"
echo ""
echo "Eğer N8N değişkenleri PM2'de yoksa:"
echo "  ./update-pm2-env.sh"
echo ""
echo "Veya hard restart:"
echo "  ./fix-pm2-env-hard.sh"
echo ""
echo "Debug endpoint ile test:"
echo "  curl 'http://192.168.1.250:3000/api/ai/n8n-mcp?debug=true'"
echo ""

