#!/bin/bash

# ============================================
# Webhook Test with Timeout
# ============================================

echo "🧪 Webhook Test (with timeout)"
echo "======================================"
echo ""

echo "1️⃣  Production Webhook Test (30 saniye timeout):"
echo "======================================"
timeout 30 curl -v -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' \
  2>&1 | head -50

echo ""
echo ""
echo "2️⃣  Alternatif: Verbose Test:"
echo "======================================"
curl -v -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Test mesajı"}' \
  --max-time 30 \
  2>&1 | grep -E "HTTP|success|response|agent"

echo ""
echo ""
echo "======================================"
echo "💡 Notlar:"
echo "======================================"
echo ""
echo "Eğer response gelmiyorsa:"
echo "1. n8n UI'de Executions sekmesini kontrol edin"
echo "2. Respond to Webhook node'unun çalıştığını kontrol edin"
echo "3. Webhook timeout ayarlarını kontrol edin"
echo "4. n8n container logs'unu kontrol edin:"
echo "   sudo docker logs thunder-n8n --tail 50"
echo ""

