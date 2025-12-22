#!/bin/bash

echo "🔍 n8n Durum Kontrolü"
echo "===================="
echo ""

# 1. Docker container durumu
echo "1️⃣ Docker Container Durumu:"
echo "----------------------------"
if docker ps | grep -q thunder-n8n; then
  echo "✅ n8n container çalışıyor"
  docker ps | grep thunder-n8n
else
  echo "❌ n8n container çalışmıyor!"
  echo ""
  echo "Çalışmayan container'lar:"
  docker ps -a | grep thunder-n8n || echo "Container bulunamadı"
fi
echo ""

# 2. n8n port kontrolü
echo "2️⃣ Port Kontrolü (5678):"
echo "-------------------------"
if netstat -tuln 2>/dev/null | grep -q ":5678" || ss -tuln 2>/dev/null | grep -q ":5678"; then
  echo "✅ Port 5678 dinleniyor"
else
  echo "❌ Port 5678 dinlenmiyor!"
fi
echo ""

# 3. n8n health check
echo "3️⃣ n8n Health Check:"
echo "-------------------"
if curl -s -f http://localhost:5678/healthz > /dev/null 2>&1; then
  echo "✅ n8n health check başarılı"
else
  echo "❌ n8n health check başarısız"
  echo "   URL: http://localhost:5678/healthz"
fi
echo ""

# 4. Webhook endpoint kontrolü
echo "4️⃣ Webhook Endpoint Kontrolü:"
echo "-----------------------------"
if curl -s -X POST http://localhost:5678/webhook/multi-agent-consensus -H "Content-Type: application/json" -d '{"test": true}' > /dev/null 2>&1; then
  echo "✅ Webhook endpoint erişilebilir"
else
  echo "⚠️  Webhook endpoint yanıt vermiyor (bu normal olabilir, workflow aktif olmayabilir)"
fi
echo ""

# 5. Environment variables kontrolü
echo "5️⃣ Environment Variables:"
echo "-------------------------"
if [ -f .env.local ]; then
  echo "📄 .env.local dosyası:"
  grep -E "N8N_|WEBHOOK" .env.local | grep -v "^#" || echo "N8N_* değişkenleri bulunamadı"
else
  echo "❌ .env.local dosyası bulunamadı!"
fi
echo ""

# 6. PM2 environment variables
echo "6️⃣ PM2 Environment Variables:"
echo "----------------------------"
if command -v pm2 > /dev/null 2>&1; then
  pm2 env thunder-erp | grep -E "N8N_|WEBHOOK" || echo "PM2'de N8N_* değişkenleri bulunamadı"
else
  echo "⚠️  PM2 bulunamadı"
fi
echo ""

# 7. Öneriler
echo "💡 Öneriler:"
echo "------------"
if ! docker ps | grep -q thunder-n8n; then
  echo "1. n8n container'ını başlatın:"
  echo "   cd /var/www/thunder-erp && docker compose up -d"
fi

if [ -f .env.local ] && ! grep -q "N8N_WEBHOOK_URL=http://localhost:5678" .env.local; then
  echo "2. .env.local dosyasına N8N_WEBHOOK_URL ekleyin:"
  echo "   echo 'N8N_WEBHOOK_URL=http://localhost:5678' >> .env.local"
fi

if command -v pm2 > /dev/null 2>&1; then
  echo "3. PM2'yi restart edin (environment variables'ı yüklemek için):"
  echo "   pm2 restart thunder-erp --update-env"
fi

echo ""
echo "✅ Kontrol tamamlandı!"
