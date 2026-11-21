// PM2 — Thunder ERP
// Env değerleri .env.production.local'dan gelir (next start otomatik okur).
// Kurulum: deploy/README.md
const APP_DIR = process.env.THUNDER_APP_DIR || '/var/www/thunder-erp';

module.exports = {
  apps: [
    {
      name: 'thunder-erp',
      cwd: APP_DIR,
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000 -H 127.0.0.1', // sadece localhost — dışarıya Nginx açar
      // PostgREST yanıtı istek URL'sini Content-Location header'ında geri yollar; uzun .in() filtrelerinde
      // (~450+ UUID) Node fetch'in 16 KB header sınırı aşılıp UND_ERR_HEADERS_OVERFLOW alınıyordu.
      node_args: '--max-http-header-size=65536',
      // Tek instance: login rate-limit ve kur cache'i bellek içi
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '127.0.0.1',
        TZ: 'Europe/Istanbul',
      },
      error_file: `${APP_DIR}/logs/pm2-error.log`,
      out_file: `${APP_DIR}/logs/pm2-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
    {
      // Dolar kurunu her gün 08:00 Türkiye saatinde (05:00 UTC) günceller
      name: 'exchange-rate-cron',
      cwd: APP_DIR,
      script: './scripts/refresh-exchange-rate.sh',
      interpreter: '/bin/bash',
      instances: 1,
      autorestart: false,
      cron_restart: '0 5 * * *',
      watch: false,
      error_file: `${APP_DIR}/logs/exchange-rate-cron-error.log`,
      out_file: `${APP_DIR}/logs/exchange-rate-cron-out.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,
    },
  ],
};
