#!/bin/bash
# Dolar kurunu yeniler — her gün 08:00 Türkiye saatinde (05:00 UTC) çalışır.
# PM2 ecosystem.config.js veya system crontab'dan çağrılabilir.
#
# Kullanım (system crontab, crontab -e):
#   0 5 * * * /bin/bash /var/www/thunder-erp/scripts/refresh-exchange-rate.sh >> /var/www/thunder-erp/logs/exchange-rate-cron.log 2>&1
#
# CRON_SECRET env değişkeni varsa Authorization header ile gönderilir.

# PM2 cron ortamı uygulama env'ini yüklemez; CRON_SECRET'ı env dosyasından oku
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env.production.local"
if [ -z "${CRON_SECRET:-}" ] && [ -f "$ENV_FILE" ]; then
  CRON_SECRET="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | head -n1 | cut -d= -f2-)"
fi

APP_URL="http://127.0.0.1:3000"
ENDPOINT="${APP_URL}/api/cron/exchange-rate"
CRON_SECRET="${CRON_SECRET:-}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dolar kuru güncelleniyor: ${ENDPOINT}"

if [ -n "$CRON_SECRET" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json")
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json")
fi

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Güncellendi: ${BODY}"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Hata (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi
