#!/bin/bash

# Build sorunlarını düzelten script
# Ubuntu sunucuda build hatası alırsanız bu scripti çalıştırın

set -e

echo "🔧 Build sorunları düzeltiliyor..."
echo ""

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 1. PM2'yi durdur (varsa)
echo -e "${YELLOW}⏹️  PM2 durdurluyor...${NC}"
pm2 stop thunder-erp 2>/dev/null || echo "PM2'de uygulama çalışmıyor"

# 2. Tüm build ve cache dosyalarını temizle
echo -e "${YELLOW}🧹 Tüm cache ve build dosyaları temizleniyor...${NC}"
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# 3. Node modules tamamen temizle (opsiyonel - sorun devam ederse)
read -p "Node modules'u tamamen silip yeniden yüklemek istiyor musunuz? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🗑️  Node modules siliniyor...${NC}"
    rm -rf node_modules
    rm -rf package-lock.json
    
    echo -e "${YELLOW}📦 Dependencies yeniden yükleniyor...${NC}"
    npm install
fi

# 4. Build
echo -e "${YELLOW}🔨 Temiz build yapılıyor...${NC}"
npm run build

# 5. Build başarılı mı kontrol et
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build başarılı!${NC}"
    
    # PM2'yi başlat
    echo -e "${YELLOW}🚀 PM2 ile uygulama başlatılıyor...${NC}"
    pm2 start npm --name "thunder-erp" -- start
    pm2 save
    
    echo ""
    echo -e "${GREEN}✅ Uygulama başarıyla başlatıldı!${NC}"
    pm2 status thunder-erp
else
    echo -e "${RED}❌ Build hatası! Lütfen hata mesajlarını kontrol edin.${NC}"
    exit 1
fi

