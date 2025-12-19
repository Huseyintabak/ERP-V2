#!/bin/bash

# Thunder ERP - Nginx Setup Script
# Bu script Nginx reverse proxy yapılandırmasını yapar

set -e

echo "🔧 Thunder ERP - Nginx Kurulumu"
echo "================================"

# 1. Nginx yüklü mü kontrol et
if ! command -v nginx &> /dev/null; then
    echo "❌ Nginx yüklü değil!"
    echo "Kurulum için: sudo apt install nginx"
    exit 1
fi

# 2. Nginx config dosyasını kopyala
echo "📋 Nginx config dosyası kopyalanıyor..."
sudo cp nginx-thunder.conf /etc/nginx/sites-available/thunder-erp

# 3. Symlink oluştur (eğer yoksa)
if [ ! -L /etc/nginx/sites-enabled/thunder-erp ]; then
    echo "🔗 Symlink oluşturuluyor..."
    sudo ln -s /etc/nginx/sites-available/thunder-erp /etc/nginx/sites-enabled/
fi

# 4. Default site'ı devre dışı bırak (eğer varsa)
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "🔄 Default site devre dışı bırakılıyor..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# 5. Nginx config test et
echo "✅ Nginx config test ediliyor..."
sudo nginx -t

# 6. Nginx restart
echo "🔄 Nginx yeniden başlatılıyor..."
sudo systemctl restart nginx

# 7. Nginx status kontrol et
echo "📊 Nginx durumu:"
sudo systemctl status nginx --no-pager

echo ""
echo "✅ Nginx kurulumu tamamlandı!"
echo ""
echo "🌐 Artık şu adresten erişebilirsiniz:"
echo "   http://192.168.1.250/login"
echo ""
echo "📝 Log dosyaları:"
echo "   - Access: /var/log/nginx/thunder-erp-access.log"
echo "   - Error:  /var/log/nginx/thunder-erp-error.log"
echo ""

