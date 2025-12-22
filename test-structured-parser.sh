#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIyMjhlMDEzNy04MThmLTQyMzUtOWY2Ni1mY2I2OTQ5OTgyNjciLCJlbWFpbCI6ImFkbWluQHRodW5kZXIuY29tIiwicm9sZSI6InlvbmV0aWNpIiwiZXhwIjoxNzY3MDAxMTAzfQ.ZvLS6oRR4PFNy5uyWQ1QRw0He9fGFOjfJrhWaO9LwO4"
PLAN_ID="4307f259-5d9e-4f34-9b01-e634b7b037f1"

echo "🧪 Testing Structured Parser Workflow"
echo "======================================"
echo ""

echo "📋 Plan ID: $PLAN_ID"
echo ""

echo "1️⃣ Testing API endpoint..."
curl -s -X POST http://localhost:3000/api/ai/n8n-consensus-with-data \
  -H 'Content-Type: application/json' \
  -H "Cookie: thunder_token=$TOKEN" \
  -d "{\"plan_id\": \"$PLAN_ID\"}" | jq '{
    success: .success,
    finalDecision: .consensus_result.finalDecision,
    warehouseDecision: (.consensus_result.agentResponses[] | select(.name == "Warehouse") | .decision),
    warehouseReasoning: (.consensus_result.agentResponses[] | select(.name == "Warehouse") | .reasoning),
    allAgents: .consensus_result.agentResponses
  }'

echo ""
echo ""
echo "2️⃣ Full response (for debugging)..."
curl -s -X POST http://localhost:3000/api/ai/n8n-consensus-with-data \
  -H 'Content-Type: application/json' \
  -H "Cookie: thunder_token=$TOKEN" \
  -d "{\"plan_id\": \"$PLAN_ID\"}" | jq '.consensus_result'
