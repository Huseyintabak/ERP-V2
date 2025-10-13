#!/bin/bash

###############################################################################
# ThunderV2 ERP - Ubuntu Server Deployment Script
# 
# Bu script Ubuntu 20.04+ sunucuya ThunderV2'yi production modunda deploy eder.
# 
# Kullanım:
#   1. Sunucuya SSH ile bağlan
#   2. Bu script'i çalıştır: bash deploy-ubuntu.sh
#
# Gereksinimler:
#   - Ubuntu 20.04+
#   - Root veya sudo yetkisi
#   - 2GB+ RAM
###############################################################################

set -e  # Hata durumunda durdur

echo "🚀 ThunderV2 ERP Deployment Başlıyor..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

###############################################################################
# 1. SISTEM GÜNCELLEMELERİ
###############################################################################
echo ""
print_info "Adım 1/10: Sistem güncellemeleri yapılıyor..."
sudo apt update
sudo apt upgrade -y
print_success "Sistem güncellemeleri tamamlandı"

###############################################################################
# 2. GEREKLI PAKETLER
###############################################################################
echo ""
print_info "Adım 2/10: Gerekli paketler yükleniyor..."
sudo apt install -y curl wget git build-essential nginx certbot python3-certbot-nginx ufw
print_success "Gerekli paketler yüklendi"

###############################################################################
# 3. NODE.JS KURULUMU
###############################################################################
echo ""
print_info "Adım 3/10: Node.js 18 LTS yükleniyor..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
else
    print_info "Node.js zaten yüklü: $(node -v)"
fi
print_success "Node.js yüklendi: $(node -v)"
print_success "npm yüklendi: $(npm -v)"

###############################################################################
# 4. PM2 KURULUMU
###############################################################################
echo ""
print_info "Adım 4/10: PM2 Process Manager yükleniyor..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    pm2 startup systemd -u $USER --hp /home/$USER
else
    print_info "PM2 zaten yüklü: $(pm2 -v)"
fi
print_success "PM2 yüklendi"

###############################################################################
# 5. UYGULAMA DİZİNİ OLUŞTURMA
###############################################################################
echo ""
print_info "Adım 5/10: Uygulama dizini hazırlanıyor..."
APP_DIR="/var/www/thunder-erp"
if [ ! -d "$APP_DIR" ]; then
    sudo mkdir -p $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
    print_success "Dizin oluşturuldu: $APP_DIR"
else
    print_info "Dizin zaten mevcut: $APP_DIR"
fi

###############################################################################
# 6. GIT CLONE
###############################################################################
echo ""
print_info "Adım 6/10: GitHub'dan kod çekiliyor..."
cd /var/www

# Eğer dizin varsa önce silelim
if [ -d "$APP_DIR/.git" ]; then
    print_info "Mevcut repo güncelleniyor..."
    cd $APP_DIR
    git pull origin main
else
    print_info "Repository klonlanıyor..."
    sudo rm -rf $APP_DIR
    git clone https://github.com/Huseyintabak/ERP-V2.git thunder-erp
    cd $APP_DIR
fi

print_success "Kod başarıyla çekildi"

###############################################################################
# 7. ENVIRONMENT VARIABLES
###############################################################################
echo ""
print_info "Adım 7/10: Environment variables ayarlanıyor..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  ENVIRONMENT VARIABLES GEREKLİ!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo ".env.local dosyası oluşturulacak."
echo "Lütfen şu bilgileri hazır bulundurun:"
echo ""
echo "  1. NEXT_PUBLIC_SUPABASE_URL"
echo "  2. NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  3. SUPABASE_SERVICE_ROLE_KEY"
echo "  4. JWT_SECRET (production için YENİ üretin!)"
echo ""
read -p "Devam etmek için Enter'a basın..."

# .env.local oluştur
cat > $APP_DIR/.env.local << 'ENVEOF'
# ThunderV2 Production Environment Variables

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# JWT Configuration (Production secret - DEV'DEN FARKLI OLMALI!)
JWT_SECRET=

# Application Environment
NODE_ENV=production

# Optional: Uncomment if needed
# JWT_EXPIRES_IN=7d
# DEFAULT_PAGE_SIZE=10
ENVEOF

print_info ".env.local dosyası oluşturuldu: $APP_DIR/.env.local"
print_error "ŞİMDİ DURDUR! .env.local dosyasını düzenle:"
echo ""
echo "  nano $APP_DIR/.env.local"
echo ""
read -p "Düzenleme tamamlandığında Enter'a basın..."

print_success "Environment variables ayarlandı"

