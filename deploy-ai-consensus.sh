#!/bin/bash

# Deploy AI Consensus API to server
# Usage: ./deploy-ai-consensus.sh

set -e

echo "🚀 AI Consensus API Deployment"
echo "======================================"
echo ""

echo "1️⃣ Pulling latest code from git..."
ssh vipkrom@192.168.1.250 "cd /var/www/thunder-erp && git pull origin main"

echo ""
echo "2️⃣ Installing dependencies (if needed)..."
ssh vipkrom@192.168.1.250 "cd /var/www/thunder-erp && npm install"

echo ""
echo "3️⃣ Building production bundle..."
ssh vipkrom@192.168.1.250 "cd /var/www/thunder-erp && npm run build"

echo ""
echo "4️⃣ Restarting PM2..."
ssh vipkrom@192.168.1.250 "cd /var/www/thunder-erp && pm2 restart thunder-erp --update-env"

echo ""
echo "5️⃣ Checking PM2 status..."
ssh vipkrom@192.168.1.250 "pm2 status thunder-erp"

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
echo "  curl http://192.168.1.250:3000/api/production/plans"

