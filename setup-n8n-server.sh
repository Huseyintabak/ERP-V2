#!/bin/bash

# ============================================
# n8n Docker Setup Script (Server-side)
# Run this script directly on the server
# SSH: vipkrom@192.168.1.250
# Password: vip123
# ============================================

set -e  # Exit on error

echo "🚀 Thunder ERP + n8n Docker Setup"
echo "===================================="
echo ""

# ============================================
# 1. Check and Install Docker
# ============================================
echo "🐳 Step 1: Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Installing Docker..."
    
    # Update package list
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y \
      ca-certificates \
      curl \
      gnupg \
      lsb-release
    
    # Add Docker's official GPG key
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # Set up Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    echo "✅ Docker installed successfully!"
    echo "⚠️  You may need to log out and log back in for docker group changes to take effect"
else
    echo "✅ Docker is already installed"
    docker --version
fi

echo ""

# ============================================
# 2. Create n8n Data Directory
# ============================================
echo "📁 Step 2: Creating n8n data directory..."
mkdir -p ~/.n8n
echo "✅ n8n data directory created: ~/.n8n"

echo ""

# ============================================
# 3. Navigate to Thunder ERP Directory
# ============================================
echo "📂 Step 3: Navigating to Thunder ERP directory..."
cd /var/www/thunder-erp
echo "✅ Current directory: $(pwd)"

echo ""

# ============================================
# 4. Create Docker Compose File
# ============================================
echo "📝 Step 4: Creating docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    container_name: thunder-n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=Thunder2025!
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://192.168.1.250:5678/
      - GENERIC_TIMEZONE=Europe/Istanbul
      - TZ=Europe/Istanbul
      - N8N_LOG_LEVEL=info
      - N8N_LOG_OUTPUT=console
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
    volumes:
      - ~/.n8n:/home/node/.n8n
    networks:
      - thunder-network

networks:
  thunder-network:
    name: thunder-network
    driver: bridge
EOF

echo "✅ docker-compose.yml created"

echo ""

# ============================================
# 5. Update .env.local
# ============================================
echo "⚙️  Step 5: Updating .env.local..."

# Backup existing .env.local
if [ -f .env.local ]; then
    cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
    echo "📦 Backed up .env.local"
fi

# Add/update N8N_WEBHOOK_URL
if grep -q "N8N_WEBHOOK_URL" .env.local 2>/dev/null; then
    sed -i 's|N8N_WEBHOOK_URL=.*|N8N_WEBHOOK_URL=http://localhost:5678|' .env.local
    echo "✅ Updated N8N_WEBHOOK_URL in .env.local"
else
    echo "" >> .env.local
    echo "# n8n Workflow Integration" >> .env.local
    echo "N8N_WEBHOOK_URL=http://localhost:5678" >> .env.local
    echo "✅ Added N8N_WEBHOOK_URL to .env.local"
fi

echo ""

# ============================================
# 6. Pull Latest Code
# ============================================
echo "📥 Step 6: Pulling latest code from Git..."
git pull origin main
echo "✅ Code updated"

echo ""

# ============================================
# 7. Install Dependencies & Build
# ============================================
echo "📦 Step 7: Installing dependencies and building..."
npm install
echo "✅ Dependencies installed"

echo ""

echo "🔨 Building Next.js..."
rm -rf .next
npm run build
echo "✅ Build complete"

echo ""

# ============================================
# 8. Start n8n with Docker Compose
# ============================================
echo "🚀 Step 8: Starting n8n container..."

# Stop existing container if running
docker compose down 2>/dev/null || true

# Pull latest n8n image
docker compose pull

# Start n8n
docker compose up -d

# Wait for container to be ready
echo "⏳ Waiting for n8n to start..."
sleep 5

# Check container status
docker compose ps

echo "✅ n8n container started"

echo ""

# ============================================
# 9. Restart Thunder ERP
# ============================================
echo "🔄 Step 9: Restarting Thunder ERP with PM2..."
pm2 restart thunder-erp

# Wait a bit for PM2 to restart
sleep 3

pm2 list | grep thunder-erp

echo "✅ Thunder ERP restarted"

echo ""

# ============================================
# 10. Configure Nginx (Optional)
# ============================================
echo "🌐 Step 10: Nginx configuration (optional)..."
echo "Creating Nginx config for n8n..."

