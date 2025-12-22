#!/bin/bash

# ============================================
# Tüm Workflow'ları Test Et
# ============================================

echo "🧪 Tüm n8n Workflow'ları Test"
echo "======================================"
echo ""

BASE_URL="http://192.168.1.250:3000"

# Test fonksiyonu
test_workflow() {
    local workflow=$1
    local prompt=$2
    local context=${3:-"{}"}
    
    echo "Testing: $workflow"
    echo "--------------------------------------"
    
    RESPONSE=$(curl -s --max-time 60 -X POST "$BASE_URL/api/ai/n8n" \
      -H "Content-Type: application/json" \
      -d "{
        \"workflow\": \"$workflow\",
        \"prompt\": \"$prompt\",
        \"context\": $context
      }")
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 -X POST "$BASE_URL/api/ai/n8n" \
      -H "Content-Type: application/json" \
      -d "{
        \"workflow\": \"$workflow\",
        \"prompt\": \"$prompt\",
        \"context\": $context
      }")
    
    echo "HTTP Status: $HTTP_CODE"
    
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo "✅ $workflow çalışıyor!"
        echo "$RESPONSE" | jq '.result.agent, .result.success' 2>/dev/null || echo "Response: OK"
    else
        echo "❌ $workflow hatası!"
        echo "$RESPONSE" | jq '.error, .message' 2>/dev/null || echo "$RESPONSE"
    fi
    
    echo ""
}

echo "1️⃣  Planning Agent:"
echo "======================================"
test_workflow "planning" "100 adet Ürün A için üretim planı oluştur"

echo "2️⃣  Production Agent:"
echo "======================================"
test_workflow "production" "Üretim planı #123 için operatör ataması yap"

echo "3️⃣  Warehouse Agent:"
echo "======================================"
test_workflow "warehouse" "Zone A stok durumunu analiz et"

echo "4️⃣  Purchase Agent:"
echo "======================================"
test_workflow "purchase" "Malzeme X için tedarikçi analizi yap"

echo "5️⃣  Manager Agent:"
echo "======================================"
test_workflow "manager" "Kritik sipariş #456 için onay kararı ver"

echo "6️⃣  Developer Agent:"
echo "======================================"
test_workflow "developer" "Sistem performansını analiz et ve optimizasyon öner"

echo ""
echo "======================================"
echo "✅ Tüm Testler Tamamlandı!"
echo "======================================"
echo ""

