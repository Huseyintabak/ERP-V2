# Thunder ERP — VPS Kurulumu

Tek VPS üzerinde: **Nginx → Next.js (PM2)** + **sade self-hosted Supabase** (Docker).

```
İnternet ──443──▶ Nginx ─┬─▶ Next.js 127.0.0.1:3000 ──▶ Kong 127.0.0.1:8000 ─┬─▶ PostgREST ─▶ Postgres
                        │                                                   └─▶ Realtime ──▶ Postgres
                        └─ /realtime/v1/ (auth_request: geçerli thunder_token) ─▶ Kong
```

- Dışarı açık portlar **443** (HTTPS), **80** (sadece HTTPS'e yönlendirme + sertifika doğrulama) ve 22 (SSH). Postgres, Kong, PostgREST, Next.js sadece `127.0.0.1`.
- HTTPS domain'siz, doğrudan IP'ye Let's Encrypt sertifikasıyla (bkz. "HTTPS (IP sertifikası)").
- `/rest/v1` (PostgREST) **asla** dışarı açılmaz; anon key bilinse bile DB'ye erişilemez.
- Realtime websocket'i sadece login olmuş kullanıcılar açabilir (Nginx `auth_request` → `/api/auth/verify`).

## İlk kurulum

### 1. Sunucu hazırlığı (root)

```bash
sudo REPO_URL=https://github.com/Huseyintabak/ERP-V2.git bash deploy/scripts/setup-vps.sh
```

Docker, Node 20, PM2, Nginx, UFW (22/80/443), fail2ban, 4 GB swap, `thunder` kullanıcısı, `/var/www/thunder-erp`.

### 2. Secret'lar (thunder)

```bash
sudo -iu thunder
cd /var/www/thunder-erp
node deploy/scripts/generate-secrets.mjs --public-url https://<VPS_IP>
```

İki dosya üretir (chmod 600, git'e girmez):

| Dosya | İçerik |
|---|---|
| `deploy/supabase/.env` | Postgres şifresi, Supabase JWT secret, anon/service key |
| `.env.production.local` | Next.js env (JWT_SECRET, CRON_SECRET, Supabase URL'leri) |

> ⚠️ İkisinin de yedeğini şifre yöneticisine koy. `deploy/supabase/.env` kaybolursa DB'ye erişim kaybolur.

### 3. Supabase stack

```bash
cd deploy/supabase
docker compose up -d
docker compose ps        # hepsi healthy / running olmalı
```

### 4. Veri taşıma (Supabase Cloud → VPS)

Supabase Dashboard → projen → **Connect** → **Session pooler** bağlantı dizesini kopyala (IPv4 uyumlu olan).

```bash
cd /var/www/thunder-erp
deploy/scripts/migrate-data.sh 'postgresql://postgres.<ref>:<şifre>@aws-0-<bölge>.pooler.supabase.com:5432/postgres'
```

Script kaynağa sadece okuma yapar, hedef boş değilse durur, sonunda tablo tablo satır sayısı karşılaştırır.

### 5. HTTPS (root)

lego (go-acme/lego v5) kurulu olmalı — bkz. "HTTPS (IP sertifikası)".

```bash
sudo bash deploy/scripts/setup-tls.sh staging      # önce test
sudo bash deploy/scripts/setup-tls.sh production   # gerçek sertifika + Nginx HTTPS + otomatik yenileme
```

### 6. Uygulama

```bash
./deploy.sh --no-pull
```

### 7. Yedekleme cron'u

```bash
crontab -e
# ekle:
0 3 * * * /var/www/thunder-erp/deploy/scripts/backup-db.sh >> /var/www/thunder-erp/logs/backup.log 2>&1
```

Yedekler `/var/backups/thunder/` altında, 14 gün tutulur. **Sunucu dışına da kopyala** (disk arızasında kaybolmasın).

## Güncelleme

```bash
sudo -iu thunder
cd /var/www/thunder-erp && ./deploy.sh
```

Rollback: `git checkout <önceki-commit> && ./deploy.sh --no-pull`

## Sık kullanılanlar

| İş | Komut |
|---|---|
| Uygulama logları | `pm2 logs thunder-erp` |
| Uygulama durumu | `pm2 status` |
| DB stack durumu | `cd deploy/supabase && docker compose ps` |
| DB stack logları | `docker compose logs -f realtime` |
| psql | `docker exec -it supabase-db psql -U postgres` |
| DB'ye GUI ile bağlan | Lokalden: `ssh -L 5432:127.0.0.1:5432 thunder@<VPS_IP>` → DBeaver/TablePlus `localhost:5432`, kullanıcı `postgres` |
| Kur cron'unu elle tetikle | `pm2 restart exchange-rate-cron` |
| Yedekten geri dön | `docker exec -i supabase-db pg_restore -U postgres -d postgres --clean --if-exists --no-owner < /var/backups/thunder/thunder-XXXX.dump` |

## HTTPS (IP sertifikası)

Domain yok; Let's Encrypt doğrudan IP adresine sertifika veriyor (yalnızca `shortlived` profil, **~6 gün** geçerli).
Mobil barkod okuma (kamera) tarayıcıda sadece HTTPS ile çalıştığı için gerekli.

- İstemci: [lego](https://github.com/go-acme/lego) v5 → `/usr/local/bin/lego` (release checksum'ı doğrulanarak kurulur)
- Doğrulama: HTTP-01, webroot `/var/www/acme` (Nginx 80'de `/.well-known/acme-challenge/` servis eder)
- Sertifika: `/etc/lego/certificates/<IP>.crt` → deploy hook ile `/etc/thunder-tls/{fullchain,privkey}.pem` + Nginx reload
- Yenileme: `thunder-tls-renew.timer` 12 saatte bir; kalan süre < 3 gün ise yeniler
- **HSTS yok** (bilerek): yenileme aksarsa HSTS kullanıcıları siteye kilitler

| İş | Komut |
|---|---|
| Sertifika bitiş tarihi | `openssl x509 -in /etc/thunder-tls/fullchain.pem -noout -enddate` |
| Timer durumu | `systemctl list-timers thunder-tls-renew.timer` |
| Son yenileme logu | `journalctl -u thunder-tls-renew.service -n 50` |
| Elle yenile | `systemctl start thunder-tls-renew.service` |

⚠️ 6 gün içinde hiç yenilenemezse tarayıcılar sertifika hatası gösterir. `thunder-tls-check` (cron) kalan süre 2 günün altına düşerse `/var/log/thunder-tls-check.log` ve syslog'a uyarı yazar.

İleride domain alınırsa: DNS A kaydı → `setup-tls.sh` içinde `--domains <domain>` ve `--profile` kaldırılarak klasik 90 günlük sertifikaya geçilebilir; `.env.production.local` → `NEXT_PUBLIC_SUPABASE_URL=https://<domain>` → `./deploy.sh --no-pull`.

## Bilinen notlar

- **Bellek:** VPS planı 8 GB ama hipervizör (VMware balloon) ~5 GB'ı geri alıyor; efektif ~2.5–3 GB. Postgres ayarları buna göre düşük tutuldu (`docker-compose.yml`). Balloon kalkarsa artırılabilir.
- **Tek instance:** Login rate-limit ve kur cache'i bellek içi; PM2 `instances: 1` kalmalı.
- **AI modülü kapalı:** `AI_ENABLED=false`. Açmak için `.env.production.local`'da `AI_ENABLED=true`, `NEXT_PUBLIC_AI_ENABLED=true` + OpenAI/n8n env'leri → `./deploy.sh --no-pull`.
- **Private repo:** `setup-vps.sh` clone edemezse `thunder` kullanıcısı için deploy key oluştur (`ssh-keygen -t ed25519`), GitHub → Repo → Settings → Deploy keys'e ekle, `REPO_URL=git@github.com:...` ile tekrar çalıştır.