sudo tee /etc/nginx/sites-available/n8n.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name n8n.thunder-erp.local 192.168.1.250;

    client_max_body_size 100M;

    location /n8n/ {
        proxy_pass http://localhost:5678/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running workflows
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    access_log /var/log/nginx/n8n-access.log;
    error_log /var/log/nginx/n8n-error.log;
}
EOF

# Enable n8n site (optional, don't overwrite existing config)
sudo ln -sf /etc/nginx/sites-available/n8n.conf /etc/nginx/sites-enabled/n8n.conf 2>/dev/null || echo "⚠️  Nginx config already exists"

# Test Nginx config
if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "✅ Nginx configured and reloaded"
else
    echo "⚠️  Nginx config test failed (skipping reload)"
fi

echo ""

# ============================================
# 11. Health Checks
# ============================================
echo "🏥 Step 11: Running health checks..."
echo ""

# Check n8n container
echo "📊 n8n Container Status:"
docker compose ps | grep n8n || echo "⚠️  n8n container not found"
echo ""

# Check n8n logs (last 10 lines)
echo "📊 n8n Logs (last 10 lines):"
docker compose logs --tail=10 n8n
echo ""

# Check Thunder ERP PM2
echo "📊 Thunder ERP PM2 Status:"
pm2 list | grep thunder-erp || echo "⚠️  Thunder ERP not found in PM2"
echo ""

# Check n8n health
echo "📊 n8n Health Check:"
sleep 3
if curl -s http://localhost:5678/healthz > /dev/null; then
    echo "✅ n8n is healthy"
else
    echo "⚠️  n8n health check failed (may still be starting...)"
fi
echo ""

# Check Thunder ERP API
echo "📊 Thunder ERP n8n Integration Check:"
if curl -s http://localhost:3000/api/ai/n8n > /dev/null; then
    echo "✅ Thunder ERP API is responding"
else
    echo "⚠️  Thunder ERP API not responding yet"
fi
echo ""

# ============================================
# 12. Display Access Information
# ============================================
echo "============================================"
echo "✅ SETUP COMPLETE!"
echo "============================================"
echo ""
echo "📍 Access URLs:"
echo ""
echo "🌐 Thunder ERP:"
echo "   http://192.168.1.250"
echo "   http://192.168.1.250/ai-agent-builder"
echo ""
echo "🔧 n8n Workflow Editor:"
echo "   http://192.168.1.250:5678"
echo "   Username: admin"
echo "   Password: Thunder2025!"
echo ""
echo "📡 n8n Webhook Base URL:"
echo "   http://192.168.1.250:5678/webhook/"
echo ""
echo "============================================"
echo "📚 Next Steps:"
echo "============================================"
echo ""
echo "1. Access n8n UI:"
echo "   Open browser: http://192.168.1.250:5678"
echo "   Login: admin / Thunder2025!"
echo ""
echo "2. Add Credentials in n8n:"
echo "   Settings → Credentials → Add Credential"
echo ""
echo "   a) OpenAI:"
echo "      - Type: OpenAI"
echo "      - API Key: sk-proj-..."
echo ""
echo "   b) PostgreSQL (Supabase):"
echo "      - Type: Postgres"
echo "      - Host: db.unodzubpvymgownyjrgz.supabase.co"
echo "      - Database: postgres"
echo "      - User: postgres"
echo "      - Port: 5432"
echo "      - SSL: true"
echo ""
echo "3. Import Workflow:"
echo "   Workflows → Import from JSON"
echo "   Copy from: /var/www/thunder-erp/docs/N8N_AGENT_WORKFLOWS.md"
echo ""
echo "4. Test from Thunder ERP:"
echo "   curl -X POST http://192.168.1.250:3000/api/ai/n8n \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"workflow\":\"planning\",\"prompt\":\"Test\"}'"
echo ""
echo "============================================"
echo "🐳 Useful Docker Commands:"
echo "============================================"
echo ""
echo "View n8n logs:"
echo "   docker compose logs -f n8n"
echo ""
echo "Restart n8n:"
echo "   docker compose restart n8n"
echo ""
echo "Stop n8n:"
echo "   docker compose down"
echo ""
echo "Start n8n:"
echo "   docker compose up -d"
echo ""
echo "Check container status:"
echo "   docker compose ps"
echo ""
echo "============================================"
echo "🎉 Happy automating with Thunder ERP + n8n!"
echo "============================================"

