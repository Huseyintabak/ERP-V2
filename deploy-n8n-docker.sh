#!/bin/bash

# ============================================
# Thunder ERP + n8n Docker Deployment Script
# Server: vipkrom@vipkrom-A4110:/var/www/thunder-erp
# ============================================

set -e  # Exit on error

echo "🚀 Thunder ERP + n8n Docker Deployment"
echo "========================================"
echo ""

# Configuration
SERVER_USER="vipkrom"
SERVER_HOST="vipkrom-A4110"
SERVER_PATH="/var/www/thunder-erp"
N8N_PORT=5678
N8N_WEBHOOK_PORT=5679
N8N_DATA_PATH="/home/$SERVER_USER/.n8n"

echo "📋 Configuration:"
echo "  Server: $SERVER_USER@$SERVER_HOST"
echo "  Path: $SERVER_PATH"
echo "  n8n Port: $N8N_PORT"
echo "  n8n Webhook Port: $N8N_WEBHOOK_PORT"
echo ""

# ============================================
# 1. Check Docker Installation
# ============================================
echo "🐳 Step 1: Checking Docker..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
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
  else
    echo "✅ Docker is already installed"
    docker --version
  fi
ENDSSH

echo ""

# ============================================
# 2. Create n8n Data Directory
# ============================================
echo "📁 Step 2: Creating n8n data directory..."
ssh $SERVER_USER@$SERVER_HOST << ENDSSH
  mkdir -p $N8N_DATA_PATH
  echo "✅ n8n data directory created: $N8N_DATA_PATH"
ENDSSH

echo ""

# ============================================
# 3. Create Docker Compose File
# ============================================
echo "📝 Step 3: Creating docker-compose.yml..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  cat > /var/www/thunder-erp/docker-compose.yml << 'EOF'
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
      - WEBHOOK_URL=http://localhost:5678/
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
ENDSSH

echo ""

# ============================================
# 4. Start n8n with Docker Compose
# ============================================
echo "🚀 Step 4: Starting n8n container..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  cd /var/www/thunder-erp
  
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
ENDSSH

echo ""

# ============================================
# 5. Update Thunder ERP Environment Variables
# ============================================
echo "⚙️  Step 5: Updating Thunder ERP .env.local..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  cd /var/www/thunder-erp
  
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
ENDSSH

echo ""

# ============================================
# 6. Deploy Thunder ERP Updates
# ============================================
echo "📦 Step 6: Deploying Thunder ERP updates..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  cd /var/www/thunder-erp
  
  # Git pull latest changes
  echo "📥 Pulling latest code..."
  git pull origin main
  
  # Install dependencies
  echo "📦 Installing dependencies..."
  npm install
  
  # Build Next.js
  echo "🔨 Building Next.js..."
  rm -rf .next
  npm run build
  
  # Restart PM2
  echo "🔄 Restarting Thunder ERP..."
  pm2 restart thunder-erp
  
  echo "✅ Thunder ERP deployed"
ENDSSH

echo ""

# ============================================
# 7. Configure Nginx for n8n
# ============================================
echo "🌐 Step 7: Configuring Nginx for n8n..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  # Create n8n Nginx config
  sudo tee /etc/nginx/sites-available/n8n.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name n8n.thunder-erp.local;

    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:5678;
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

    # Logging
    access_log /var/log/nginx/n8n-access.log;
    error_log /var/log/nginx/n8n-error.log;
}
EOF

  # Enable n8n site
  sudo ln -sf /etc/nginx/sites-available/n8n.conf /etc/nginx/sites-enabled/n8n.conf
  
  # Test Nginx config
  sudo nginx -t
  
  # Reload Nginx
  sudo systemctl reload nginx
  
  echo "✅ Nginx configured for n8n"
ENDSSH

echo ""

# ============================================
# 8. Health Checks
# ============================================
echo "🏥 Step 8: Running health checks..."
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  echo "Checking services..."
  echo ""
  
  # Check n8n container
  echo "📊 n8n Container Status:"
  docker compose ps | grep n8n
  echo ""
  
  # Check Thunder ERP PM2
  echo "📊 Thunder ERP PM2 Status:"
  pm2 list | grep thunder-erp
  echo ""
  
  # Check n8n health
  echo "📊 n8n Health Check:"
  sleep 3
  curl -s http://localhost:5678/healthz && echo "✅ n8n is healthy" || echo "⚠️  n8n health check failed"
  echo ""
  
  # Check Thunder ERP
  echo "📊 Thunder ERP Health Check:"
  curl -s http://localhost:3000/api/ai/n8n | jq '.n8nHealthy' && echo "✅ Thunder ERP can reach n8n" || echo "⚠️  Thunder ERP cannot reach n8n"
  echo ""
ENDSSH

echo ""

# ============================================
# 9. Display Access Information
# ============================================
echo "============================================"
echo "✅ DEPLOYMENT COMPLETE!"
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
echo "📡 n8n API Endpoints:"
echo "   Thunder ERP → n8n: http://localhost:5678/webhook/*"
echo ""
echo "🔗 Quick Test:"
echo "   curl http://192.168.1.250:3000/api/ai/n8n"
echo ""
echo "============================================"
echo "📚 Next Steps:"
echo "============================================"
echo ""
echo "1. Access n8n UI:"
echo "   http://192.168.1.250:5678"
echo ""
echo "2. Add Credentials:"
echo "   - OpenAI API (OPENAI_API_KEY)"
echo "   - PostgreSQL (Thunder ERP Supabase)"
echo ""
echo "3. Import Workflow:"
echo "   - Go to Workflows → Import from JSON"
echo "   - Copy JSON from docs/N8N_AGENT_WORKFLOWS.md"
echo ""
echo "4. Test Workflow:"
echo "   curl -X POST http://192.168.1.250/webhook/planning-agent \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"prompt\":\"Test\"}'"
echo ""
echo "============================================"
echo "🐳 Docker Commands:"
echo "============================================"
echo ""
echo "View n8n logs:"
echo "   ssh vipkrom@vipkrom-A4110"
echo "   cd /var/www/thunder-erp"
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
echo "============================================"
echo "📖 Documentation:"
echo "============================================"
echo ""
echo "   docs/N8N_AGENT_WORKFLOWS.md"
echo ""
echo "🎉 Happy automating with Thunder ERP + n8n! 🚀"