###############################################################################
# 8. DEPENDENCIES & BUILD
###############################################################################
echo ""
print_info "Adım 8/10: Dependencies yükleniyor ve build yapılıyor..."
cd $APP_DIR
npm install
npm run build
print_success "Build başarılı!"

###############################################################################
# 9. PM2 İLE BAŞLATMA
###############################################################################
echo ""
print_info "Adım 9/10: PM2 ile uygulama başlatılıyor..."

# PM2 ecosystem dosyası oluştur
cat > $APP_DIR/ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [{
    name: 'thunder-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/thunder-erp',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/www/thunder-erp/logs/err.log',
    out_file: '/var/www/thunder-erp/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
PMEOF

# Logs dizini oluştur
mkdir -p $APP_DIR/logs

# PM2'yi başlat veya restart et
pm2 delete thunder-erp 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
sudo pm2 startup systemd -u $USER --hp /home/$USER

print_success "Uygulama PM2 ile başlatıldı!"

###############################################################################
# 10. NGINX REVERSE PROXY
###############################################################################
echo ""
print_info "Adım 10/10: Nginx reverse proxy ayarlanıyor..."

# Domain adını sor
echo ""
read -p "Domain adınız var mı? (evet/hayır): " HAS_DOMAIN

if [[ $HAS_DOMAIN == "evet" || $HAS_DOMAIN == "e" ]]; then
    read -p "Domain adınızı girin (örn: erp.example.com): " DOMAIN_NAME
    SERVER_NAME=$DOMAIN_NAME
else
    # IP adresi kullan
    SERVER_IP=$(curl -s ifconfig.me)
    SERVER_NAME=$SERVER_IP
    print_info "Domain yok, IP kullanılacak: $SERVER_IP"
fi

# Nginx config oluştur
sudo tee /etc/nginx/sites-available/thunder-erp > /dev/null << NGINXEOF
server {
    listen 80;
    server_name $SERVER_NAME;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Reverse proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files cache
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }

    # Max upload size
    client_max_body_size 10M;
}
NGINXEOF

# Nginx'i etkinleştir
sudo ln -sf /etc/nginx/sites-available/thunder-erp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx testi
sudo nginx -t

# Nginx'i restart et
sudo systemctl restart nginx
sudo systemctl enable nginx

print_success "Nginx yapılandırıldı!"

###############################################################################
# 11. FIREWALL
###############################################################################
echo ""
print_info "Firewall (UFW) ayarlanıyor..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

print_success "Firewall yapılandırıldı"

###############################################################################
# 12. SSL (OPSIYONEL)
###############################################################################
echo ""
if [[ $HAS_DOMAIN == "evet" || $HAS_DOMAIN == "e" ]]; then
    read -p "SSL sertifikası (Let's Encrypt) kurmak ister misiniz? (evet/hayır): " INSTALL_SSL
    
    if [[ $INSTALL_SSL == "evet" || $INSTALL_SSL == "e" ]]; then
        print_info "SSL sertifikası kuruluyor..."
        sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --register-unsafely-without-email
        print_success "SSL sertifikası kuruldu! HTTPS aktif."
    fi
fi

###############################################################################
# TAMAMLANDI!
###############################################################################
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 DEPLOYMENT BAŞARILI!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "ThunderV2 ERP başarıyla deploy edildi!"
echo ""
echo "📊 Deployment Bilgileri:"
echo "  Uygulama Dizini: $APP_DIR"
echo "  Node.js Version: $(node -v)"
echo "  PM2 Status: $(pm2 list | grep thunder-erp)"
echo ""
if [[ $HAS_DOMAIN == "evet" ]]; then
    if [[ $INSTALL_SSL == "evet" ]]; then
        echo "  🌐 URL: https://$DOMAIN_NAME"
    else
        echo "  🌐 URL: http://$DOMAIN_NAME"
    fi
else
    echo "  🌐 URL: http://$SERVER_IP"
fi
echo ""
echo "🔧 Yararlı Komutlar:"
echo "  PM2 status:    pm2 status"
echo "  PM2 logs:      pm2 logs thunder-erp"
echo "  PM2 restart:   pm2 restart thunder-erp"
echo "  PM2 stop:      pm2 stop thunder-erp"
echo "  Nginx test:    sudo nginx -t"
echo "  Nginx restart: sudo systemctl restart nginx"
echo ""
echo "📝 Sonraki Adımlar:"
echo "  1. Tarayıcıda uygulamayı test edin"
echo "  2. Default user'larla login deneyin"
echo "  3. Production şifrelerini değiştirin"
echo "  4. Database backup stratejisi oluşturun"
echo ""
print_success "Deployment tamamlandı! 🚀"

