#!/bin/bash

# Quick deploy script for AI Consensus API
# Run this on the server

set -e

cd /var/www/thunder-erp

echo "🚀 AI Consensus API Deployment"
echo "======================================"
echo ""

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Building production bundle..."
npm run build

echo ""
echo "3️⃣ Restarting PM2..."
pm2 restart thunder-erp --update-env

echo ""
echo "4️⃣ Checking PM2 status..."
pm2 status thunder-erp

echo ""
echo "======================================"
echo "✅ Deployment completed!"
echo ""
echo "🧪 Test the API:"
echo "  curl -X POST http://192.168.1.250:3000/api/ai/n8n-consensus-with-data \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"plan_id\": \"your-plan-id\"}'"
echo ""
echo "💡 To get a plan_id, first list production plans:"
echo "  curl http://192.168.1.250:3000/api/production/plans | jq '.[0].id'"

