#!/bin/bash

# ThunderERP Deployment Script
# Ubuntu sunucuda çalıştırılacak

set -e  # Hata durumunda durdur

echo "🚀 ThunderERP Deployment Başlıyor..."
echo ""

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Git pull
echo -e "${YELLOW}📥 Git'ten son değişiklikler çekiliyor...${NC}"
git pull origin main

# 2. Cache temizleme
echo -e "${YELLOW}🧹 Cache temizleniyor...${NC}"
rm -rf .next
rm -rf node_modules/.cache

# 3. Dependencies kontrol
echo -e "${YELLOW}📦 Dependencies kontrol ediliyor...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Node modules yok, yükleniyor..."
    npm install
else
    echo "Node modules mevcut, güncelleniyor..."
    npm install
fi

# 4. Build
echo -e "${YELLOW}🔨 Production build oluşturuluyor...${NC}"
npm run build

# 5. PM2 restart
echo -e "${YELLOW}🔄 PM2 ile uygulama yeniden başlatılıyor...${NC}"
if pm2 list | grep -q "thunder-erp"; then
    pm2 restart thunder-erp
    echo -e "${GREEN}✅ Uygulama yeniden başlatıldı${NC}"
else
    echo -e "${YELLOW}⚠️  PM2'de uygulama bulunamadı, başlatılıyor...${NC}"
    pm2 start npm --name "thunder-erp" -- start
    pm2 save
    echo -e "${GREEN}✅ Uygulama başlatıldı${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deployment tamamlandı!${NC}"
echo ""
echo "📊 Uygulama durumu:"
pm2 status thunder-erp
echo ""
echo "📝 Logları görmek için: pm2 logs thunder-erp"
echo "🔄 Restart için: pm2 restart thunder-erp"
echo "⏹️  Durdurmak için: pm2 stop thunder-erp"

