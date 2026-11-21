#!/usr/bin/env bash
# Supabase Cloud → VPS'teki self-hosted Postgres veri taşıma
#
# Kullanım ('thunder' kullanıcısıyla, repo kökünden):
#   deploy/scripts/migrate-data.sh 'postgresql://postgres.<ref>:<şifre>@aws-0-<bölge>.pooler.supabase.com:5432/postgres'
#
# Kaynak bağlantı: Supabase Dashboard → Connect → "Session pooler" (IPv4 uyumlu).
# Direct connection (db.<ref>.supabase.co) sadece IPv6'dır; VPS'te IPv6 yoksa çalışmaz.
#
# Ne yapar:
#   1) Kaynaktan public şemasını pg_dump ile alır (custom format, sahiplik/izin olmadan)
#   2) Hedef public şemasının boş olduğunu doğrular (dolu ise durur)
#   3) pg_restore ile yükler (tablolar 'postgres' sahipliğinde → anon/service_role default grant'leri uygulanır)
#   4) Realtime publication'ı (supabase_realtime) kaynaktakiyle eşler
#   5) Tablo satır sayılarını kaynak ve hedefte karşılaştırır
#
# Kaynağa sadece OKUMA yapar. Dump dosyası /var/backups/thunder/ altında kalır.

set -euo pipefail

SRC_URL="${1:-}"
if [ -z "${SRC_URL}" ]; then
  sed -n '2,12p' "$0"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ROOT}/deploy/supabase/.env"
[ -f "${ENV_FILE}" ] || { echo "⛔ ${ENV_FILE} yok — önce generate-secrets.mjs çalıştır" >&2; exit 1; }
POSTGRES_PASSWORD="$(grep -E '^POSTGRES_PASSWORD=' "${ENV_FILE}" | cut -d= -f2-)"
TARGET_URL="postgresql://postgres:${POSTGRES_PASSWORD}@127.0.0.1:5432/postgres"

BACKUP_DIR="/var/backups/thunder"
mkdir -p "${BACKUP_DIR}"
STAMP="$(date +%Y%m%d-%H%M%S)"
DUMP_FILE="${BACKUP_DIR}/cloud-public-${STAMP}.dump"
RESTORE_LOG="${BACKUP_DIR}/restore-${STAMP}.log"

# pg_dump istemcisi kaynak sunucudan eski olamaz → postgres:17 imajındaki araçlar
PG_IMAGE="postgres:17-alpine"
pg() { docker run --rm -i --network host -v "${BACKUP_DIR}:${BACKUP_DIR}" "${PG_IMAGE}" "$@"; }

log() { echo -e "\n\033[1;34m==> $*\033[0m"; }

log "Hedef DB erişimi kontrol ediliyor"
pg psql "${TARGET_URL}" -tAc "select version()" >/dev/null || {
  echo "⛔ Hedef DB'ye bağlanılamadı. 'cd deploy/supabase && docker compose ps' ile kontrol et." >&2
  exit 1
}

log "Kaynak sürüm"
pg psql "${SRC_URL}" -tAc "show server_version"

TARGET_TABLES="$(pg psql "${TARGET_URL}" -tAc "select count(*) from pg_tables where schemaname='public'")"
if [ "${TARGET_TABLES}" != "0" ]; then
  echo "⛔ Hedefte public şemasında ${TARGET_TABLES} tablo var. Üzerine yazmamak için durdum." >&2
  echo "   Temiz başlamak istiyorsan (VERİ SİLİNİR): docker compose down -v && docker compose up -d" >&2
  exit 1
fi

log "Dump alınıyor → ${DUMP_FILE}"
pg pg_dump "${SRC_URL}" \
  --schema=public \
  --no-owner --no-privileges \
  --format=custom \
  --file="${DUMP_FILE}"
ls -lh "${DUMP_FILE}"

