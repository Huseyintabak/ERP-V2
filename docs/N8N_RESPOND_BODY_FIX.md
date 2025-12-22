# 🔧 n8n Respond to Webhook Response Body Sorunu

## Sorun

- ✅ n8n UI'de Respond to Webhook node'unda çıktı var
- ✅ HTTP 200 OK geliyor
- ❌ Terminal'de response body boş
- ❌ Thunder ERP API 404 dönüyor

## Çözüm

### n8n UI'de Respond to Webhook Node'unu Düzeltin

1. **Respond to Webhook** node'una tıklayın
2. **Response Body** alanını kontrol edin
3. Expression'ın doğru olduğundan emin olun

#### Doğru Expression:

```json
={{
  "success": true,
  "agent": "planning",
  "response": $json[0].message.content
}}
```

**ÖNEMLİ:** 
- "Fixed" yerine **"Expression"** butonuna tıklayın
- Expression modunda olmalı ({{ }} işaretleri görünmeli)

#### Alternatif (Eğer yukarıdaki çalışmazsa):

```json
={{
  "success": true,
  "agent": "planning",
  "data": $json[0]
}}
```

### Test

1. **Save** butonuna tıklayın
2. Workflow'u test edin
3. Terminal'de test edin:

```bash
curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

## Thunder ERP API 404 Sorunu

PM2 güncellenmiş kodu yüklemiyor olabilir:

```bash
cd /var/www/thunder-erp
git pull origin main
pm2 restart thunder-erp --update-env
```

