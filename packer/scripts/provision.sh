#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

REPO_DIR=/opt/blog-api
APP_DIR="$REPO_DIR/app"
ENV_DIR=/etc/blog-api

: "${GITHUB_REPO:?GITHUB_REPO is required}"
GITHUB_BRANCH="${GITHUB_BRANCH:-master}"

echo "==> Waiting for first-boot cloud-init to finish"
cloud-init status --wait || true

echo "==> System packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg git nginx

echo "==> Node.js 22 (NodeSource) and PM2"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pm2

echo "==> Cloning $GITHUB_REPO (branch: $GITHUB_BRANCH)"
rm -rf "$REPO_DIR"
if [ -n "${GITHUB_TOKEN:-}" ]; then
  # Private repo: inject the token into the clone URL, then strip it from the saved remote
  CLONE_URL="${GITHUB_REPO/https:\/\//https://x-access-token:${GITHUB_TOKEN}@}"
  git clone --depth 1 --branch "$GITHUB_BRANCH" "$CLONE_URL" "$REPO_DIR" 2>&1 | sed "s/${GITHUB_TOKEN}/***/g"
  git -C "$REPO_DIR" remote set-url origin "$GITHUB_REPO"
else
  git clone --depth 1 --branch "$GITHUB_BRANCH" "$GITHUB_REPO" "$REPO_DIR"
fi
git -C "$REPO_DIR" rev-parse HEAD > "$REPO_DIR/.deployed-commit"
echo "Deployed commit: $(cat "$REPO_DIR/.deployed-commit")"

echo "==> Installing production dependencies"
cd "$APP_DIR"
if [ -f package-lock.json ]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

echo "==> Env directory (file is created at boot by cloud-init)"
mkdir -p "$ENV_DIR"
chmod 700 "$ENV_DIR"

echo "==> PM2 systemd unit for root (app is started by cloud-init once the env file exists)"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root
systemctl enable pm2-root

echo "==> PM2 log rotation"
cat > /etc/logrotate.d/pm2-root <<'EOF'
/root/.pm2/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
EOF

echo "==> Nginx"
install -m 0644 "$REPO_DIR/packer/files/nginx-blog-api.conf" /etc/nginx/sites-available/blog-api
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/blog-api /etc/nginx/sites-enabled/blog-api
nginx -t
systemctl enable nginx

echo "==> Clean up so cloud-init re-runs (and applies user_data) on droplets created from this image"
apt-get autoremove -y
apt-get clean
rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
cloud-init clean --logs
sync

echo "==> Provisioning complete"
