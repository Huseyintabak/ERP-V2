#!/bin/bash

# ============================================
# n8n Respond to Webhook Node Düzeltme Rehberi
# ============================================

echo "🔧 n8n Respond to Webhook Node Düzeltme"
echo "======================================"
echo ""
echo "Sorun: n8n UI'de response var ama terminal'de boş"
echo ""
echo "Çözüm:"
echo "======================================"
echo ""
echo "1. n8n UI'de workflow'u açın"
echo "2. Respond to Webhook node'una tıklayın"
echo "3. Response Body alanını kontrol edin"
echo ""
echo "Doğru Expression:"
echo "======================================"
echo ""
cat << 'EOF'
={{
  "success": true,
  "agent": "planning",
  "response": $json[0].message.content
}}
EOF
echo ""
echo ""
echo "ÖNEMLİ:"
echo "======================================"
echo "1. 'Fixed' yerine 'Expression' butonuna tıklayın"
echo "2. Expression modunda olmalı ({{ }} işaretleri görünmeli)"
echo "3. Save butonuna tıklayın"
echo ""
echo "Test:"
echo "======================================"
echo ""
echo "curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"prompt\": \"100 adet Ürün A için üretim planı oluştur\"}'"
echo ""
echo "Thunder ERP API Fix:"
echo "======================================"
echo ""
echo "cd /var/www/thunder-erp"
echo "git pull origin main"
echo "pm2 restart thunder-erp --update-env"
echo ""

