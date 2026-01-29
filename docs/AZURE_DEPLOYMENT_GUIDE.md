# Azure Free-Tier VM Deployment Guide

## Complete Guide for Hosting Mess Meal Management on Azure B1s VM

This document provides a comprehensive analysis and step-by-step guide for deploying the Mess Meal Management PWA on an Azure free-tier VM (Standard B1s) for 16 dormitory members.

---

## 📊 Project Architecture Analysis

### Current Technology Stack

| Component | Technology | Resource Impact |
|-----------|------------|-----------------|
| Frontend | React 18 + Vite + TypeScript | Static files (~200KB gzipped) |
| Styling | Tailwind CSS | Compiled into static CSS |
| State | Zustand | Client-side only |
| Backend | Supabase (Cloud) | External service |
| Database | PostgreSQL via Supabase | External service |
| Realtime | Supabase Realtime | WebSocket connections |
| PWA | Workbox + vite-plugin-pwa | Service worker caching |
| Push | Web Push + Supabase Edge Functions | External service |

### What Needs to be Hosted on Azure VM

Since this is a **static PWA** with Supabase as the backend, the Azure VM only needs to:
1. **Serve static files** (HTML, JS, CSS, icons)
2. **Handle HTTPS/SSL termination**
3. **Optionally run Nginx as reverse proxy**

> ⚠️ **Important**: The database, authentication, realtime subscriptions, and edge functions all run on Supabase's cloud infrastructure. The Azure VM is only for hosting the frontend static files.

---

## 🖥️ Azure B1s VM Specifications & Suitability Analysis

### Azure B1s Specifications

| Resource | Specification |
|----------|---------------|
| vCPUs | 1 |
| RAM | 1 GB |
| Storage | 4 GB temp, 32 GB SSD (P4) |
| Network | 160 Mbps |
| Free Hours | 750 hours/month (first 12 months) |
| OS Options | Ubuntu 22.04 LTS (recommended) |

### Analysis for 16 Users

#### ✅ Why B1s is Sufficient

| Factor | Analysis |
|--------|----------|
| **Static Files** | Built bundle is ~200KB gzipped. Nginx can serve this with minimal RAM (~50MB) |
| **Concurrent Users** | 16 users × occasional requests = very low load |
| **Backend Load** | Zero - all handled by Supabase cloud |
| **Realtime Connections** | Zero - WebSockets connect directly to Supabase |
| **CPU Usage** | Minimal - just serving static files |
| **Memory Footprint** | Nginx: ~50MB, OS: ~400MB, Buffer: ~550MB free |

#### 📈 Estimated Resource Usage

```
Memory Breakdown:
├── Ubuntu 22.04 Base:     ~400 MB
├── Nginx:                 ~50 MB
├── Node.js (if needed):   ~100 MB (optional, for builds only)
├── SSL/Let's Encrypt:     ~10 MB
└── Available Buffer:      ~440 MB
────────────────────────────────
Total:                     1024 MB (1 GB)
```

#### ⚡ Performance Expectations

| Metric | Expected Value |
|--------|----------------|
| Response Time | < 50ms (static files from SSD) |
| Throughput | 1000+ requests/second |
| Uptime | 99.9% (with proper configuration) |
| Bandwidth | ~50MB/day for 16 active users |

---

## 🏗️ Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Devices (PWA)                        │
│              16 Dormitory Members' Phones/Laptops            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS (Port 443)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Azure B1s VM                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Ubuntu 22.04 LTS                       │ │
│  │  ┌──────────────────┐  ┌────────────────────────────┐  │ │
│  │  │ Let's Encrypt    │  │        Nginx               │  │ │
│  │  │ Certbot (SSL)    │──│  - Static file server      │  │ │
│  │  └──────────────────┘  │  - HTTPS termination       │  │ │
│  │                        │  - Gzip compression        │  │ │
│  │                        │  - Cache headers           │  │ │
│  │                        └────────────────────────────┘  │ │
│  │                                   │                     │ │
│  │                        ┌──────────▼─────────────┐      │ │
│  │                        │    /var/www/meal-app   │      │ │
│  │                        │    ├── index.html      │      │ │
│  │                        │    ├── assets/         │      │ │
│  │                        │    ├── icon-*.svg      │      │ │
│  │                        │    └── manifest.json   │      │ │
│  │                        └────────────────────────┘      │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ API Calls / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Supabase Cloud (Free Tier)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │PostgreSQL│ │   Auth   │ │ Realtime │ │Edge Functions │   │
│  │ Database │ │  Service │ │WebSocket │ │ (Push/Cutoff) │   │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

Before starting, ensure you have:

