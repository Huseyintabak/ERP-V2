#!/bin/bash

# ============================================
# HEMEN ÇALIŞTIR: n8n'i Başlat
# Sunucuda bu script'i çalıştır
# ============================================

set -e

echo "🚀 n8n'i Başlatıyorum..."
echo ""

cd /var/www/thunder-erp

# 1. docker-compose.yml'i düzelt (version field'ı kaldır)
echo "1. docker-compose.yml'i düzeltiyorum..."
if grep -q "^version:" docker-compose.yml 2>/dev/null; then
    sed -i '/^version:/d' docker-compose.yml
    echo "✅ version field kaldırıldı"
fi

# 2. Docker grubuna ekle
echo "2. Docker grubuna ekliyorum..."
sudo usermod -aG docker $USER 2>/dev/null || true

# 3. Mevcut container'ı durdur
echo "3. Eski container'ı durduruyorum..."
sudo docker compose down 2>/dev/null || true

# 4. n8n image'ını çek
echo "4. n8n image'ını çekiyorum..."
sudo docker compose pull

# 5. n8n'i başlat
echo "5. n8n'i başlatıyorum..."
sudo docker compose up -d

# 6. Bekle
echo "6. Container'ın başlamasını bekliyorum..."
sleep 8

# 7. Durum kontrolü
echo ""
echo "7. Container durumu:"
sudo docker compose ps

echo ""
echo "8. n8n logları (son 15 satır):"
sudo docker compose logs --tail=15 n8n

echo ""
echo "9. Health check..."
sleep 2
if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
    echo "✅ n8n çalışıyor!"
else
    echo "⚠️  n8n henüz hazır değil, biraz daha bekleyin..."
    echo "   Logları kontrol edin: sudo docker compose logs -f n8n"
fi

echo ""
echo "============================================"
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "📍 n8n'e erişim:"
echo "   http://192.168.1.250:5678"
echo "   Username: admin"
echo "   Password: Thunder2025!"
echo ""
echo "📊 Durum kontrolü:"
echo "   sudo docker compose ps"
echo ""
echo "📋 Loglar:"
echo "   sudo docker compose logs -f n8n"
echo ""

