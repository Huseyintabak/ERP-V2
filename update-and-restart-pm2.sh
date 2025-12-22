#!/bin/bash

# ============================================
# Update Code and Restart PM2
# ============================================

echo "🔄 Code Update ve PM2 Restart"
echo "======================================"
echo ""

echo "1️⃣  Git Pull:"
echo "======================================"
git pull origin main

echo ""
echo "2️⃣  Build:"
echo "======================================"
npm run build

echo ""
echo "3️⃣  PM2 Restart:"
echo "======================================"
pm2 restart thunder-erp --update-env

echo ""
echo "4️⃣  PM2 Status:"
echo "======================================"
pm2 status

echo ""
echo "5️⃣  Available Workflows Test:"
echo "======================================"
sleep 3
curl -s http://192.168.1.250:3000/api/ai/n8n | jq '.availableWorkflows' 2>/dev/null || curl -s http://192.168.1.250:3000/api/ai/n8n

echo ""
echo ""
echo "======================================"
echo "✅ Tamamlandı!"
echo "======================================"
echo ""

