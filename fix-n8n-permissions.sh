#!/bin/bash

# ============================================
# Fix n8n Permission Issues
# ============================================

set -e

echo "🔧 n8n Permission Sorunlarını Düzeltiyorum..."
echo ""

cd /var/www/thunder-erp

# 1. Container'ı durdur
echo "1. Container'ı durduruyorum..."
sudo docker compose down

# 2. n8n dizinini temizle ve yeniden oluştur
echo "2. n8n dizinini düzeltiyorum..."
sudo rm -rf ~/.n8n
mkdir -p ~/.n8n
chmod 777 ~/.n8n

# 3. docker-compose.yml'i tamamen yeniden oluştur
echo "3. docker-compose.yml'i yeniden oluşturuyorum..."

# Host kullanıcısının UID'sini al
HOST_UID=$(id -u)
HOST_GID=$(id -g)

# docker-compose.yml'i tamamen yeniden oluştur
cat > docker-compose.yml << EOF
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: thunder-n8n
    restart: unless-stopped
    user: "${HOST_UID}:${HOST_GID}"
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=Thunder2025!
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://192.168.1.250:5678/
      - GENERIC_TIMEZONE=Europe/Istanbul
      - TZ=Europe/Istanbul
      - N8N_LOG_LEVEL=info
      - N8N_LOG_OUTPUT=console
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
    volumes:
      - ~/.n8n:/home/node/.n8n
    networks:
      - thunder-network

networks:
  thunder-network:
    name: thunder-network
    driver: bridge
EOF

echo "✅ docker-compose.yml yeniden oluşturuldu (User ID: ${HOST_UID}:${HOST_GID})"

# 4. Dizini host kullanıcısına ver
echo "4. Dizin sahipliğini ayarlıyorum..."
sudo chown -R ${HOST_UID}:${HOST_GID} ~/.n8n 2>/dev/null || true
chmod -R 755 ~/.n8n

# 5. Container'ı yeniden başlat
echo "5. Container'ı yeniden başlatıyorum..."
sudo docker compose up -d

# 6. Bekle
echo "6. Container'ın başlamasını bekliyorum..."
sleep 10

# 7. Logları kontrol et
echo ""
echo "7. Logları kontrol ediyorum..."
sudo docker compose logs --tail=20 n8n

echo ""
echo "============================================"
echo "✅ TAMAMLANDI!"
echo "============================================"
echo ""
echo "📍 n8n'e erişim:"
echo "   http://192.168.1.250:5678"
echo ""
echo "📊 Durum:"
echo "   sudo docker compose ps"
echo ""

