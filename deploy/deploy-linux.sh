#!/usr/bin/env bash
# ============================================================
#  ImagePress — automated Linux VPS deployment script
#  Tested on: Ubuntu 22.04 / Debian 12
#  Run as root or a user with sudo access:
#    chmod +x deploy-linux.sh && sudo ./deploy-linux.sh
# ============================================================

set -euo pipefail

APP_DIR="/opt/imagepress"
DOMAIN="${1:-}"          # optional: pass your domain as $1
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== ImagePress Deployment ==="
echo "App dir : $APP_DIR"
echo "Source  : $REPO_DIR"
echo ""

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/8] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    python3 python3-venv python3-pip \
    nginx curl git \
    libjpeg-turbo8 libwebp7 \
    nodejs npm

# Node 20 LTS (if system node is old)
if ! node -e "process.exit(parseInt(process.version.slice(1)) >= 18 ? 0 : 1)" 2>/dev/null; then
    echo "Installing Node 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# ── 2. App directory structure ────────────────────────────────────────────────
echo "[2/8] Creating app directory..."
mkdir -p "$APP_DIR"
cp -r "$REPO_DIR/backend" "$APP_DIR/"
cp -r "$REPO_DIR/frontend" "$APP_DIR/"
cp -r "$REPO_DIR/deploy" "$APP_DIR/"

chown -R www-data:www-data "$APP_DIR"

# ── 3. Python virtualenv + dependencies ──────────────────────────────────────
echo "[3/8] Setting up Python virtualenv..."
sudo -u www-data python3 -m venv "$APP_DIR/backend/venv"
sudo -u www-data "$APP_DIR/backend/venv/bin/pip" install \
    --quiet --upgrade pip
sudo -u www-data "$APP_DIR/backend/venv/bin/pip" install \
    --quiet -r "$APP_DIR/backend/requirements.txt"

mkdir -p "$APP_DIR/backend/temp"
chown www-data:www-data "$APP_DIR/backend/temp"

# ── 4. Build React frontend ───────────────────────────────────────────────────
echo "[4/8] Building frontend..."
cd "$APP_DIR/frontend"
sudo -u www-data npm ci --silent
sudo -u www-data npm run build

mkdir -p /var/www/imagepress
cp -r "$APP_DIR/frontend/dist/." /var/www/imagepress/
chown -R www-data:www-data /var/www/imagepress

# ── 5. systemd service ────────────────────────────────────────────────────────
echo "[5/8] Installing systemd services..."
cp "$APP_DIR/deploy/imagepress-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now imagepress-backend
echo "Backend status: $(systemctl is-active imagepress-backend)"

# ── 6. Nginx ─────────────────────────────────────────────────────────────────
echo "[6/8] Configuring Nginx..."
if [[ -n "$DOMAIN" ]]; then
    # Replace placeholder domain
    sed "s/yourdomain.com/$DOMAIN/g" \
        "$APP_DIR/deploy/nginx.conf" > /etc/nginx/sites-available/imagepress
else
    # No domain — plain HTTP config
    cat > /etc/nginx/sites-available/imagepress << 'NGINX'
server {
    listen 80 default_server;
    client_max_body_size 500M;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

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
NGINX
fi

ln -sf /etc/nginx/sites-available/imagepress /etc/nginx/sites-enabled/imagepress
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "Nginx: $(systemctl is-active nginx)"

# ── 7. SSL with Let's Encrypt ─────────────────────────────────────────────────
if [[ -n "$DOMAIN" ]]; then
    echo "[7/8] Setting up SSL..."
    apt-get install -y -qq certbot python3-certbot-nginx
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" \
        --non-interactive --agree-tos --email "admin@$DOMAIN" \
        --redirect
    # Auto-renewal cron
    echo "0 3 * * * certbot renew --quiet" | crontab -
else
    echo "[7/8] Skipping SSL (no domain provided)"
fi

# ── 8. Verify ─────────────────────────────────────────────────────────────────
echo "[8/8] Verifying services..."
sleep 2
curl -sf http://localhost:8000/api/health && echo "Backend OK" || echo "Backend FAIL"
curl -sf http://localhost/ > /dev/null && echo "Frontend OK" || echo "Frontend FAIL"

echo ""
echo "=== Deployment complete ==="
if [[ -n "$DOMAIN" ]]; then
    echo "URL: https://$DOMAIN"
else
    echo "URL: http://$(curl -sf ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
fi
echo ""
echo "Useful commands:"
echo "  systemctl status imagepress-backend"
echo "  journalctl -u imagepress-backend -f"
echo "  systemctl restart imagepress-backend"
