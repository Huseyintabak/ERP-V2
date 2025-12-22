#!/bin/bash

# Test için gerekli bilgiler
TOKEN="${THUNDER_TOKEN:-eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIyMjhlMDEzNy04MThmLTQyMzUtOWY2Ni1mY2I2OTQ5OTgyNjciLCJlbWFpbCI6ImFkbWluQHRodW5kZXIuY29tIiwicm9sZSI6InlvbmV0aWNpIiwiZXhwIjoxNzY3MDAxMTAzfQ.ZvLS6oRR4PFNy5uyWQ1QRw0He9fGFOjfJrhWaO9LwO4}"
PLAN_ID="${PLAN_ID:-4307f259-5d9e-4f34-9b01-e634b7b037f1}"
THUNDER_API="${THUNDER_API:-http://localhost:3000}"
N8N_WEBHOOK="${N8N_WEBHOOK:-http://localhost:5678}"

echo "🧪 Testing Multi-Agent Consensus Workflow"
echo "=========================================="
echo ""
echo "📋 Test Parameters:"
echo "  Plan ID: $PLAN_ID"
echo "  Thunder API: $THUNDER_API"
echo "  n8n Webhook: $N8N_WEBHOOK"
echo ""

# 1. Thunder ERP API'den prompt'u al
echo "1️⃣ Fetching prompt and data from Thunder ERP API..."
echo "   POST $THUNDER_API/api/ai/n8n-consensus-with-data"
echo ""

API_RESPONSE=$(curl -s -X POST "$THUNDER_API/api/ai/n8n-consensus-with-data" \
  -H 'Content-Type: application/json' \
  -H "Cookie: thunder_token=$TOKEN" \
  -d "{\"plan_id\": \"$PLAN_ID\"}")

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to Thunder ERP API"
  exit 1
fi

# API response'u kontrol et
API_ERROR=$(echo "$API_RESPONSE" | jq -r '.error // empty')
if [ -n "$API_ERROR" ]; then
  echo "❌ API Error: $API_ERROR"
  echo "$API_RESPONSE" | jq '.'
  exit 1
fi

PROMPT=$(echo "$API_RESPONSE" | jq -r '.prompt_generated // empty')
if [ -z "$PROMPT" ] || [ "$PROMPT" == "null" ]; then
  echo "❌ Failed to fetch prompt from API"
  echo "$API_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Prompt fetched successfully"
echo "   Prompt length: ${#PROMPT} characters"
echo ""

# 2. n8n webhook'una istek gönder
echo "2️⃣ Calling n8n Multi-Agent Consensus Webhook..."
echo "   POST $N8N_WEBHOOK/webhook/multi-agent-consensus"
echo ""

START_TIME=$(date +%s)

WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$N8N_WEBHOOK/webhook/multi-agent-consensus" \
  -H 'Content-Type: application/json' \
  -d "{\"prompt\": $(echo "$PROMPT" | jq -Rs .), \"plan_id\": \"$PLAN_ID\"}")

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# HTTP status code'u ayır
HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$WEBHOOK_RESPONSE" | sed '$d')

echo "⏱️  Execution time: ${DURATION}s"
echo "📊 HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Webhook returned error status: $HTTP_CODE"
  echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
  exit 1
fi

# Response'u parse et
echo "3️⃣ Parsing Response..."
echo ""

# JSON parse kontrolü
if ! echo "$RESPONSE_BODY" | jq empty 2>/dev/null; then
  echo "❌ Invalid JSON response"
  echo "$RESPONSE_BODY"
  exit 1
fi

# Response'u göster
echo "📋 Full Response:"
echo "$RESPONSE_BODY" | jq '.'
echo ""

# 4. Sonuçları analiz et
echo "4️⃣ Analysis:"
echo "=========================================="
echo ""

SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success // false')
FINAL_DECISION=$(echo "$RESPONSE_BODY" | jq -r '.finalDecision // "N/A"')
CONFIDENCE=$(echo "$RESPONSE_BODY" | jq -r '.confidence // "N/A"')
WORKFLOW=$(echo "$RESPONSE_BODY" | jq -r '.workflow // "N/A"')
PLAN_ID_RESPONSE=$(echo "$RESPONSE_BODY" | jq -r '.planId // "N/A"')

echo "✅ Success: $SUCCESS"
echo "📋 Workflow: $WORKFLOW"
echo "🎯 Final Decision: $FINAL_DECISION"
echo "📊 Confidence: $CONFIDENCE"
echo "🆔 Plan ID: $PLAN_ID_RESPONSE"
echo ""

# Consensus bilgileri
CONSENSUS=$(echo "$RESPONSE_BODY" | jq -r '.consensus // {}')
if [ "$CONSENSUS" != "{}" ] && [ "$CONSENSUS" != "null" ]; then
  APPROVE=$(echo "$RESPONSE_BODY" | jq -r '.consensus.approve // 0')
  REJECT=$(echo "$RESPONSE_BODY" | jq -r '.consensus.reject // 0')
  NEEDS_REVIEW=$(echo "$RESPONSE_BODY" | jq -r '.consensus.needs_review // 0')
  
  echo "📊 Consensus:"
  echo "   ✅ Approve: $APPROVE"
  echo "   ❌ Reject: $REJECT"
  echo "   ⚠️  Needs Review: $NEEDS_REVIEW"
  echo ""
fi

# Manager reasoning
MANAGER_REASONING=$(echo "$RESPONSE_BODY" | jq -r '.managerReasoning // "N/A"')
if [ "$MANAGER_REASONING" != "N/A" ] && [ "$MANAGER_REASONING" != "null" ]; then
  echo "💭 Manager Reasoning:"
  echo "   ${MANAGER_REASONING:0:200}..."
  echo ""
fi

# Agent responses
AGENT_RESPONSES=$(echo "$RESPONSE_BODY" | jq -r '.agentResponses // []')
if [ "$AGENT_RESPONSES" != "[]" ] && [ "$AGENT_RESPONSES" != "null" ]; then
  echo "🤖 Agent Responses:"
  echo ""
  
  echo "$RESPONSE_BODY" | jq -r '.agentResponses[]? | "   \(.name) Agent:"' | while read -r line; do
    echo "$line"
  done
  
  echo "$RESPONSE_BODY" | jq -r '.agentResponses[]? | "      Decision: \(.decision)\n      Confidence: \(.confidence)\n      Reasoning: \(.reasoning[0:100])...\n"' | while read -r line; do
    echo "$line"
  done
  
  echo ""
fi

# 5. Sonuç değerlendirmesi
echo "5️⃣ Result Evaluation:"
echo "=========================================="
echo ""

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Workflow executed successfully"
else
  echo "❌ Workflow execution failed"
fi

if [ "$FINAL_DECISION" != "N/A" ] && [ "$FINAL_DECISION" != "null" ]; then
  case "$FINAL_DECISION" in
    "approved")
      echo "✅ Final Decision: APPROVED - Production can proceed"
      ;;
    "rejected")
      echo "❌ Final Decision: REJECTED - Production cannot proceed"
      ;;
    "needs_review")
      echo "⚠️  Final Decision: NEEDS_REVIEW - Further investigation required"
      ;;
    *)
      echo "❓ Final Decision: $FINAL_DECISION (Unknown status)"
      ;;
  esac
else
  echo "❌ Final decision not found in response"
fi

echo ""
echo "=========================================="
echo "✅ Test completed!"
echo ""

