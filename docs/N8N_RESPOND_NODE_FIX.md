# 🔧 Respond to Webhook Node Düzeltme

## Sorun

- ✅ Webhook çalışıyor
- ✅ Response geliyor
- ❌ Tokens ve cost bilgisi gelmiyor (`tokens: 0, cost: 0`)
- ⚠️ Response string olarak geliyor (JSON parse edilmeli)

## Çözüm

### n8n UI'de Respond to Webhook Node'unu Düzeltin

1. **Respond to Webhook** node'una tıklayın
2. **Response Body** alanını şu şekilde güncelleyin:

#### Seçenek 1: Basit Response (Önerilen)

```json
={{
  "success": true,
  "agent": "planning",
  "data": JSON.parse($json[0].message.content),
  "raw_response": $json[0].message.content
}}
```

#### Seçenek 2: Token Bilgisi ile (Eğer usage bilgisi varsa)

```json
={{
  "success": true,
  "agent": "planning",
  "data": JSON.parse($json[0].message.content),
  "tokens": $json[0].usage?.total_tokens || 0,
  "cost": (($json[0].usage?.prompt_tokens || 0) * 0.005 / 1000) + (($json[0].usage?.completion_tokens || 0) * 0.015 / 1000)
}}
```

#### Seçenek 3: Tüm Response'u Döndür

```json
={{
  "success": true,
  "agent": "planning",
  "response": $json[0].message.content,
  "full_data": $json[0]
}}
```

## Test

```bash
curl -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

## Beklenen Çıktı

```json
{
  "success": true,
  "agent": "planning",
  "data": {
    "decision": "needs_review",
    "reasoning": "...",
    "production_plan": {...},
    "confidence": 0.6
  }
}
```

