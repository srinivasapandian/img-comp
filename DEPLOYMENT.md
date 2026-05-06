# ImagePress — Deployment Guide

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Option A — Docker (Recommended)](#2-option-a--docker-recommended)
3. [Option B — Linux VPS (Ubuntu/Debian)](#3-option-b--linux-vps-ubuntudebian)
4. [Option C — Windows Server / Local Production](#4-option-c--windows-server--local-production)
5. [Option D — Cloud Platforms](#5-option-d--cloud-platforms)
6. [SSL / HTTPS](#6-ssl--https)
7. [Environment Variables](#7-environment-variables)
8. [Updating the App](#8-updating-the-app)
9. [Monitoring & Logs](#9-monitoring--logs)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Architecture Overview

```
Browser
   │
   ▼
┌─────────────────────────────────┐
│  Nginx (port 80 / 443)          │  ← reverse proxy + SSL termination
│  • /          → React SPA       │
│  • /api/*     → FastAPI :8000   │
└─────────────────────────────────┘
        │                │
        ▼                ▼
  /var/www/        uvicorn :8000
  imagepress/      (2 workers)
  (static files)         │
                         ▼
                   Pillow engine
                   (thread pool)
                         │
                         ▼
                   /tmp/imagepress/
                   (session files)
```

**Ports used**

| Service | Port | Exposed |
|---------|------|---------|
| Nginx   | 80 / 443 | Yes (public) |
| FastAPI | 8000 | No (internal only) |

---

## 2. Option A — Docker (Recommended)

### Prerequisites
- Docker ≥ 24
- Docker Compose v2

```bash
# Install Docker (Linux one-liner)
curl -fsSL https://get.docker.com | sh
```

### Deploy

```bash
# 1. Clone / copy the project to your server
scp -r ./tool user@YOUR_SERVER:/opt/imagepress

# 2. SSH into the server
ssh user@YOUR_SERVER
cd /opt/imagepress

# 3. Build and start
docker compose up -d --build

# 4. Verify
docker compose ps
curl http://localhost/api/health
# → {"status":"ok"}
```

### Docker commands reference

```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart backend only
docker compose restart backend

# Stop everything
docker compose down

# Rebuild after code change
docker compose up -d --build backend

# Shell into backend container
docker compose exec backend bash

# Check resource usage
docker stats
```

### docker-compose.yml ports

The default `docker-compose.yml` exposes:
- **Port 80** → React frontend (Nginx inside container)
- **Port 8000** → FastAPI (remove this if you only want internal access)

To add SSL inside Docker, uncomment the `nginx` service block in `docker-compose.yml` and mount your certificates.

---

## 3. Option B — Linux VPS (Ubuntu/Debian)

### One-command install

```bash
# Without domain (plain HTTP, IP access)
sudo bash deploy/deploy-linux.sh

# With domain (gets SSL automatically via Let's Encrypt)
sudo bash deploy/deploy-linux.sh yourdomain.com
```

### Manual step-by-step

#### 3.1 — System packages

```bash
sudo apt update && sudo apt install -y \
    python3 python3-venv python3-pip \
    nginx curl git \
    libjpeg-turbo8 libwebp7

# Node 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

#### 3.2 — Copy project files

```bash
sudo mkdir -p /opt/imagepress
sudo cp -r ./tool/* /opt/imagepress/
sudo chown -R www-data:www-data /opt/imagepress
```

#### 3.3 — Python environment

```bash
cd /opt/imagepress/backend
sudo -u www-data python3 -m venv venv
sudo -u www-data venv/bin/pip install --upgrade pip
sudo -u www-data venv/bin/pip install -r requirements.txt
sudo mkdir -p temp && sudo chown www-data:www-data temp
```

#### 3.4 — Build frontend

```bash
cd /opt/imagepress/frontend
sudo -u www-data npm ci
sudo -u www-data npm run build

sudo mkdir -p /var/www/imagepress
sudo cp -r dist/. /var/www/imagepress/
sudo chown -R www-data:www-data /var/www/imagepress
```

#### 3.5 — systemd service (backend)

```bash
sudo cp deploy/imagepress-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now imagepress-backend
sudo systemctl status imagepress-backend
```

#### 3.6 — Nginx

```bash
# Edit deploy/nginx.conf and replace "yourdomain.com" with your actual domain
# OR use the simple HTTP-only version:

sudo tee /etc/nginx/sites-available/imagepress > /dev/null << 'EOF'
server {
    listen 80;
    client_max_body_size 500M;
    proxy_read_timeout 300s;

    root /var/www/imagepress;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
        chunked_transfer_encoding on;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/imagepress \
            /etc/nginx/sites-enabled/imagepress
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

#### 3.7 — Open firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

#### 3.8 — Verify

```bash
curl http://localhost:8000/api/health    # → {"status":"ok"}
curl http://localhost/api/health         # → {"status":"ok"} (via Nginx)
```

Open `http://YOUR_SERVER_IP` in a browser — app is live.

---

## 4. Option C — Windows Server / Local Production

### 4.1 — Backend (Windows Service with NSSM)

```powershell
# Install NSSM (Non-Sucking Service Manager)
winget install nssm

# Create the service
nssm install ImagePressBackend `
    "C:\imagepress\backend\venv\Scripts\uvicorn.exe" `
    "main:app --host 0.0.0.0 --port 8000 --workers 2"

nssm set ImagePressBackend AppDirectory "C:\imagepress\backend"
nssm set ImagePressBackend Start SERVICE_AUTO_START
nssm set ImagePressBackend AppStdout "C:\imagepress\logs\backend.log"
nssm set ImagePressBackend AppStderr "C:\imagepress\logs\backend-err.log"

Start-Service ImagePressBackend
```

### 4.2 — Frontend (build + serve with IIS or Nginx for Windows)

```powershell
cd C:\imagepress\frontend
npm ci
npm run build
# dist\ folder is now ready to serve
```

**Option A — Nginx for Windows:**
```powershell
# Download Nginx for Windows from nginx.org
# Copy deploy\nginx.conf (simplified version) to nginx\conf\nginx.conf
# Edit paths to point to C:\imagepress\frontend\dist
Start-Process nginx.exe -WorkingDirectory "C:\nginx"
```

**Option B — IIS:**
1. Install IIS + URL Rewrite module
2. Point site root to `C:\imagepress\frontend\dist`
3. Add URL Rewrite rule: all requests not matching files → `/index.html`
4. Add Reverse Proxy rule: `/api/*` → `http://localhost:8000/api/*`

### 4.3 — One-click start scripts (development/staging)

```batch
# start_backend.bat  (already in project root)
# start_frontend.bat (already in project root)
```

For production on Windows, use NSSM to keep both processes running as services that survive reboots.

---

## 5. Option D — Cloud Platforms

### Render.com (Free tier available)

**Backend:**
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Starter ($7/mo) or higher for large batches
   - **Health check path:** `/api/health`

**Frontend:**
1. New → Static Site
2. Settings:
   - **Root directory:** `frontend`
   - **Build command:** `npm ci && npm run build`
   - **Publish directory:** `dist`
3. Add Redirect/Rewrite rule:
   - Source: `/api/*`
   - Destination: `https://your-backend.onrender.com/api/*`
   - Type: Rewrite

---

### Railway (Backend) + Netlify (Frontend)

This repo is a monorepo:
- Frontend: `frontend/` (Vite build â†’ `dist/`)
- Backend: `backend/` (FastAPI)

**Backend on Railway**
1. Push the repo to GitHub.
2. Railway â†’ New Project â†’ Deploy from GitHub repo â†’ select your repo.
3. Service settings:
   - Build â†’ **Root Directory:** `backend`
   - Deploy â†’ **Start Command:**
     - `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 2 --proxy-headers --forwarded-allow-ips "*"`
   - Deploy â†’ **Healthcheck Path (recommended):** `/api/health`
4. Networking â†’ **Generate Domain**.
5. Verify: `https://YOUR_RAILWAY_DOMAIN/api/health`

**Frontend on Netlify**
1. Netlify â†’ Add new site â†’ Import from Git â†’ select your repo.
2. Build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add a proxy so the frontend can keep using relative `/api/*` calls:

```toml
[[redirects]]
from = "/api/*"
to = "https://YOUR_RAILWAY_DOMAIN/api/:splat"
status = 200
force = true

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

4. Verify via Netlify: `https://YOUR_NETLIFY_DOMAIN/api/health`

---

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Backend
cd backend
fly launch --name imagepress-api --region sin  # pick nearest region
fly deploy

# Frontend (build first, then deploy static)
cd ../frontend
npm run build
fly launch --name imagepress-ui
fly deploy
```

**fly.toml for backend:**
```toml
app = "imagepress-api"
primary_region = "sin"

[build]
  dockerfile = "../Dockerfile.backend"

[[services]]
  internal_port = 8000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[env]
  PYTHONUNBUFFERED = "1"
```

---

### AWS EC2 (Quick setup)

```bash
# Launch Ubuntu 22.04 t3.medium (recommended for image processing)
# Then SSH in and run:

git clone https://github.com/YOUR_USER/imagepress.git
cd imagepress
sudo bash deploy/deploy-linux.sh your-ec2-domain.com

# Or use the Elastic IP with no domain:
sudo bash deploy/deploy-linux.sh
```

**Recommended EC2 instance:** `t3.medium` (2 vCPU, 4 GB RAM)
**Minimum:** `t3.small` (2 vCPU, 2 GB RAM)

**Security Group rules:**
| Type | Port | Source |
|------|------|--------|
| HTTP | 80   | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |
| SSH | 22 | Your IP |

---

### DigitalOcean App Platform

1. Push project to GitHub
2. Go to App Platform → Create App
3. Add two components:
   - **Backend:** Python, `backend/` dir, start cmd: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Frontend:** Static site, `frontend/` dir, build: `npm run build`, output: `dist`
4. Add route: `/api/*` → backend component

---

## 6. SSL / HTTPS

### Let's Encrypt (Linux VPS — free, auto-renewal)

```bash
sudo apt install certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# Renewal is automatic via systemd timer (no cron needed on Ubuntu 20+)
systemctl status certbot.timer
```

### Self-signed (internal/testing only)

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/imagepress.key \
    -out /etc/ssl/certs/imagepress.crt \
    -subj "/CN=localhost"
```

---

## 7. Environment Variables

Create `/opt/imagepress/backend/.env` (for future config):

```env
# Backend environment
HOST=0.0.0.0
PORT=8000
WORKERS=2

# Temp directory (use a fast local disk path)
TEMP_DIR=/opt/imagepress/backend/temp

# Max upload size per batch (informational — enforced by Nginx)
MAX_UPLOAD_MB=500
```

---

## 8. Updating the App

### Docker

```bash
cd /opt/imagepress
git pull
docker compose up -d --build
```

### Linux VPS (systemd)

```bash
cd /opt/imagepress

# Pull latest code
git pull

# Update Python deps
sudo -u www-data backend/venv/bin/pip install -r backend/requirements.txt

# Rebuild frontend
cd frontend
sudo -u www-data npm ci
sudo -u www-data npm run build
sudo cp -r dist/. /var/www/imagepress/

# Restart backend
sudo systemctl restart imagepress-backend
sudo systemctl reload nginx
```

---

## 9. Monitoring & Logs

### View logs

```bash
# systemd backend logs (live)
journalctl -u imagepress-backend -f

# Last 100 lines
journalctl -u imagepress-backend -n 100

# Nginx access log
tail -f /var/log/nginx/access.log

# Nginx error log
tail -f /var/log/nginx/error.log

# Docker
docker compose logs -f --tail=100
```

### Health check endpoint

```bash
curl http://localhost:8000/api/health
# {"status":"ok"}
```

### Monitor disk usage (temp files)

```bash
# Temp files are cleaned up after download, but check if disk fills up
du -sh /opt/imagepress/backend/temp/
df -h
```

### System resources

```bash
# CPU + memory live
htop

# Check how many uvicorn workers are running
ps aux | grep uvicorn
```

---

## 10. Troubleshooting

### Backend won't start

```bash
# Check the log
journalctl -u imagepress-backend -n 50

# Test manually
cd /opt/imagepress/backend
sudo -u www-data venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
```

### 502 Bad Gateway (Nginx can't reach backend)

```bash
# Is the backend running?
systemctl is-active imagepress-backend

# Is it on the right port?
ss -tlnp | grep 8000

# Test direct backend access
curl http://127.0.0.1:8000/api/health
```

### Upload times out / Nginx 413

```bash
# Check Nginx client_max_body_size
grep client_max_body_size /etc/nginx/sites-available/imagepress
# Must be 500M or higher

# Reload after any config change
sudo nginx -t && sudo nginx -s reload
```

### SSE progress stops updating

```bash
# Check Nginx buffering is off for /api/ routes
# These must be set in the location /api/ block:
#   proxy_buffering    off;
#   proxy_cache        off;
#   proxy_set_header   Connection '';
#   chunked_transfer_encoding on;
```

### Pillow import error in Docker

```bash
# Check libjpeg is installed in container
docker compose exec backend python -c "from PIL import Image; print('OK')"

# If missing:
docker compose exec backend apt-get install -y libjpeg-turbo8
```

### Disk full — temp files not cleaned

```bash
# Force cleanup (safe — temp files are session-scoped)
rm -rf /opt/imagepress/backend/temp/*
sudo systemctl restart imagepress-backend
```

### Port 8000 already in use (Windows)

```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill it
Stop-Process -Id PID_FROM_ABOVE -Force
```

---

## Quick Reference Card

```
Start (Linux)   sudo systemctl start  imagepress-backend
Stop  (Linux)   sudo systemctl stop   imagepress-backend
Logs  (Linux)   journalctl -u imagepress-backend -f

Start (Docker)  docker compose up -d
Stop  (Docker)  docker compose down
Logs  (Docker)  docker compose logs -f

Health check    curl http://localhost:8000/api/health

Frontend URL    http://YOUR_IP  or  https://yourdomain.com
Backend URL     http://YOUR_IP/api/health
```
