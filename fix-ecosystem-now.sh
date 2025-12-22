#!/bin/bash

# ============================================
# ecosystem.config.js'i Hemen Düzelt
# Sunucuda çalıştırılacak
# ============================================

set -e

echo "🔧 ecosystem.config.js Düzeltiliyor..."
echo "======================================"
echo ""

cd /var/www/thunder-erp

# .env.local dosyasından değişkenleri oku
N8N_MCP_SERVER_URL=$(grep "N8N_MCP_SERVER_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
N8N_MCP_ACCESS_TOKEN=$(grep "N8N_MCP_ACCESS_TOKEN" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
N8N_BASE_URL=$(grep "N8N_BASE_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
N8N_API_KEY=$(grep "N8N_API_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
NEXT_PUBLIC_SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
SUPABASE_SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
JWT_SECRET=$(grep "JWT_SECRET" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)

# Yedekle
if [ -f ecosystem.config.js ]; then
    cp ecosystem.config.js ecosystem.config.js.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Yedek alındı"
fi

# Yeni ecosystem.config.js oluştur
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'thunder-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/thunder-erp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_SUPABASE_URL: '${NEXT_PUBLIC_SUPABASE_URL}',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '${NEXT_PUBLIC_SUPABASE_ANON_KEY}',
      SUPABASE_SERVICE_ROLE_KEY: '${SUPABASE_SERVICE_ROLE_KEY}',
      JWT_SECRET: '${JWT_SECRET}',
      OPENAI_API_KEY: '${OPENAI_API_KEY}',
      N8N_MCP_SERVER_URL: '${N8N_MCP_SERVER_URL}',
      N8N_MCP_ACCESS_TOKEN: '${N8N_MCP_ACCESS_TOKEN}',
      N8N_BASE_URL: '${N8N_BASE_URL}',
      N8N_API_KEY: '${N8N_API_KEY}'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
EOF

echo "✅ ecosystem.config.js güncellendi"
echo ""

# Kontrol et
echo "📋 Eklenen N8N değişkenleri:"
grep -A 15 "env:" ecosystem.config.js | grep "N8N_" || echo "⚠️  N8N değişkenleri bulunamadı"

echo ""
echo "🔄 PM2 durduruluyor..."
pm2 stop thunder-erp || true
pm2 delete thunder-erp || true

echo ""
echo "🚀 PM2 yeniden başlatılıyor..."
pm2 start ecosystem.config.js

echo ""
echo "⏳ 3 saniye bekleniyor..."
sleep 3

echo ""
echo "🧪 Debug test:"
curl -s "http://192.168.1.250:3000/api/ai/n8n-mcp?debug=true" | head -c 500
echo ""

echo ""
echo "✅ TAMAMLANDI!"
echo ""
echo "📋 Test komutları:"
echo "   curl 'http://192.168.1.250:3000/api/ai/n8n-mcp?debug=true'"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-mcp"
echo ""

