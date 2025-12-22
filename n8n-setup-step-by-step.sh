#!/bin/bash

# ============================================
# n8n Setup Step-by-Step Script
# Her adımı teyit ederek ilerler
# ============================================

echo "🚀 n8n Sıfırdan Kurulum - Adım Adım"
echo "======================================"
echo ""

cd /var/www/thunder-erp

# ADIM 1: Container Durumu
echo "✅ ADIM 1: n8n Container Durumu"
echo "======================================"
if sudo docker compose ps | grep -q "thunder-n8n.*Up"; then
    echo "✅ n8n container çalışıyor"
    sudo docker compose ps | grep n8n
else
    echo "❌ n8n container çalışmıyor, başlatılıyor..."
    sudo docker compose up -d n8n
    sleep 3
fi
echo ""

# ADIM 2: Health Check
echo "✅ ADIM 2: n8n Health Check"
echo "======================================"
HEALTH=$(curl -s http://192.168.1.250:5678/healthz)
if [ "$HEALTH" == '{"status":"ok"}' ]; then
    echo "✅ n8n health check başarılı: $HEALTH"
else
    echo "❌ n8n health check başarısız: $HEALTH"
    echo "💡 n8n container'ını kontrol edin"
fi
echo ""

# ADIM 3: Environment Variables Kontrolü
echo "✅ ADIM 3: Environment Variables Kontrolü"
echo "======================================"
if grep -q "N8N_WEBHOOK_URL" .env.local 2>/dev/null; then
    echo "✅ N8N_WEBHOOK_URL mevcut:"
    grep "N8N_WEBHOOK_URL" .env.local
else
    echo "⚠️  N8N_WEBHOOK_URL eksik, ekleniyor..."
    echo "" >> .env.local
    echo "# n8n Configuration" >> .env.local
    echo "N8N_WEBHOOK_URL=http://localhost:5678" >> .env.local
    echo "N8N_BASE_URL=http://192.168.1.250:5678" >> .env.local
    echo "✅ N8N değişkenleri eklendi"
fi
echo ""

# ADIM 4: PM2 Config Kontrolü
echo "✅ ADIM 4: PM2 Config Kontrolü"
echo "======================================"
if grep -q "N8N_WEBHOOK_URL" ecosystem.config.js 2>/dev/null; then
    echo "✅ PM2 config'de N8N değişkenleri var"
else
    echo "⚠️  PM2 config'de N8N değişkenleri yok, güncelleniyor..."
    if [ -f update-pm2-env.sh ]; then
        chmod +x update-pm2-env.sh
        ./update-pm2-env.sh
    else
        echo "⚠️  update-pm2-env.sh bulunamadı"
    fi
fi
echo ""

# ADIM 5: PM2 Restart
echo "✅ ADIM 5: PM2 Restart"
echo "======================================"
pm2 restart thunder-erp --update-env
sleep 3
PM2_STATUS=$(pm2 show thunder-erp 2>/dev/null | grep "status" | awk '{print $4}')
if [ "$PM2_STATUS" == "online" ]; then
    echo "✅ PM2 restart başarılı, status: $PM2_STATUS"
else
    echo "⚠️  PM2 status: $PM2_STATUS"
fi
echo ""

# ADIM 6: Özet
echo "======================================"
echo "✅ KURULUM ÖZETİ"
echo "======================================"
echo ""
echo "📍 n8n UI: http://192.168.1.250:5678"
echo "   Username: admin"
echo "   Password: Thunder2025!"
echo ""
echo "📍 Webhook URL: http://192.168.1.250:5678/webhook/planning-agent"
echo ""
echo "📍 Thunder ERP API: http://192.168.1.250:3000/api/ai/n8n"
echo ""
echo "📋 Sonraki Adımlar:"
echo "   1. n8n UI'ye giriş yapın"
echo "   2. OpenAI credential oluşturun"
echo "   3. Workflow oluşturun (docs/N8N_FRESH_SETUP_GUIDE.md)"
echo "   4. Workflow'u test edin"
echo "   5. Workflow'u aktifleştirin"
echo ""
echo "📚 Detaylı Rehber: docs/N8N_FRESH_SETUP_GUIDE.md"
echo ""

