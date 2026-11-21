#!/bin/bash
# Dolar kurunu yeniler — her gün 08:00 Türkiye saatinde (05:00 UTC) çalışır.
# PM2 ecosystem.config.js veya system crontab'dan çağrılabilir.
#
# Kullanım (system crontab, crontab -e):
#   0 5 * * * /bin/bash /var/www/thunder-erp/scripts/refresh-exchange-rate.sh >> /var/www/thunder-erp/logs/exchange-rate-cron.log 2>&1
#
# CRON_SECRET env değişkeni varsa Authorization header ile gönderilir.

APP_URL="${NEXTAUTH_URL:-${NEXT_PUBLIC_APP_URL:-http://localhost:3000}}"
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
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Güncellendi: ${BODY}"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Hata (HTTP ${HTTP_CODE}): ${BODY}"
  exit 1
fi