1. **Azure Account** with free tier eligibility
2. **Domain Name** (required for SSL and PWA)
   - Free options: Freenom (.tk, .ml), or use Azure DNS (~$0.50/zone/month)
3. **Supabase Project** already configured (as per `supabase/SETUP_GUIDE.md`)
4. **Local Development Environment** with Node.js 18+

---

## 🚀 Step-by-Step Deployment Guide

### Phase 1: Create Azure VM

#### Step 1.1: Create Azure Account
1. Go to [Azure Portal](https://portal.azure.com)
2. Sign up for free account (requires credit card for verification)
3. You get $200 credit for 30 days + 12 months of free services

#### Step 1.2: Create Virtual Machine
```bash
# Using Azure CLI (or use Portal UI)
az login

# Create resource group
az group create --name meal-app-rg --location eastus

# Create VM
az vm create \
  --resource-group meal-app-rg \
  --name meal-app-vm \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --storage-sku StandardSSD_LRS
```

#### Step 1.3: Configure Network Security Group (Firewall)
```bash
# Allow HTTP
az vm open-port --resource-group meal-app-rg --name meal-app-vm --port 80 --priority 1001

# Allow HTTPS
az vm open-port --resource-group meal-app-rg --name meal-app-vm --port 443 --priority 1002
```

#### Step 1.4: Get VM Public IP
```bash
az vm show -d -g meal-app-rg -n meal-app-vm --query publicIps -o tsv
# Note this IP address for DNS configuration
```

---

### Phase 2: Configure DNS

Point your domain to the Azure VM:

| Record Type | Name | Value |
|-------------|------|-------|
| A | @ | `<VM_PUBLIC_IP>` |
| A | www | `<VM_PUBLIC_IP>` |

Example for Cloudflare, GoDaddy, or your DNS provider:
- `meal-app.yourdomain.com` → `<VM_PUBLIC_IP>`

---

### Phase 3: Server Setup

#### Step 3.1: SSH into the VM
```bash
ssh azureuser@<VM_PUBLIC_IP>
```

#### Step 3.2: Update System and Install Dependencies
```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Nginx
sudo apt install nginx -y

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y

# Install Node.js 18 (for building the app)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Verify installations
nginx -v
node --version
npm --version
```

#### Step 3.3: Configure Firewall (UFW)
```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

---

### Phase 4: Build and Deploy Application

#### Option A: Build Locally and Upload

**On your local Windows machine:**
```powershell
# Navigate to project directory
cd G:\meal-app

# Install dependencies
npm install

# Create production .env file
# Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

# Build the application
npm run build

# The built files are in the 'dist' folder
# Upload to server using SCP
scp -r dist/* azureuser@<VM_PUBLIC_IP>:/tmp/meal-app/
```

**On the Azure VM:**
```bash
# Create web directory
sudo mkdir -p /var/www/meal-app

# Move files
sudo mv /tmp/meal-app/* /var/www/meal-app/

# Set permissions
sudo chown -R www-data:www-data /var/www/meal-app
sudo chmod -R 755 /var/www/meal-app
```

#### Option B: Build on Server (Git Clone)

```bash
# Install git
sudo apt install git -y

# Clone repository
cd /home/azureuser
git clone https://github.com/razibit/meal-app.git

# Navigate to project
cd meal-app

# Install dependencies
npm install

# Create .env file with your Supabase credentials
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
EOF

# Build
npm run build

# Copy to web directory
sudo mkdir -p /var/www/meal-app
sudo cp -r dist/* /var/www/meal-app/
sudo chown -R www-data:www-data /var/www/meal-app
```

---

### Phase 5: Configure Nginx

#### Step 5.1: Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/meal-app
```

**Paste this configuration:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name meal-app.yourdomain.com www.meal-app.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name meal-app.yourdomain.com www.meal-app.yourdomain.com;

    # Root directory
    root /var/www/meal-app;
    index index.html;

    # SSL Configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/meal-app.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/meal-app.yourdomain.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' https://*.supabase.co wss://*.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
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

    # SPA Routing - Always serve index.html for non-file requests
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check endpoint
    location /health {
        return 200 'healthy';
        add_header Content-Type text/plain;
    }

    # Block access to sensitive files
    location ~ /\. {
        deny all;
    }

    # Access and error logs
    access_log /var/log/nginx/meal-app.access.log;
    error_log /var/log/nginx/meal-app.error.log;
}
```

#### Step 5.2: Enable Site Configuration
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/meal-app /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### Phase 6: SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d meal-app.yourdomain.com -d www.meal-app.yourdomain.com

# Follow the prompts:
# - Enter email for renewal notices
# - Agree to terms
# - Choose redirect option (recommended)

# Test auto-renewal
sudo certbot renew --dry-run

# Set up auto-renewal cron job (usually automatic)
sudo systemctl enable certbot.timer
```

---

### Phase 7: Verify Deployment

#### Step 7.1: Test the Application
```bash
# Test locally on server
curl -I http://localhost

# Test HTTPS
curl -I https://meal-app.yourdomain.com
```

#### Step 7.2: PWA Verification Checklist
- [ ] Visit `https://meal-app.yourdomain.com`
- [ ] Check browser console for service worker registration
- [ ] Verify "Add to Home Screen" prompt appears
- [ ] Test offline functionality
- [ ] Verify login/authentication works
- [ ] Test meal registration
- [ ] Test chat functionality
- [ ] Verify realtime updates

---

## 🔧 Automation Scripts

### Create Deployment Script

Create `/home/azureuser/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

cd /home/azureuser/meal-app

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build application
echo "🔨 Building application..."
npm run build

# Deploy to web directory
echo "📂 Deploying to web directory..."
sudo rm -rf /var/www/meal-app/*
sudo cp -r dist/* /var/www/meal-app/
sudo chown -R www-data:www-data /var/www/meal-app

# Clear Nginx cache (if applicable)
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Visit: https://meal-app.yourdomain.com"
```

Make it executable:
```bash
chmod +x /home/azureuser/deploy.sh
```

### Create Health Check Script

Create `/home/azureuser/healthcheck.sh`:

```bash
#!/bin/bash

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is not running. Restarting..."
    sudo systemctl restart nginx
fi

# Check if site is accessible
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP_CODE" != "200" ]; then
    echo "Site not responding. HTTP code: $HTTP_CODE"
    exit 1
fi

echo "Health check passed"
```

### Setup Monitoring Cron Job

```bash
# Edit crontab
crontab -e

# Add health check every 5 minutes
*/5 * * * * /home/azureuser/healthcheck.sh >> /var/log/healthcheck.log 2>&1
```

---

## 📊 16-User Capacity Analysis

### Supabase Free Tier Limits

| Resource | Free Tier Limit | 16 Users Usage | Status |
|----------|-----------------|----------------|--------|
| Database | 500 MB | ~10-50 MB | ✅ Abundant |
| Auth Users | Unlimited | 16 | ✅ Fine |
| API Requests | 500,000/month | ~50,000/month | ✅ 10% used |
| Realtime Connections | 200 concurrent | 16 max | ✅ 8% used |
| Edge Function Invocations | 500,000/month | ~5,000/month | ✅ 1% used |
| File Storage | 1 GB | 0 (not used) | ✅ N/A |
| Bandwidth | 2 GB/month | ~500 MB/month | ✅ 25% used |

### Azure B1s Capacity

| Resource | B1s Limit | 16 Users Usage | Status |
|----------|-----------|----------------|--------|
| CPU | 1 vCPU (burstable) | < 1% avg | ✅ Minimal |
| RAM | 1 GB | ~500 MB | ✅ 50% used |
| Storage | 32 GB SSD | ~500 MB | ✅ 1.5% used |
| Bandwidth | 160 Mbps | ~1 Mbps avg | ✅ < 1% used |

### Daily Usage Estimate (16 Users)

```
Typical Usage Pattern:
├── Morning meal registration: 16 users × 2 API calls = 32 calls
├── Night meal registration: 16 users × 2 API calls = 32 calls
├── Chat messages: ~50 messages/day × 2 calls = 100 calls
├── Real-time subscriptions: 16 concurrent max
├── Page loads: ~100/day × 200KB = 20 MB
└── API calls total: ~500/day → 15,000/month
```

### Monthly Projections

| Metric | Monthly Estimate | Limit | Usage % |
|--------|------------------|-------|---------|
| API Calls | 15,000 | 500,000 | 3% |
| Bandwidth (Azure) | 600 MB | Unlimited* | N/A |
| Bandwidth (Supabase) | 400 MB | 2 GB | 20% |
| Database Growth | 5-10 MB | 500 MB | 2% |

*Azure B1s has unlimited bandwidth but throttles after high usage

---

## 💰 Cost Analysis

### Free Tier (First 12 Months)

| Service | Cost |
|---------|------|
| Azure B1s VM | $0 (750 hrs/month free) |
| Supabase | $0 (free tier) |
| Domain (optional) | $0-12/year |
| SSL Certificate | $0 (Let's Encrypt) |
| **Total** | **$0-12/year** |

### After Free Tier Expires

| Service | Monthly Cost |
|---------|--------------|
| Azure B1s VM | ~$8.76/month |
| Supabase Pro (if needed) | $25/month (optional) |
| Domain | ~$1/month |
| **Total** | **~$10-35/month** |

### Cost Optimization Tips

1. **Keep using Supabase Free Tier** - 16 users won't exceed limits
2. **Use Azure Reserved Instances** - Save 40% on VM costs
3. **Consider Azure Static Web Apps** - Free tier available, simpler
4. **Use Cloudflare** - Free CDN and DDoS protection

---

## 🔄 Maintenance Procedures

### Weekly Tasks
- [ ] Check `/var/log/nginx/meal-app.error.log` for errors
- [ ] Verify SSL certificate status
- [ ] Monitor disk usage: `df -h`

### Monthly Tasks
- [ ] Apply system updates: `sudo apt update && sudo apt upgrade`
- [ ] Review Supabase usage dashboard
- [ ] Backup database (export from Supabase)
- [ ] Test disaster recovery

### SSL Certificate Renewal (Automatic)
```bash
# Check certificate expiry
sudo certbot certificates

# Manual renewal if needed
sudo certbot renew
```

### Application Updates
```bash
# Run deployment script
/home/azureuser/deploy.sh
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. 502 Bad Gateway
```bash
# Check Nginx status
sudo systemctl status nginx

# Check error logs
sudo tail -f /var/log/nginx/meal-app.error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### 2. SSL Certificate Issues
```bash
# Force renewal
sudo certbot renew --force-renewal

# Check certificate
sudo certbot certificates
```

#### 3. Disk Space Issues
```bash
# Check disk usage
df -h

# Clear logs
sudo truncate -s 0 /var/log/nginx/*.log

# Clear npm cache
npm cache clean --force
```

#### 4. PWA Not Working
- Ensure HTTPS is properly configured
- Check Service Worker registration in browser DevTools
- Verify manifest.webmanifest is accessible
- Clear browser cache and reinstall PWA

#### 5. Realtime Not Connecting
- Verify Supabase URL in environment variables
- Check browser console for WebSocket errors
- Ensure Supabase project is active

---

## 🔐 Security Checklist

- [x] SSH key-based authentication only
- [x] UFW firewall enabled
- [x] HTTPS enforced with auto-redirect
- [x] Security headers configured
- [x] Content Security Policy set
- [x] Regular system updates
- [x] Supabase RLS policies enabled

### Additional Security Steps

```bash
# Disable password authentication
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart sshd

# Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
```

---

## 📱 Alternative: Azure Static Web Apps (Simpler Option)

If you want an even simpler deployment, consider **Azure Static Web Apps**:

### Advantages
- No VM management
- Automatic SSL
- Built-in CI/CD with GitHub
- Free tier available
- Global CDN included

### Quick Setup
1. Go to Azure Portal → Create Static Web App
2. Connect to GitHub repository
3. Configure build settings:
   - App location: `/`
   - Output location: `dist`
   - API location: (leave empty)
4. Add environment variables in Azure portal
5. Push to trigger deployment

### Static Web Apps Configuration

Create `staticwebapp.config.json` in project root:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["*.{css,scss,js,png,gif,ico,jpg,svg,woff,woff2}"]
  },
  "routes": [
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "globalHeaders": {
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "X-Content-Type-Options": "nosniff"
  },
  "mimeTypes": {
    ".webmanifest": "application/manifest+json"
  }
}
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Supabase project configured and tested locally
- [ ] Environment variables documented
- [ ] Domain name acquired
- [ ] Azure account created

### Azure VM Setup
- [ ] B1s VM created with Ubuntu 22.04
- [ ] Network security rules configured (80, 443)
- [ ] SSH access verified
- [ ] System updated
- [ ] Nginx installed
- [ ] Node.js installed

### Application Deployment
- [ ] Application built successfully
- [ ] Files uploaded to `/var/www/meal-app`
- [ ] Nginx configured for SPA routing
- [ ] SSL certificate obtained

### Post-Deployment
- [ ] HTTPS working
- [ ] PWA installable
- [ ] Authentication working
- [ ] Realtime updates working
- [ ] Meal registration working
- [ ] Chat working
- [ ] Health check configured
- [ ] Monitoring in place

---

## 📚 Summary

The **Azure B1s free-tier VM is well-suited** for hosting this meal management PWA for 16 dormitory members. The architecture leverages:

1. **Supabase Cloud** for all backend services (database, auth, realtime, functions)
2. **Azure B1s VM** only for serving static frontend files
3. **Let's Encrypt** for free SSL certificates
4. **Nginx** for efficient static file serving

This approach minimizes costs while providing a reliable, scalable solution that can easily handle 16 users with room for growth.

**Total Cost: $0 for 12 months**, then approximately **$10/month** after free tier expires.

For questions or issues, refer to the troubleshooting section or open an issue in the repository.
