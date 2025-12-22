#!/bin/bash

# Sunucuya test script'ini çekme ve çalıştırma
# Kullanım: ./deploy-test-script.sh

echo "🚀 Deploying Multi-Agent Consensus Test Script"
echo "=============================================="
echo ""

# Sunucu bilgileri (gerekirse değiştir)
SERVER_USER="${SERVER_USER:-vipkrom}"
SERVER_HOST="${SERVER_HOST:-192.168.1.250}"
SERVER_PATH="${SERVER_PATH:-/var/www/thunder-erp}"

echo "📋 Server Info:"
echo "   User: $SERVER_USER"
echo "   Host: $SERVER_HOST"
echo "   Path: $SERVER_PATH"
echo ""

# 1. Git pull
echo "1️⃣ Pulling latest code from git..."
echo "   ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && git pull origin main'"
echo ""

ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && git pull origin main"

if [ $? -ne 0 ]; then
  echo "❌ Git pull failed"
  exit 1
fi

echo "✅ Code pulled successfully"
echo ""

# 2. Test script'i executable yap
echo "2️⃣ Making test script executable..."
echo "   ssh $SERVER_USER@$SERVER_HOST 'chmod +x $SERVER_PATH/test-multi-agent-consensus.sh'"
echo ""

ssh $SERVER_USER@$SERVER_HOST "chmod +x $SERVER_PATH/test-multi-agent-consensus.sh"

if [ $? -ne 0 ]; then
  echo "⚠️  Failed to make script executable (may already be executable)"
else
  echo "✅ Script is now executable"
fi

echo ""

# 3. Test script'i çalıştır
echo "3️⃣ Running test script..."
echo "   ssh $SERVER_USER@$SERVER_HOST 'cd $SERVER_PATH && ./test-multi-agent-consensus.sh'"
echo ""

ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH && ./test-multi-agent-consensus.sh"

echo ""
echo "=============================================="
echo "✅ Deployment completed!"
echo ""