log "auth.jwt() hazırlanıyor (sade stack'te GoTrue yok; bazı policy'ler bunu kullanıyor)"
docker exec -i supabase-db psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -q <<'SQL'
create or replace function auth.jwt() returns jsonb
  language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;
grant execute on function auth.jwt() to anon, authenticated, service_role, postgres;
SQL

log "Restore ediliyor (log: ${RESTORE_LOG})"
set +e
pg pg_restore --dbname="${TARGET_URL}" --no-owner --no-privileges --role=postgres "${DUMP_FILE}" \
  > "${RESTORE_LOG}" 2>&1
RESTORE_RC=$?
set -e
# 'schema "public" already exists' beklenen ve zararsız; geri kalan hatalar raporlanır
REAL_ERRORS="$(grep -E '^pg_restore: error' "${RESTORE_LOG}" | grep -v 'schema "public" already exists' || true)"
if [ -n "${REAL_ERRORS}" ]; then
  echo "⚠️  pg_restore hataları (rc=${RESTORE_RC}):"
  echo "${REAL_ERRORS}" | head -30
  echo "   Tam log: ${RESTORE_LOG}"
else
  echo "✅ Restore temiz"
fi

log "Realtime publication eşleniyor"
SRC_PUB_TABLES="$(pg psql "${SRC_URL}" -tAc \
  "select tablename from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' order by 1" || true)"
if [ -z "${SRC_PUB_TABLES}" ]; then
  # Kaynakta tanım yoksa uygulamanın dinlediği tablolar
  SRC_PUB_TABLES="raw_materials
semi_finished_products
finished_products
orders
production_plans
stock_movements
notifications"
  echo "Kaynakta publication tablosu yok; uygulamanın dinlediği varsayılan tablolar kullanılıyor."
fi
pg psql "${TARGET_URL}" -v ON_ERROR_STOP=1 -qc \
  "do \$\$ begin if not exists (select 1 from pg_publication where pubname='supabase_realtime') then create publication supabase_realtime; end if; end \$\$;"
for t in ${SRC_PUB_TABLES}; do
  pg psql "${TARGET_URL}" -tAc \
    "select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='${t}'" | grep -q 1 \
    || pg psql "${TARGET_URL}" -qc "alter publication supabase_realtime add table public.\"${t}\";" \
    && echo "  + ${t}"
done

log "Satır sayısı karşılaştırması"
COUNT_SQL="select string_agg(format('select %L as t, count(*) as n from public.%I', tablename, tablename), ' union all ' order by tablename) from pg_tables where schemaname='public'"
SRC_Q="$(pg psql "${SRC_URL}" -tAc "${COUNT_SQL}")"
SRC_COUNTS="$(pg psql "${SRC_URL}" -tAF'|' -c "${SRC_Q}" | sort)"
TGT_COUNTS="$(pg psql "${TARGET_URL}" -tAF'|' -c "${SRC_Q}" 2>/dev/null | sort || true)"
MISMATCH=0
printf "%-40s %10s %10s\n" "TABLO" "KAYNAK" "HEDEF"
while IFS='|' read -r t n; do
  [ -z "${t}" ] && continue
  m="$(echo "${TGT_COUNTS}" | awk -F'|' -v t="${t}" '$1==t{print $2}')"
  flag=""
  if [ "${n}" != "${m:-YOK}" ]; then flag="  ⚠️"; MISMATCH=1; fi
  printf "%-40s %10s %10s%s\n" "${t}" "${n}" "${m:-YOK}" "${flag}"
done <<< "${SRC_COUNTS}"

echo
if [ "${MISMATCH}" = "0" ] && [ -z "${REAL_ERRORS}" ]; then
  echo "✅ Taşıma tamam — tüm tablolar eşleşti. Dump: ${DUMP_FILE}"
else
  echo "⚠️  Taşıma uyarılarla bitti. Yukarıdaki farkları ve ${RESTORE_LOG} dosyasını incele."
  exit 2
fi
