#!/bin/bash

# ============================================
# PM2 Ecosystem Config'e Environment Variables Ekleme
# ============================================

echo "🔄 PM2 Ecosystem Config Güncelleniyor..."
echo "======================================"
echo ""

cd /var/www/thunder-erp

# .env.local dosyasını kontrol et
if [ ! -f .env.local ]; then
    echo "❌ .env.local dosyası bulunamadı!"
    exit 1
fi

# .env.local dosyasından n8n değişkenlerini oku
N8N_WEBHOOK_URL=$(grep "N8N_WEBHOOK_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
N8N_MCP_SERVER_URL=$(grep "N8N_MCP_SERVER_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
N8N_MCP_ACCESS_TOKEN=$(grep "N8N_MCP_ACCESS_TOKEN" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
N8N_BASE_URL=$(grep "N8N_BASE_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
N8N_API_KEY=$(grep "N8N_API_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)

# Diğer önemli değişkenleri de oku
NEXT_PUBLIC_SUPABASE_URL=$(grep "NEXT_PUBLIC_SUPABASE_URL" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
SUPABASE_SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
JWT_SECRET=$(grep "JWT_SECRET" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
OPENAI_API_KEY=$(grep "OPENAI_API_KEY" .env.local | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)

# ecosystem.config.js dosyasını yedekle
if [ -f ecosystem.config.js ]; then
    cp ecosystem.config.js ecosystem.config.js.backup
    echo "✅ ecosystem.config.js yedeklendi (ecosystem.config.js.backup)"
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
      N8N_WEBHOOK_URL: '${N8N_WEBHOOK_URL}',
      N8N_MCP_SERVER_URL: '${N8N_MCP_SERVER_URL}',
      N8N_MCP_ACCESS_TOKEN: '${N8N_MCP_ACCESS_TOKEN}',
      N8N_BASE_URL: '${N8N_BASE_URL}',
      N8N_API_KEY: '${N8N_API_KEY}',
      HOSTNAME: '0.0.0.0'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
EOF

echo ""
echo "✅ ecosystem.config.js güncellendi"
echo ""
echo "📋 Eklenen environment variables:"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo "   - JWT_SECRET"
echo "   - OPENAI_API_KEY"
echo "   - N8N_WEBHOOK_URL"
echo "   - N8N_MCP_SERVER_URL"
echo "   - N8N_MCP_ACCESS_TOKEN"
echo "   - N8N_BASE_URL"
echo "   - N8N_API_KEY"
echo "   - HOSTNAME"
echo ""
echo "🔄 PM2'yi restart ediliyor..."
pm2 restart thunder-erp

echo ""
echo "✅ Tamamlandı!"
echo ""
echo "🧪 Test edin:"
echo "   curl http://192.168.1.250:3000/api/ai/n8n-mcp"
echo ""

