#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIyMjhlMDEzNy04MThmLTQyMzUtOWY2Ni1mY2I2OTQ5OTgyNjciLCJlbWFpbCI6ImFkbWluQHRodW5kZXIuY29tIiwicm9sZSI6InlvbmV0aWNpIiwiZXhwIjoxNzY3MDAxMTAzfQ.ZvLS6oRR4PFNy5uyWQ1QRw0He9fGFOjfJrhWaO9LwO4"
PLAN_ID="4307f259-5d9e-4f34-9b01-e634b7b037f1"

echo "🧪 Testing Planning Agent Only"
echo "======================================"
echo ""

# Önce API'den prompt'u al
echo "1️⃣ Fetching prompt from API..."
PROMPT_DATA=$(curl -s -X POST http://localhost:3000/api/ai/n8n-consensus-with-data \
  -H 'Content-Type: application/json' \
  -H "Cookie: thunder_token=$TOKEN" \
  -d "{\"plan_id\": \"$PLAN_ID\"}" | jq -r '.prompt_generated')

if [ -z "$PROMPT_DATA" ] || [ "$PROMPT_DATA" == "null" ]; then
  echo "❌ Failed to fetch prompt from API"
  exit 1
fi

echo "✅ Prompt fetched"
echo ""

# Test prompt'u hazırla
TEST_PROMPT="Sipariş ORD-2025-400 için 1 adet TRX-1-BLACK-106-106 üretimi planlanacak.

SİPARİŞ BİLGİLERİ:
- Sipariş No: ORD-2025-400
- Müşteri: LTSAUTO
- Ürün: TRX-1-BLACK-106-106
- Planlanan Miktar: 1 adet
- Teslim Tarihi: 2025-12-23
- Öncelik: yuksek

BOM (Bill of Materials) ve STOK DURUMU:
✅ Tüm malzemeler stokta yeterli

ÜRETİM KAPASİTESİ:
- Toplam Operatör Sayısı: 2
- Toplam Günlük Kapasite: 250 adet/gün
- Aktif Üretim Planları: 4
- Aktif Üretim Miktarı: 5 adet
- Kullanılabilir Kapasite: 245 adet/gün

SORU:
Bu sipariş için üretim şimdi başlatılabilir mi? Planning Agent olarak değerlendir:
- APPROVED: Üretim başlatılabilir (tüm koşullar uygun)
- REJECTED: Üretim başlatılamaz (kritik sorunlar var)
- NEEDS_REVIEW: İnceleme gerekli (bazı koşullar belirsiz veya eksik)"

echo "2️⃣ Testing Planning Agent via n8n webhook..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:5678/webhook/test-planning-agent \
  -H 'Content-Type: application/json' \
  -d "{\"prompt\": \"$TEST_PROMPT\", \"plan_id\": \"$PLAN_ID\"}")

echo "📋 Response:"
echo "$RESPONSE" | jq '.'

echo ""
echo "3️⃣ Analysis:"
echo ""

DECISION=$(echo "$RESPONSE" | jq -r '.decision // "N/A"')
REASONING=$(echo "$RESPONSE" | jq -r '.reasoning // "N/A"')
CONFIDENCE=$(echo "$RESPONSE" | jq -r '.confidence // "N/A"')

echo "Decision: $DECISION"
echo "Confidence: $CONFIDENCE"
echo "Reasoning (first 200 chars): ${REASONING:0:200}..."
echo ""

if [ "$DECISION" != "N/A" ] && [ "$DECISION" != "null" ]; then
  echo "✅ Planning Agent çalışıyor!"
else
  echo "❌ Planning Agent çalışmıyor veya parse edilemedi"
  echo ""
  echo "Debug info:"
  echo "$RESPONSE" | jq '.debug // .rawContent // .'
fi
