#!/bin/bash

# ============================================
# Fix n8n Secure Cookie Issue
# ============================================

echo "🔧 n8n Secure Cookie Sorununu Düzeltiyorum..."
echo ""

cd /var/www/thunder-erp

# docker-compose.yml'e N8N_SECURE_COOKIE=false ekle
if ! grep -q "N8N_SECURE_COOKIE" docker-compose.yml; then
    echo "1. docker-compose.yml'e N8N_SECURE_COOKIE=false ekliyorum..."
    sed -i '/WEBHOOK_URL=/a\      - N8N_SECURE_COOKIE=false' docker-compose.yml
    echo "✅ N8N_SECURE_COOKIE=false eklendi"
else
    echo "✅ N8N_SECURE_COOKIE zaten var"
fi

# Container'ı yeniden başlat
echo ""
echo "2. Container'ı yeniden başlatıyorum..."
sudo docker compose down
sudo docker compose up -d

echo ""
echo "3. Container'ın başlamasını bekliyorum..."
sleep 5

echo ""
echo "============================================"
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "📍 n8n'e erişim:"
echo "   http://192.168.1.250:5678"
echo ""
echo "🔐 Login:"
echo "   Username: admin"
echo "   Password: Thunder2025!"
echo ""

