# PM2 Environment Variables Kontrolü

## Sorun
PM2 loglarında hala "Failed to save agent log to database" hataları görünüyor, ancak kod production'da silent fail yapıyor.

## Kontrol Adımları

### 1. PM2 Environment Variables Kontrolü

Sunucuda şu komutu çalıştırın:
```bash
pm2 show thunder-erp
```

**Beklenen:** `NODE_ENV: production` görünmeli

### 2. PM2 Environment Güncelleme

Eğer `NODE_ENV` set edilmemişse:

```bash
# PM2 ecosystem dosyasını güncelle
cd /var/www/thunder-erp

# ecosystem.config.js dosyasını kontrol et
cat ecosystem.config.js
```

`ecosystem.config.js` dosyasında şunlar olmalı:
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000
}
```

### 3. PM2 Restart (Environment Variables ile)

```bash
pm2 restart thunder-erp --update-env
```

Veya ecosystem dosyasını kullanarak:
```bash
pm2 restart ecosystem.config.js --update-env
```

### 4. Yeni Test İşlemi

Sipariş onayı yapın ve yeni logları kontrol edin:
```bash
# Yeni bir sipariş onayı yapın (UI'dan)
# Sonra logları kontrol edin
pm2 logs thunder-erp --lines 50 | grep -i "failed\|error"
```

**Beklenen:** Yeni işlemlerde "Failed to save agent log" hatası görünmemeli.

### 5. NODE_ENV Manuel Set

Eğer hala sorun varsa, environment variable'ı manuel set edin:

```bash
# PM2'yi durdur
pm2 stop thunder-erp

# Environment variable ile başlat
NODE_ENV=production pm2 start ecosystem.config.js --update-env

# Veya ecosystem.config.js'de env bölümüne ekleyin
```

## Notlar

- **Eski loglar:** Restart öncesinden kalan hatalar log dosyasında kalabilir
- **Yeni işlemler:** Sadece yeni işlemlerden sonraki logları kontrol edin
- **Silent Fail:** Production'da network hataları artık loglanmıyor (graceful degradation)

