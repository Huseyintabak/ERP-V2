#!/bin/bash

# ============================================
# n8n Webhook Test Script
# ============================================

echo "🧪 n8n Webhook Test"
echo "======================================"
echo ""

# n8n health check
echo "1️⃣  n8n Health Check:"
curl -s http://192.168.1.250:5678/healthz
echo ""
echo ""

# Test webhook (workflow aktif olmasa bile çalışır)
echo "2️⃣  Test Webhook (webhook-test):"
curl -X POST http://192.168.1.250:5678/webhook-test/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Production webhook (workflow aktif olmalı)
echo "3️⃣  Production Webhook (webhook):"
curl -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}' \
  -w "\nHTTP Status: %{http_code}\n"
echo ""

# Thunder ERP API test
echo "4️⃣  Thunder ERP API Test:"
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }'
echo ""
echo ""

echo "======================================"
echo "✅ Test Tamamlandı!"
echo "======================================"
echo ""
echo "💡 Notlar:"
echo "   - webhook-test: Workflow aktif olmasa bile çalışır"
echo "   - webhook: Workflow aktif olmalı (n8n UI'de Active toggle)"
echo "   - 404 hatası: Workflow aktif değil veya path yanlış"
echo ""

