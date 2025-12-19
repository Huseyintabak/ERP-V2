#!/bin/bash

# ThunderERP Server Deployment Script
# Sunucuda çalıştırılacak deployment script'i

set -e  # Hata durumunda durdur

echo "🚀 ThunderERP Server Deployment Başlıyor..."
echo ""

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Dizin kontrolü
if [ ! -d "/var/www/thunder-erp" ]; then
    echo -e "${RED}❌ /var/www/thunder-erp dizini bulunamadı!${NC}"
    exit 1
fi

cd /var/www/thunder-erp

# 2. Dosya sahipliğini düzelt
echo -e "${YELLOW}📁 Dosya sahipliği düzeltiliyor...${NC}"
sudo chown -R vipkrom:vipkrom .

# 3. Eski build ve cache'leri temizle
echo -e "${YELLOW}🧹 Eski build ve cache'ler temizleniyor...${NC}"
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true

# 4. Git pull (son değişiklikleri çek)
echo -e "${YELLOW}📥 Git'ten son değişiklikler çekiliyor...${NC}"
git pull origin main

# 5. Dependencies kontrol
echo -e "${YELLOW}📦 Dependencies kontrol ediliyor...${NC}"
npm install

# 6. Build
echo -e "${YELLOW}🔨 Production build oluşturuluyor...${NC}"
npm run build

# 7. Build klasörüne yazma izni ver
echo -e "${YELLOW}🔐 Build klasörüne yazma izni veriliyor...${NC}"
sudo chmod -R u+w .next

# 8. PM2 hard restart (stop + start for clean restart with env update)
echo -e "${YELLOW}🔄 PM2 ile uygulama yeniden başlatılıyor (hard restart + env update)...${NC}"
pm2 stop thunder-erp || true
sleep 2
pm2 start thunder-erp --update-env
sleep 3

# 9. Durum kontrolü
echo ""
echo -e "${GREEN}✅ Deployment tamamlandı!${NC}"
echo ""
echo "📊 Uygulama durumu:"
pm2 status thunder-erp

echo ""
echo "📝 Son 20 log satırı:"
pm2 logs thunder-erp --lines 20 --nostream

echo ""
echo -e "${YELLOW}⚠️  ÖNEMLİ: Browser cache temizleme${NC}"
echo "Browser'da şunları yapın:"
echo "  1. Hard Refresh: Ctrl+Shift+R (Windows/Linux) veya Cmd+Shift+R (Mac)"
echo "  2. Veya Developer Tools (F12) > Network > 'Disable cache' işaretleyin"
echo "  3. Veya Browser cache'i manuel temizleyin"
echo ""

