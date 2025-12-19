#!/bin/bash

# ============================================
# Fix n8n Permission Issues
# ============================================

# set -e kaldırıldı çünkü docker compose down hata verebilir

echo "🔧 n8n Permission Sorunlarını Düzeltiyorum..."
echo ""

cd /var/www/thunder-erp

# 0. Önce docker-compose.yml'i düzelt (eğer bozuksa)
echo "0. docker-compose.yml'i kontrol ediyorum..."

# Host kullanıcısının UID'sini al
HOST_UID=$(id -u)
HOST_GID=$(id -g)
HOME_DIR=$(eval echo ~$USER)
N8N_DIR="${HOME_DIR}/.n8n"

# docker-compose.yml'i tamamen yeniden oluştur (bozuk olabilir)
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
      - N8N_SECURE_COOKIE=false
      - GENERIC_TIMEZONE=Europe/Istanbul
      - TZ=Europe/Istanbul
      - N8N_LOG_LEVEL=info
      - N8N_LOG_OUTPUT=console
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
    volumes:
      - ${N8N_DIR}:/home/node/.n8n
    networks:
      - thunder-network

networks:
  thunder-network:
    name: thunder-network
    driver: bridge
EOF

echo "✅ docker-compose.yml yeniden oluşturuldu (User ID: ${HOST_UID}:${HOST_GID})"
echo ""

# 1. Container'ı durdur (artık docker-compose.yml düzgün)
echo "1. Container'ı durduruyorum..."
sudo docker compose down 2>/dev/null || echo "⚠️  Container zaten durmuş veya yok"

# 2. n8n dizinini temizle ve yeniden oluştur
echo "2. n8n dizinini düzeltiyorum..."
sudo rm -rf ${N8N_DIR}
mkdir -p ${N8N_DIR}
chmod 755 ${N8N_DIR}

# 3. Dizini host kullanıcısına ver
echo "3. Dizin sahipliğini ayarlıyorum..."
sudo chown -R ${HOST_UID}:${HOST_GID} ${N8N_DIR} 2>/dev/null || true
chmod -R 755 ${N8N_DIR}

# 4. Container'ı yeniden başlat
echo "4. Container'ı yeniden başlatıyorum..."
sudo docker compose up -d

# 5. Bekle
echo "5. Container'ın başlamasını bekliyorum..."
sleep 10

# 6. Logları kontrol et
echo ""
echo "6. Logları kontrol ediyorum..."
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

