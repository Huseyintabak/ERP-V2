#!/usr/bin/env bash
# Thunder ERP — güncelleme deploy'u (VPS'te 'thunder' kullanıcısıyla çalıştır)
#   cd /var/www/thunder-erp && ./deploy.sh
#
# Rollback: git log ile önceki commit'i bul →  git checkout <commit> && ./deploy.sh --no-pull

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${APP_DIR}"

log() { echo -e "\n\033[1;34m==> $*\033[0m"; }

if [ ! -f .env.production.local ]; then
  echo "⛔ .env.production.local yok — deploy/README.md adım 2" >&2
  exit 1
fi

PREV_COMMIT="$(git rev-parse --short HEAD)"

if [ "${1:-}" != "--no-pull" ]; then
  log "git pull"
  git pull --ff-only origin main
fi
NEW_COMMIT="$(git rev-parse --short HEAD)"
echo "${PREV_COMMIT} → ${NEW_COMMIT}"

log "Bağımlılıklar (npm ci)"
npm ci --no-audit --no-fund

log "Build"
# Eski build'i silmeden önce yenisini ayrı dizinde değil, yerinde üretiyoruz;
# build başarısız olursa PM2 eski süreçle çalışmaya devam eder (.next bellekte yüklü).
NODE_OPTIONS="--max-old-space-size=2048" npm run build

log "PM2 reload"
if pm2 describe thunder-erp >/dev/null 2>&1; then
  # Sadece web uygulaması; kur cron'u (exchange-rate-cron) reload'da tetiklenip
  # yeniden başlayan uygulamaya istek atıyordu (HTTP 000). Cron kendi zamanında çalışır.
  pm2 reload ecosystem.config.js --only thunder-erp --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

log "Sağlık kontrolü"
for i in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/login || true)"
  [ "${code}" = "200" ] && break
  sleep 1
done
if [ "${code}" != "200" ]; then
  echo "❌ /login ${code} döndü. Loglar: pm2 logs thunder-erp --lines 50"
  echo "   Geri almak için: git checkout ${PREV_COMMIT} && ./deploy.sh --no-pull"
  exit 1
fi
echo "✅ Deploy tamam (${NEW_COMMIT})"
