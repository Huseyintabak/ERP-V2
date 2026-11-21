#!/usr/bin/env bash
# Thunder ERP — VPS ilk kurulum (Ubuntu 22.04 / 24.04, root olarak çalıştır)
#
#   curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/scripts/setup-vps.sh -o setup-vps.sh
#   sudo REPO_URL=https://github.com/<owner>/<repo>.git bash setup-vps.sh
#
# Ne yapar (idempotent — tekrar çalıştırılabilir):
#   - Sistem paketleri, saat dilimi (Europe/Istanbul), 4 GB swap
#   - Docker Engine + compose plugin, Node.js 20, PM2
#   - 'thunder' sistem kullanıcısı (docker grubunda), /var/www/thunder-erp
#   - UFW (sadece 22, 80, 443), fail2ban (sshd)
#   - Nginx site config
#   - Repo clone
# Ne YAPMAZ: secret üretmek, DB'yi başlatmak, veri taşımak, build — bunlar README'deki sonraki adımlar.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Huseyintabak/ERP-V2.git}"
APP_DIR="/var/www/thunder-erp"
APP_USER="thunder"
NODE_MAJOR=20

log()  { echo -e "\n\033[1;34m==> $*\033[0m"; }
warn() { echo -e "\033[1;33m!!  $*\033[0m"; }

if [ "$(id -u)" -ne 0 ]; then
  echo "Root olarak çalıştır: sudo bash $0" >&2
  exit 1
fi

. /etc/os-release
if [ "${ID}" != "ubuntu" ]; then
  warn "Ubuntu dışı dağıtım (${ID}) — script Ubuntu için yazıldı, devam ediliyor."
fi

log "Sistem paketleri"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg git ufw fail2ban nginx jq unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades || true

log "Saat dilimi: Europe/Istanbul"
timedatectl set-timezone Europe/Istanbul

log "Swap (4 GB) — Next.js build için"
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
else
  echo "swap zaten var"
fi

log "Docker Engine"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
# Container logları diski doldurmasın
if [ ! -f /etc/docker/daemon.json ]; then
  cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "20m", "max-file": "5" }
}
EOF
  systemctl restart docker
fi

log "Node.js ${NODE_MAJOR} + PM2"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v${NODE_MAJOR}\."; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null 2>&1 || npm install -g pm2@latest

log "Uygulama kullanıcısı: ${APP_USER}"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${APP_USER}"
fi
usermod -aG docker "${APP_USER}"

log "Repo: ${REPO_URL} → ${APP_DIR}"
mkdir -p "$(dirname "${APP_DIR}")"
if [ ! -d "${APP_DIR}/.git" ]; then
  git clone "${REPO_URL}" "${APP_DIR}" || {
    warn "Clone başarısız. Repo private ise deploy key ekle: README → 'Private repo'"
    exit 1
  }
fi
mkdir -p "${APP_DIR}/logs"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

log "Yedek dizini"
mkdir -p /var/backups/thunder
chown "${APP_USER}:${APP_USER}" /var/backups/thunder
chmod 750 /var/backups/thunder

log "Nginx"
cp "${APP_DIR}/deploy/nginx/thunder-proxy-headers.conf" /etc/nginx/snippets/thunder-proxy-headers.conf
install -d -m 0755 /var/www/acme/.well-known/acme-challenge
# Config 443'ü dinler; gerçek sertifika setup-tls.sh ile gelene kadar geçici self-signed
if [ ! -s /etc/thunder-tls/fullchain.pem ]; then
  install -d -m 0700 /etc/thunder-tls
  PUBLIC_IP="$(curl -fsS4 https://api.ipify.org || echo 127.0.0.1)"
  openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:P-256 -days 2 \
    -subj "/CN=${PUBLIC_IP}" -addext "subjectAltName=IP:${PUBLIC_IP}" \
    -keyout /etc/thunder-tls/privkey.pem -out /etc/thunder-tls/fullchain.pem 2>/dev/null
  chmod 600 /etc/thunder-tls/privkey.pem
fi
cp "${APP_DIR}/deploy/nginx/thunder-erp.conf" /etc/nginx/sites-available/thunder-erp
ln -sf /etc/nginx/sites-available/thunder-erp /etc/nginx/sites-enabled/thunder-erp
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl reload nginx

log "Firewall (UFW): 22, 80, 443"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
# Not: Docker yayınlanan portlar için UFW'yi bypass eder; bu yüzden compose'da
# tüm portlar 127.0.0.1'e bağlı. Yeni servis eklerken buna dikkat et.

log "fail2ban (sshd)"
cat > /etc/fail2ban/jail.d/thunder.local <<'EOF'
[sshd]
enabled  = true
maxretry = 5
findtime = 10m
bantime  = 1h

[nginx-limit-req]
enabled  = true
port     = http,https
logpath  = /var/log/nginx/thunder-erp-error.log
maxretry = 10
findtime = 10m
bantime  = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

log "PM2 açılışta başlasın (${APP_USER})"
env PATH="$PATH:/usr/bin" pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}" >/dev/null

echo
echo "✅ Temel kurulum tamam."
echo
echo "Sonraki adımlar (deploy/README.md):"
echo "  (root) lego kur + sudo bash ${APP_DIR}/deploy/scripts/setup-tls.sh production"
echo "  sudo -iu ${APP_USER}"
echo "  cd ${APP_DIR}"
echo "  node deploy/scripts/generate-secrets.mjs --public-url https://$(curl -fsS4 https://ifconfig.me 2>/dev/null || echo '<VPS_IP>')"
echo "  cd deploy/supabase && docker compose up -d"
