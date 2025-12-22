# 🔧 n8n Respond to Webhook Expression Düzeltme

## Sorun

`JSON.parse()` n8n expression'larında çalışmıyor.

## Çözümler

### Çözüm 1: Direkt Response (Önerilen)

Response zaten JSON string olarak geliyor, direkt döndürelim:

```json
={{
  "success": true,
  "agent": "planning",
  "response": $json[0].message.content
}}
```

### Çözüm 2: Code Node ile Parse

Eğer JSON parse etmek istiyorsanız, Code node ekleyin:

1. **Planning Agent** ve **Respond to Webhook** arasına **Code** node ekleyin
2. Code node'da:

```javascript
const response = JSON.parse($input.item.json.message.content);
return {
  json: {
    parsed_response: response,
    original: $input.item.json.message.content
  }
};
```

3. Respond to Webhook node'unda:

```json
={{
  "success": true,
  "agent": "planning",
  "data": $json.parsed_response
}}
```

### Çözüm 3: Basit Response (En Kolay)

Sadece response'u döndür:

```json
={{
  "success": true,
  "agent": "planning",
  "response": $json[0].message.content
}}
```

Client tarafında JSON.parse yapabilirsiniz.

