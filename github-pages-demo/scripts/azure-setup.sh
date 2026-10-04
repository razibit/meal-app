#!/bin/bash
# =============================================================================
# Meal App Azure VM Deployment Script
# =============================================================================
# This script automates the server setup on a fresh Ubuntu 22.04 Azure B1s VM
# Run as: bash azure-setup.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# =============================================================================
# Configuration - MODIFY THESE VALUES
# =============================================================================
DOMAIN="meal-app.yourdomain.com"  # Your domain name
EMAIL="your-email@example.com"    # Email for SSL certificate
REPO_URL="https://github.com/razibit/meal-app.git"  # Git repository
APP_DIR="/home/azureuser/meal-app"
WEB_DIR="/var/www/meal-app"

# Supabase credentials (will prompt if not set)
SUPABASE_URL="${VITE_SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY:-}"
VAPID_PUBLIC_KEY="${VITE_VAPID_PUBLIC_KEY:-}"

# =============================================================================
# Pre-flight checks
# =============================================================================
log_info "Starting Meal App Azure VM setup..."

if [ "$EUID" -eq 0 ]; then
    log_error "Please run this script as a regular user, not root"
    exit 1
fi

# =============================================================================
# Prompt for configuration if not set
# =============================================================================
if [ -z "$SUPABASE_URL" ]; then
    read -p "Enter your Supabase URL: " SUPABASE_URL
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
    read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY
fi

if [ -z "$VAPID_PUBLIC_KEY" ]; then
    read -p "Enter your VAPID Public Key (or press Enter to skip): " VAPID_PUBLIC_KEY
fi

read -p "Enter your domain name (e.g., meal-app.example.com): " DOMAIN
read -p "Enter your email for SSL certificate: " EMAIL

# =============================================================================
# Step 1: System Update
# =============================================================================
log_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# =============================================================================
# Step 2: Install Dependencies
# =============================================================================
log_info "Installing Nginx..."
sudo apt install -y nginx

log_info "Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

log_info "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

log_info "Installing Git..."
sudo apt install -y git

# Verify installations
log_info "Verifying installations..."
nginx -v
node --version
npm --version
git --version

# =============================================================================
# Step 3: Configure Firewall
# =============================================================================
log_info "Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
echo "y" | sudo ufw enable
sudo ufw status

# =============================================================================
# Step 4: Clone and Build Application
# =============================================================================
log_info "Cloning repository..."
if [ -d "$APP_DIR" ]; then
    log_warn "Directory exists, pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

log_info "Creating .env file..."
cat > "$APP_DIR/.env" << EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
VITE_VAPID_PUBLIC_KEY=$VAPID_PUBLIC_KEY
EOF

log_info "Installing npm dependencies..."
npm ci

log_info "Building application..."
npm run build

# =============================================================================
# Step 5: Deploy to Web Directory
# =============================================================================
log_info "Deploying to web directory..."
sudo mkdir -p "$WEB_DIR"
sudo rm -rf "$WEB_DIR"/*
sudo cp -r "$APP_DIR/dist/"* "$WEB_DIR/"
sudo chown -R www-data:www-data "$WEB_DIR"
sudo chmod -R 755 "$WEB_DIR"

# =============================================================================
# Step 6: Configure Nginx
# =============================================================================
log_info "Configuring Nginx..."

sudo tee /etc/nginx/sites-available/meal-app > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    
    root $WEB_DIR;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    # Cache Control for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker (no caching)
    location = /sw.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # PWA Manifest
    location = /manifest.webmanifest {
        types { } 
        default_type application/manifest+json;
        expires 1d;
    }

    # SPA Routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Health check
    location /health {
        return 200 'healthy';
        add_header Content-Type text/plain;
    }

    # Block dotfiles
    location ~ /\. {
        deny all;
    }

    access_log /var/log/nginx/meal-app.access.log;
    error_log /var/log/nginx/meal-app.error.log;
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/meal-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# =============================================================================
# Step 7: Setup SSL Certificate
# =============================================================================
log_info "Setting up SSL certificate..."
log_warn "Make sure your domain DNS is pointing to this server!"
read -p "Press Enter when DNS is configured, or 'skip' to skip SSL setup: " ssl_choice

if [ "$ssl_choice" != "skip" ]; then
    sudo certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive
    sudo certbot renew --dry-run
    log_info "SSL certificate installed successfully!"
else
    log_warn "Skipping SSL setup. Run 'sudo certbot --nginx' later to set up HTTPS."
fi

# =============================================================================
# Step 8: Create Utility Scripts
# =============================================================================
log_info "Creating utility scripts..."

# Deploy script
cat > "$HOME/deploy.sh" << 'DEPLOY_EOF'
#!/bin/bash
set -e
cd /home/azureuser/meal-app
git pull origin main
npm ci
npm run build
sudo rm -rf /var/www/meal-app/*
sudo cp -r dist/* /var/www/meal-app/
sudo chown -R www-data:www-data /var/www/meal-app
sudo systemctl reload nginx
echo "✅ Deployment complete!"
DEPLOY_EOF
chmod +x "$HOME/deploy.sh"

# Health check script
cat > "$HOME/healthcheck.sh" << 'HEALTH_EOF'
#!/bin/bash
if ! systemctl is-active --quiet nginx; then
    echo "Nginx down. Restarting..."
    sudo systemctl restart nginx
fi
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP_CODE" != "200" ]; then
    echo "Site error: HTTP $HTTP_CODE"
    exit 1
fi
echo "OK"
HEALTH_EOF
chmod +x "$HOME/healthcheck.sh"

# Add health check cron job
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/azureuser/healthcheck.sh >> /var/log/healthcheck.log 2>&1") | crontab -

# =============================================================================
# Complete
# =============================================================================
echo ""
echo "=============================================="
log_info "Setup complete!"
echo "=============================================="
echo ""
echo "Your Meal App is now deployed!"
echo ""
echo "URLs:"
echo "  - HTTP:  http://$DOMAIN"
if [ "$ssl_choice" != "skip" ]; then
    echo "  - HTTPS: https://$DOMAIN"
fi
echo ""
echo "Utility scripts:"
echo "  - Deploy updates: ~/deploy.sh"
echo "  - Health check:   ~/healthcheck.sh"
echo ""
echo "Logs:"
echo "  - Access log: /var/log/nginx/meal-app.access.log"
echo "  - Error log:  /var/log/nginx/meal-app.error.log"
echo ""
log_info "Don't forget to configure your DNS if you haven't already!"
