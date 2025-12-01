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

# 1. Git pull (çakışmaları çöz)
echo -e "${YELLOW}📥 Git'ten son değişiklikler çekiliyor...${NC}"

# Yerel değişiklikleri kontrol et ve stash et
if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Yerel değişiklikler tespit edildi, stash ediliyor...${NC}"
    git stash save "Deploy öncesi yerel değişiklikler - $(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
fi

# Remote'tan son değişiklikleri çek
echo -e "${YELLOW}📥 Remote'tan değişiklikler çekiliyor...${NC}"
git fetch origin main

# Remote'u tercih et (production'da remote her zaman doğru kaynak)
echo -e "${YELLOW}🔄 Remote değişiklikleri uygulanıyor...${NC}"
git reset --hard origin/main

echo -e "${GREEN}✅ Git güncellemesi tamamlandı${NC}"

# 2. PM2'yi durdur (dosyalar kilitli olabilir)
echo -e "${YELLOW}⏹️  PM2 durduruluyor (dosyalar kilitli olabilir)...${NC}"
pm2 stop thunder-erp 2>/dev/null || echo "PM2'de uygulama çalışmıyor veya zaten durdurulmuş"

# Kısa bir bekleme (dosyaların serbest bırakılması için)
sleep 2

# 3. Cache temizleme
echo -e "${YELLOW}🧹 Cache temizleniyor...${NC}"
# Erişim engellendi durumunda sudo kullan veya sahiplik kontrolü yap
if [ -d ".next" ]; then
    # Önce sahiplik kontrolü
    if [ ! -w ".next" ]; then
        echo "İzin sorunu var, sahiplik düzeltiliyor..."
        sudo chown -R $USER:$USER .next 2>/dev/null || true
    fi
    rm -rf .next || sudo rm -rf .next
fi
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .turbo 2>/dev/null || true

# 4. Dependencies kontrol
echo -e "${YELLOW}📦 Dependencies kontrol ediliyor...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Node modules yok, yükleniyor..."
    npm install
else
    echo "Node modules mevcut, güncelleniyor..."
    npm install
fi

# 5. Build
echo -e "${YELLOW}🔨 Production build oluşturuluyor...${NC}"
npm run build

# 6. PM2 restart
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

