#!/usr/bin/env bash
# Günlük Postgres yedeği (public şeması, custom format) + rotasyon
#
# Cron ('thunder' kullanıcısı, crontab -e):
#   0 3 * * * /var/www/thunder-erp/deploy/scripts/backup-db.sh >> /var/www/thunder-erp/logs/backup.log 2>&1
#
# Geri yükleme (DİKKAT: hedefteki public şemasını değiştirir):
#   docker exec -i supabase-db pg_restore -U postgres -d postgres --clean --if-exists --no-owner < /var/backups/thunder/thunder-XXXX.dump

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/thunder}"
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/thunder-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

docker exec supabase-db pg_dump -U postgres -d postgres --schema=public --format=custom > "${OUT}.partial"
mv "${OUT}.partial" "${OUT}"

# Boş/bozuk dump kontrolü
if ! docker exec -i supabase-db pg_restore --list < "${OUT}" >/dev/null 2>&1; then
  echo "[$(date '+%F %T')] ❌ Yedek doğrulanamadı: ${OUT}"
  exit 1
fi

find "${BACKUP_DIR}" -name 'thunder-*.dump' -mtime +"${KEEP_DAYS}" -delete

echo "[$(date '+%F %T')] ✅ ${OUT} ($(du -h "${OUT}" | cut -f1)) — ${KEEP_DAYS} günden eski yedekler silindi"
