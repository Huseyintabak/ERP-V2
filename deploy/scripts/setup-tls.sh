#!/usr/bin/env bash
# Thunder ERP — IP adresine Let's Encrypt sertifikası (domain gerekmez). Root olarak çalıştır.
#
#   sudo bash deploy/scripts/setup-tls.sh staging      # önce test (sertifika kurulmaz, Nginx'e dokunmaz)
#   sudo bash deploy/scripts/setup-tls.sh production   # gerçek sertifika + Nginx HTTPS + otomatik yenileme
#
# Let's Encrypt IP sertifikaları sadece "shortlived" profilde verilir: ~6 gün geçerli.
# Yenileme 12 saatte bir denenir, kalan süre 3 günün altına inince yenilenir.
# Gereksinim: lego (go-acme/lego v5) /usr/local/bin/lego, Nginx, 80 ve 443 portları açık.

set -euo pipefail

MODE="${1:-}"
[[ "${MODE}" == "staging" || "${MODE}" == "production" ]] || { echo "Kullanım: $0 staging|production" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || { echo "Root olarak çalıştır" >&2; exit 1; }

APP_DIR="${APP_DIR:-/var/www/thunder-erp}"
IP="${TLS_IP:-$(curl -fsS4 https://api.ipify.org)}"
WEBROOT=/var/www/acme
TLS_DIR=/etc/thunder-tls
DEPLOY_HOOK=/usr/local/bin/thunder-tls-deploy

if [ "${MODE}" = "staging" ]; then
  SERVER=https://acme-staging-v02.api.letsencrypt.org/directory
  LEGO_PATH=/etc/lego-staging
else
  SERVER=https://acme-v02.api.letsencrypt.org/directory
  LEGO_PATH=/etc/lego
fi

log() { echo -e "\n\033[1;34m==> $*\033[0m"; }

command -v lego >/dev/null || { echo "lego bulunamadı (/usr/local/bin/lego)" >&2; exit 1; }
[[ "${IP}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Geçersiz IP: ${IP}" >&2; exit 1; }

log "Dizinler (IP: ${IP}, mod: ${MODE})"
install -d -m 0755 "${WEBROOT}/.well-known/acme-challenge"
install -d -m 0700 "${TLS_DIR}" "${LEGO_PATH}"

# Nginx 443 bloğu sertifika olmadan başlamaz → ilk kurulumda geçici self-signed sertifika
if [ ! -s "${TLS_DIR}/fullchain.pem" ]; then
  log "Geçici self-signed sertifika (gerçek sertifika gelene kadar)"
  openssl req -x509 -nodes -newkey ec -pkeyopt ec_paramgen_curve:P-256 -days 2 \
    -subj "/CN=${IP}" -addext "subjectAltName=IP:${IP}" \
    -keyout "${TLS_DIR}/privkey.pem" -out "${TLS_DIR}/fullchain.pem" 2>/dev/null
  chmod 600 "${TLS_DIR}/privkey.pem"
fi

log "Deploy hook: ${DEPLOY_HOOK}"
cat > "${DEPLOY_HOOK}" <<EOF
#!/usr/bin/env bash
# lego başarılı alma/yenileme sonrası çağırır: sertifikayı Nginx yoluna kopyalar, Nginx'i reload eder.
set -euo pipefail
CRT="\${LEGO_CERT_PATH:-${LEGO_PATH}/certificates/${IP}.crt}"
KEY="\${LEGO_CERT_KEY_PATH:-${LEGO_PATH}/certificates/${IP}.key}"
install -m 0644 "\${CRT}" "${TLS_DIR}/fullchain.pem.new"
install -m 0600 "\${KEY}" "${TLS_DIR}/privkey.pem.new"
mv -f "${TLS_DIR}/fullchain.pem.new" "${TLS_DIR}/fullchain.pem"
mv -f "${TLS_DIR}/privkey.pem.new" "${TLS_DIR}/privkey.pem"
nginx -t -q && systemctl reload nginx
logger -t thunder-tls "Sertifika yenilendi: \$(openssl x509 -in ${TLS_DIR}/fullchain.pem -noout -enddate)"
EOF
chmod 0755 "${DEPLOY_HOOK}"

if [ "${MODE}" = "production" ]; then
  log "Nginx config (HTTP→HTTPS + ACME webroot)"
  install -m 0644 "${APP_DIR}/deploy/nginx/thunder-proxy-headers.conf" /etc/nginx/snippets/thunder-proxy-headers.conf
  CONF=/etc/nginx/sites-available/thunder-erp
  [ -f "${CONF}" ] && cp "${CONF}" "${CONF}.bak-$(date +%Y%m%d-%H%M%S)"
  install -m 0644 "${APP_DIR}/deploy/nginx/thunder-erp.conf" "${CONF}"
  ln -sf "${CONF}" /etc/nginx/sites-enabled/thunder-erp
  nginx -t
  systemctl reload nginx
fi

LEGO_ARGS=(
  --server "${SERVER}" --accept-tos --path "${LEGO_PATH}"
  --domains "${IP}" --profile shortlived --key-type EC256
  --http --http.webroot "${WEBROOT}"
)

log "Sertifika alınıyor (${MODE})"
if [ "${MODE}" = "staging" ]; then
  # Staging, canlı Nginx config'ini değiştirmez. 80 portu Nginx'te olduğundan lego kendi
  # sunucusunu açamaz; webroot kullanılır → mevcut config'te şu location olmalı:
  #   location ^~ /.well-known/acme-challenge/ { root /var/www/acme; }
  lego run "${LEGO_ARGS[@]}"
  log "Staging sertifikası:"
  openssl x509 -in "${LEGO_PATH}/certificates/${IP}.crt" -noout -subject -issuer -ext subjectAltName -enddate
  echo -e "\n✅ Staging başarılı. Gerçek sertifika için: sudo bash $0 production"
  exit 0
fi

lego run "${LEGO_ARGS[@]}" --renew-days 3 --deploy-hook "${DEPLOY_HOOK}"

log "Otomatik yenileme: systemd timer (12 saatte bir)"
cat > /etc/systemd/system/thunder-tls-renew.service <<EOF
[Unit]
Description=Thunder ERP - Let's Encrypt IP sertifikası yenileme
After=network-online.target nginx.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/lego run --server ${SERVER} --accept-tos --path ${LEGO_PATH} --domains ${IP} --profile shortlived --key-type EC256 --http --http.webroot ${WEBROOT} --renew-days 3 --deploy-hook ${DEPLOY_HOOK}
EOF
cat > /etc/systemd/system/thunder-tls-renew.timer <<'EOF'
[Unit]
Description=Thunder ERP - sertifika yenileme kontrolü (12 saatte bir)

[Timer]
OnBootSec=5min
OnUnitActiveSec=12h
RandomizedDelaySec=30min
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now thunder-tls-renew.timer

log "Süre kontrolü: thunder-tls-check (6 saatte bir)"
cat > /usr/local/bin/thunder-tls-check <<EOF
#!/usr/bin/env bash
# Sertifikanın bitmesine 2 günden az kaldıysa uyarı yazar (yenileme aksıyor demektir).
CERT=${TLS_DIR}/fullchain.pem
if ! openssl x509 -in "\${CERT}" -noout -checkend 172800 >/dev/null 2>&1; then
  MSG="UYARI: TLS sertifikası 2 gün içinde bitiyor/bitti: \$(openssl x509 -in "\${CERT}" -noout -enddate 2>&1). journalctl -u thunder-tls-renew.service"
  echo "[\$(date '+%F %T')] \${MSG}" >> /var/log/thunder-tls-check.log
  logger -p user.warning -t thunder-tls "\${MSG}"
  exit 1
fi
EOF
chmod 0755 /usr/local/bin/thunder-tls-check
echo "15 */6 * * * root /usr/local/bin/thunder-tls-check" > /etc/cron.d/thunder-tls-check
chmod 0644 /etc/cron.d/thunder-tls-check

log "Kurulan sertifika:"
openssl x509 -in "${TLS_DIR}/fullchain.pem" -noout -subject -issuer -enddate
systemctl list-timers thunder-tls-renew.timer --no-pager | head -3
echo -e "\n✅ HTTPS hazır: https://${IP}"
