# n8n OpenAI Rate Limit Çözümü

## Sorun

OpenAI API rate limit hatası:
```
Rate limit reached for gpt-4o in organization org-xxx on tokens per min (TPM): 
Limit 30000, Used 29196, Requested 2065. 
Please try again in 2.522s.
```

## Neden Oluyor?

1. **Paralel Agent Execution**: 3 agent (Planning, Production, Warehouse) aynı anda çalışıyor
2. **Yüksek Token Kullanımı**: Her agent büyük prompt'lar gönderiyor
3. **TPM Limit**: OpenAI'nin dakika başına token limiti aşılıyor

## Çözümler

### 1. Model Değiştirme (Önerilen - Hızlı Çözüm)

**gpt-4o** yerine **gpt-4o-mini** kullan:
- Daha düşük rate limit ama yeterli performans
- Daha ucuz
- Daha hızlı response

**Değişiklik:**
```json
{
  "parameters": {
    "model": "gpt-4o-mini",  // gpt-4o yerine
    ...
  }
}
```

### 2. Sequential Execution (Alternatif)

Paralel yerine sıralı çalıştır:
- Planning Agent → Production Agent → Warehouse Agent
- Daha yavaş ama rate limit sorunu olmaz

### 3. Request Throttling

Agent'lar arasında delay ekle:
- Planning Agent: 0s
- Production Agent: 3s delay
- Warehouse Agent: 6s delay

### 4. Error Handling ve Retry

Rate limit hatası durumunda otomatik retry:
- Exponential backoff ile retry
- Max 3 deneme
- Her denemede bekleme süresi artar

## Uygulama

### Seçenek 1: Model Değiştirme (En Hızlı)

Tüm agent'larda `gpt-4o` → `gpt-4o-mini`:

1. Planning Agent GPT-4o → gpt-4o-mini
2. Production Agent GPT-4o → gpt-4o-mini
3. Warehouse Agent GPT-4o → gpt-4o-mini
4. Manager Agent GPT-4o → gpt-4o-mini (opsiyonel)

### Seçenek 2: Error Handling Ekleme

Workflow'a Error Trigger ekle:
- Rate limit hatası yakala
- Wait node ile bekle (3-5 saniye)
- Retry yap

### Seçenek 3: Request Throttling

Her agent'tan önce Wait node ekle:
- Planning Agent: 0s
- Production Agent: 3s
- Warehouse Agent: 6s

## Önerilen Çözüm

**Model Değiştirme + Error Handling:**

1. Tüm agent'larda `gpt-4o-mini` kullan
2. Error Trigger ekle (rate limit için)
3. Retry logic ekle

Bu yaklaşım:
- ✅ Rate limit sorununu çözer
- ✅ Maliyeti düşürür
- ✅ Performansı korur
- ✅ Hata durumlarını handle eder

## Test

Rate limit testi için:
```bash
# Hızlı ardışık testler
for i in {1..5}; do
  ./test-multi-agent-consensus.sh
  sleep 5
done
```

## Notlar

- **gpt-4o-mini**: Daha düşük rate limit ama yeterli performans
- **gpt-4o**: Daha yüksek rate limit ama daha pahalı
- Rate limit süresi genellikle 2-5 saniye arası
- Paralel execution rate limit riskini artırır

