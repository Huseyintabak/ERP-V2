# 🔧 n8n Webhook Timeout Sorunu Çözümü

## Sorun

- ✅ n8n UI'de Respond to Webhook node'unda response görünüyor
- ❌ Terminal'de curl ile test edildiğinde response gelmiyor
- ⚠️ Webhook timeout oluyor olabilir

## Çözümler

### Çözüm 1: Webhook Timeout Ayarlarını Artırın

n8n UI'de:
1. **Webhook Trigger** node'una tıklayın
2. **Options** bölümünü açın
3. **Response Timeout** değerini artırın (örn: 60000 ms = 60 saniye)
4. **Save** butonuna tıklayın

### Çözüm 2: Webhook Response Mode'unu Kontrol Edin

1. **Webhook Trigger** node'una tıklayın
2. **Response Mode** ayarının **"Respond to Webhook"** olduğundan emin olun
3. **Save** butonuna tıklayın

### Çözüm 3: Respond to Webhook Node'unun Çalıştığını Kontrol Edin

1. n8n UI'de **Executions** sekmesine gidin
2. Son execution'ı açın
3. **Respond to Webhook** node'unun çalıştığını kontrol edin
4. Eğer çalışmadıysa, node'un bağlantısını kontrol edin

### Çözüm 4: Curl Timeout Ayarlarını Artırın

Terminal'de:
```bash
curl --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

### Çözüm 5: n8n Container Logs'unu Kontrol Edin

```bash
sudo docker logs thunder-n8n --tail 50
```

## Test

```bash
# Timeout ile test
curl --max-time 60 -v -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

## Beklenen Çıktı

```json
{
  "success": true,
  "agent": "planning",
  "response": "..."
}
```

