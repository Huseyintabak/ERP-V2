#!/bin/bash

# ============================================
# Nginx ve Network Kontrolü
# ============================================

echo "🔍 Nginx ve Network Kontrolü"
echo "======================================"
echo ""

echo "1️⃣  Nginx Status:"
echo "======================================"
sudo systemctl status nginx --no-pager | head -20

echo ""
echo "2️⃣  Nginx Config Kontrolü:"
echo "======================================"
if [ -f /etc/nginx/sites-enabled/nginx-thunder.conf ]; then
    echo "✅ nginx-thunder.conf mevcut"
    echo ""
    cat /etc/nginx/sites-enabled/nginx-thunder.conf
else
    echo "❌ nginx-thunder.conf bulunamadı!"
    echo ""
    echo "Mevcut config dosyaları:"
    ls -la /etc/nginx/sites-enabled/
fi

echo ""
echo "3️⃣  Port Kontrolü:"
echo "======================================"
echo "Port 80 (Nginx):"
ss -tulpn | grep :80 || echo "⚠️  Port 80 dinlenmiyor"
echo ""
echo "Port 3000 (Next.js):"
ss -tulpn | grep :3000 || echo "⚠️  Port 3000 dinlenmiyor"

echo ""
echo "4️⃣  Network Interface Kontrolü:"
echo "======================================"
ip addr show | grep -E "inet.*192.168.1.250" || echo "⚠️  192.168.1.250 IP adresi bulunamadı"

echo ""
echo "5️⃣  Nginx Test:"
echo "======================================"
curl -I http://192.168.1.250 2>&1 | head -10

echo ""
echo "6️⃣  Next.js Direct Test:"
echo "======================================"
curl -I http://192.168.1.250:3000 2>&1 | head -10

echo ""
echo "======================================"
echo "✅ Kontrol Tamamlandı!"
echo "======================================"
echo ""

