#!/bin/bash

# ============================================
# Check n8n Status and Health
# ============================================

echo "🔍 n8n Durum Kontrolü"
echo "===================="
echo ""

cd /var/www/thunder-erp

# 1. Container durumu
echo "1. Container Durumu:"
sudo docker compose ps
echo ""

# 2. Son loglar
echo "2. Son Loglar (20 satır):"
sudo docker compose logs --tail=20 n8n
echo ""

# 3. Health check
echo "3. Health Check:"
sleep 2
if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
    echo "✅ n8n sağlıklı ve çalışıyor!"
else
    echo "⚠️  n8n henüz hazır değil (başlatılıyor olabilir)"
    echo "   Biraz bekleyip tekrar deneyin"
fi
echo ""

# 4. Port kontrolü
echo "4. Port Kontrolü:"
if sudo ss -tlnp | grep -q ":5678"; then
    echo "✅ Port 5678 dinleniyor"
else
    echo "⚠️  Port 5678 dinlenmiyor"
fi
echo ""

# 5. Erişim bilgileri
echo "============================================"
echo "📍 Erişim Bilgileri:"
echo "============================================"
echo ""
echo "🌐 n8n UI:"
echo "   http://192.168.1.250:5678"
echo ""
echo "🔐 Login:"
echo "   Username: admin"
echo "   Password: Thunder2025!"
echo ""
echo "📡 Webhook Base URL:"
echo "   http://192.168.1.250:5678/webhook/"
echo ""

