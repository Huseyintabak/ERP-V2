# 🔧 n8n Expression Syntax Hatası Düzeltme

## Sorun

- ❌ `=[invalid syntax]` hatası
- ❌ Expression çalışmıyor

## Çözümler

### Çözüm 1: Doğru Expression Formatı

n8n UI'de Respond to Webhook node'una tıklayın ve **Expression** modunda şunu yazın:

```json
={{
  "success": true,
  "agent": "planning",
  "response": $json[0].message.content
}}
```

**ÖNEMLİ:**
- `={{ }}` formatında olmalı (başında `={{` ve sonunda `}}`)
- Expression modunda olmalı ({{ }} işaretleri görünmeli)
- Tırnak işaretleri dikkatli kullanılmalı

### Çözüm 2: Alternatif Syntax (Eğer yukarıdaki çalışmazsa)

```json
={{
  "success": true,
  "agent": "planning",
  "response": $input.item.json[0].message.content
}}
```

### Çözüm 3: Daha Basit Expression

```json
={{
  "success": true,
  "agent": "planning",
  "data": $json[0]
}}
```

### Çözüm 4: Code Node Kullan (En Güvenilir)

Eğer expression çalışmazsa, Code node ekleyin:

1. **Planning Agent** ve **Respond to Webhook** arasına **Code** node ekleyin
2. Code node'da şunu yazın:

```javascript
const input = $input.item.json;
const response = {
  success: true,
  agent: "planning",
  response: input[0].message.content
};

return {
  json: response
};
```

3. Respond to Webhook node'unda:

```json
={{
  "success": $json.success,
  "agent": $json.agent,
  "response": $json.response
}}
```

## Test

1. **Save** butonuna tıklayın
2. Workflow'u test edin (Execute Workflow)
3. Respond to Webhook node'unun output'unu kontrol edin

## Yaygın Hatalar

### Hata 1: Tırnak İşareti Sorunu
```json
// ❌ YANLIŞ
={{
  "success": true,
  "response": "$json[0].message.content"  // Tırnak içinde expression
}}

// ✅ DOĞRU
={{
  "success": true,
  "response": $json[0].message.content  // Tırnak yok
}}
```

### Hata 2: Expression Modunda Değil
```json
// ❌ YANLIŞ (Fixed modunda)
{
  "success": true,
  "response": "{{ $json[0].message.content }}"
}

// ✅ DOĞRU (Expression modunda)
={{
  "success": true,
  "response": $json[0].message.content
}}
```

### Hata 3: Array Index Hatası
```json
// ❌ YANLIŞ
$json.message.content  // Array değil, object

// ✅ DOĞRU
$json[0].message.content  // Array'den ilk eleman
```

## Notlar

- Expression modunda olmalı ({{ }} işaretleri görünmeli)
- `$json[0]` array'den ilk elemanı alır
- `$json[0].message.content` OpenAI node'unun content'ini alır
- Tırnak işaretleri sadece string değerler için kullanılmalı

