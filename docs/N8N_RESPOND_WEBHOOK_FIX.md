# 🔧 n8n Respond to Webhook Node Düzeltme

## Sorun

- ✅ Input geliyor (OpenAI node'dan response var)
- ❌ Output input ile aynı (expression çalışmıyor)
- ❌ Response body boş veya geçersiz JSON

## Çözüm

### n8n UI'de Respond to Webhook Node'unu Düzeltin

1. **Respond to Webhook** node'una tıklayın
2. **Response Body** alanını bulun
3. **"Fixed"** yerine **"Expression"** butonuna tıklayın (çok önemli!)
4. Expression alanına şunu yazın:

```json
={{
  "success": true,
  "agent": "planning",
  "response": $json[0].message.content
}}
```

**ÖNEMLİ:**
- Expression modunda olmalı ({{ }} işaretleri görünmeli)
- "Fixed" modunda olmamalı
- `$json[0].message.content` kullanmalı (array'den ilk eleman)

### Alternatif: Daha Basit Expression

Eğer yukarıdaki çalışmazsa, şunu deneyin:

```json
={{
  "success": true,
  "agent": "planning",
  "data": $json[0]
}}
```

### Test

1. **Save** butonuna tıklayın
2. Workflow'u test edin (Execute Workflow)
3. Respond to Webhook node'unun output'unu kontrol edin
4. Terminal'de test edin:

```bash
curl -s --max-time 60 -X POST http://192.168.1.250:5678/webhook/planning-agent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "100 adet Ürün A için üretim planı oluştur"}'
```

## Beklenen Output

```json
{
  "success": true,
  "agent": "planning",
  "response": "{\n  \"decision\": \"approved\",\n  \"reasoning\": \"...\",\n  \"production_plan\": {...},\n  \"confidence\": 0.95\n}"
}
```

## Notlar

- Expression modunda olmalı ({{ }} işaretleri görünmeli)
- "Fixed" modunda olmamalı
- `$json[0]` array'den ilk elemanı alır
- `$json[0].message.content` OpenAI node'unun content'ini alır

