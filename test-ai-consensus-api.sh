#!/bin/bash

# Test AI Consensus API with real Supabase data
# Usage: ./test-ai-consensus-api.sh [plan_id]

set -e

PLAN_ID="${1:-}"

if [ -z "$PLAN_ID" ]; then
  echo "🧪 AI Consensus API Test"
  echo "======================================"
  echo ""
  echo "Usage: ./test-ai-consensus-api.sh <plan_id>"
  echo ""
  echo "Example:"
  echo "  ./test-ai-consensus-api.sh 123e4567-e89b-12d3-a456-426614174000"
  echo ""
  echo "💡 To get a plan_id, first list production plans:"
  echo "  curl http://192.168.1.250:3000/api/production/plans"
  exit 1
fi

echo "🧪 AI Consensus API Test"
echo "======================================"
echo ""
echo "📋 Plan ID: $PLAN_ID"
echo ""

echo "1️⃣ Calling AI Consensus API..."
echo "--------------------------------------"

RESPONSE=$(curl -s -X POST http://192.168.1.250:3000/api/ai/n8n-consensus-with-data \
  -H "Content-Type: application/json" \
  -d "{\"plan_id\": \"$PLAN_ID\"}")

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

echo ""
echo "======================================"
echo "✅ Test completed!"
echo ""
echo "💡 Check the response above for:"
echo "   - consensus_result.finalDecision"
echo "   - consensus_result.agentResponses"
echo "   - bom_summary"
echo "   - production_capacity"

