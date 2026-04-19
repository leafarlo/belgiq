#!/bin/bash
# BelgiQ — Hetzner CX22 Server Setup Script
# Run once as root on a fresh Ubuntu 24.04 instance:
#   curl -fsSL https://raw.githubusercontent.com/you/belgiq/main/deploy/setup.sh | bash
# 
# What this does:
#   1. Installs all system dependencies
#   2. Creates a 'belgiq' system user
#   3. Clones the repo and sets up the venv
#   4. Configures PostgreSQL, Redis
#   5. Installs and enables all systemd services
#   6. Configures Nginx
#   7. Obtains HTTPS certificate via Certbot

set -euo pipefail

DOMAIN="belgiq.be"
REPO="https://github.com/you/belgiq.git"
APP_DIR="/var/www/belgiq"
DB_PASS=$(openssl rand -base64 24)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  BelgiQ Server Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. System packages ────────────────────────────────────────────────────────
echo "[1/8] Installing system packages..."
apt-get update -qq
apt-get install -y -qq \
    nginx postgresql postgresql-contrib redis-server \
    python3 python3-pip python3-venv \
    nodejs npm git curl certbot python3-certbot-nginx \
    logrotate ufw

# ── 2. Firewall ───────────────────────────────────────────────────────────────
echo "[2/8] Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ── 3. System user ────────────────────────────────────────────────────────────
echo "[3/8] Creating belgiq user..."
id -u belgiq &>/dev/null || useradd -r -m -d $APP_DIR -s /bin/bash belgiq
mkdir -p /var/log/belgiq && chown belgiq:belgiq /var/log/belgiq

# ── 4. Clone repo ─────────────────────────────────────────────────────────────
echo "[4/8] Cloning repository..."
if [ -d "$APP_DIR/.git" ]; then
    sudo -u belgiq git -C $APP_DIR pull
else
    sudo -u belgiq git clone $REPO $APP_DIR
fi

# ── 5. Python virtualenv ──────────────────────────────────────────────────────
echo "[5/8] Setting up Python environment..."
sudo -u belgiq python3 -m venv $APP_DIR/venv
sudo -u belgiq $APP_DIR/venv/bin/pip install -q --upgrade pip
sudo -u belgiq $APP_DIR/venv/bin/pip install -q -r $APP_DIR/requirements.txt

# ── 6. Database ───────────────────────────────────────────────────────────────
echo "[6/8] Configuring PostgreSQL..."
systemctl enable postgresql && systemctl start postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='belgiq'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE belgiq;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='belgiq'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER belgiq WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE belgiq TO belgiq;"
sudo -u postgres psql -d belgiq -c "GRANT ALL ON SCHEMA public TO belgiq;"
sudo -u postgres psql -d belgiq -f $APP_DIR/schema.sql

# Write .env file
cat > $APP_DIR/.env << EOF
DATABASE_URL=postgresql://belgiq:${DB_PASS}@localhost/belgiq
REDIS_URL=redis://localhost:6379/0
ANTHROPIC_API_KEY=your_key_here
ENVIRONMENT=production
EOF
chown belgiq:belgiq $APP_DIR/.env
chmod 600 $APP_DIR/.env

# ── 7. Frontend build ─────────────────────────────────────────────────────────
echo "[7/8] Building React frontend..."
cd $APP_DIR/frontend
sudo -u belgiq npm install --silent
sudo -u belgiq npm run build

# ── 8. Systemd services ───────────────────────────────────────────────────────
echo "[8/8] Installing services..."
systemctl enable redis-server && systemctl start redis-server

# Copy and install services
for svc in belgiq-api belgiq-worker belgiq-beat; do
    if [ -f "$APP_DIR/deploy/systemd/${svc}.service" ]; then
        cp $APP_DIR/deploy/systemd/${svc}.service /etc/systemd/system/
    fi
done

systemctl daemon-reload
systemctl enable belgiq-api belgiq-worker belgiq-beat
systemctl start  belgiq-api belgiq-worker belgiq-beat

# Nginx
cp $APP_DIR/deploy/nginx/belgiq.conf /etc/nginx/sites-available/belgiq
ln -sf /etc/nginx/sites-available/belgiq /etc/nginx/sites-enabled/belgiq
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# HTTPS
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ BelgiQ setup complete!"
echo "  🌐 https://$DOMAIN"
echo "  🔑 DB password saved to $APP_DIR/.env"
echo "  📋 Service status: systemctl status belgiq-api"
echo "  📋 Pipeline logs:  tail -f /var/log/belgiq/worker.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
