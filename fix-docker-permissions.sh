#!/bin/bash

# ============================================
# Quick Fix: Docker Permissions + Start n8n
# Run this on the server if you get permission errors
# ============================================

set -e

echo "🔧 Fixing Docker Permissions and Starting n8n..."
echo ""

cd /var/www/thunder-erp

# Add user to docker group
echo "1. Adding user to docker group..."
sudo usermod -aG docker $USER

# Check if docker-compose.yml exists
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found. Run setup-n8n-server.sh first!"
    exit 1
fi

# Use sudo for docker commands (since group change requires logout)
echo "2. Starting n8n with sudo..."
sudo docker compose down 2>/dev/null || true
sudo docker compose pull
sudo docker compose up -d

echo "3. Waiting for n8n to start..."
sleep 5

echo "4. Checking n8n status..."
sudo docker compose ps

echo ""
echo "✅ n8n should now be running!"
echo ""
echo "📍 Access n8n at: http://192.168.1.250:5678"
echo "   Username: admin"
echo "   Password: Thunder2025!"
echo ""
echo "⚠️  Note: For future docker commands without sudo, logout and login again"
echo "   Or use: sudo docker compose <command>"

