#!/bin/bash

# Sunucuda çalıştırılacak script
# Kullanım: ./pull-and-test.sh

echo "🚀 Pulling latest code and running test"
echo "========================================"
echo ""

# Git pull
echo "1️⃣ Pulling from git..."
git pull origin main

if [ $? -ne 0 ]; then
  echo "❌ Git pull failed"
  exit 1
fi

echo "✅ Code pulled successfully"
echo ""

# Test script'i executable yap
echo "2️⃣ Making test script executable..."
chmod +x test-multi-agent-consensus.sh

echo "✅ Script is executable"
echo ""

# Test script'i çalıştır
echo "3️⃣ Running multi-agent consensus test..."
echo ""

./test-multi-agent-consensus.sh

echo ""
echo "========================================"
echo "✅ Done!"

