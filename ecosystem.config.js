module.exports = {
  apps: [
    {
    name: 'thunder-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/thunder-erp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  },
  {
    // Dolar kurunu her gün 08:00 Türkiye saatinde (05:00 UTC) günceller
    name: 'exchange-rate-cron',
    script: './scripts/refresh-exchange-rate.sh',
    interpreter: '/bin/bash',
    cwd: '/var/www/thunder-erp',
    instances: 1,
    autorestart: false,   // Her çalıştırmadan sonra yeniden başlatma
    cron_restart: '0 5 * * *', // 05:00 UTC = 08:00 Türkiye Saati
    watch: false,
    error_file: './logs/exchange-rate-cron-error.log',
    out_file: './logs/exchange-rate-cron-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }
  ]
};

