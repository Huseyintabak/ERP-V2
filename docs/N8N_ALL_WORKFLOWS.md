# 📋 n8n Tüm Workflow'lar

## ✅ Oluşturulan Workflow'lar

### 1. Planning Agent
- **Webhook Path:** `/webhook/planning-agent`
- **JSON Dosyası:** `n8n-workflows/planning-agent-final.json`
- **Görevler:**
  - Sipariş bilgilerini analiz et
  - BOM (Bill of Materials) kontrol et
  - Stok durumunu değerlendir
  - Üretim sürelerini hesapla
  - Optimum üretim planı oluştur

### 2. Production Agent
- **Webhook Path:** `/webhook/production-agent`
- **JSON Dosyası:** `n8n-workflows/production-agent-final.json`
- **Görevler:**
  - Üretim planlarını analiz et
  - Operatör atamalarını değerlendir
  - Üretim süreçlerini optimize et
  - Kalite kontrol süreçlerini yönet
  - Üretim performansını izle

### 3. Warehouse Agent
- **Webhook Path:** `/webhook/warehouse-agent`
- **JSON Dosyası:** `n8n-workflows/warehouse-agent-final.json`
- **Görevler:**
  - Stok durumunu analiz et
  - Depo zone'larını yönet
  - Stok hareketlerini takip et
  - Malzeme rezervasyonlarını kontrol et
  - Depo optimizasyon önerileri sun

### 4. Purchase Agent
- **Webhook Path:** `/webhook/purchase-agent`
- **JSON Dosyası:** `n8n-workflows/purchase-agent-final.json`
- **Görevler:**
  - Tedarikçi analizi yap
  - Satın alma taleplerini değerlendir
  - Fiyat karşılaştırması yap
  - Satın alma siparişlerini optimize et
  - Tedarik sürelerini yönet

### 5. Manager Agent
- **Webhook Path:** `/webhook/manager-agent`
- **JSON Dosyası:** `n8n-workflows/manager-agent-final.json`
- **Görevler:**
  - Stratejik kararlar al
  - Çoklu agent konsensüsü oluştur
  - Kritik onayları değerlendir
  - Sistem performansını analiz et
  - İş süreçlerini optimize et

### 6. Developer Agent
- **Webhook Path:** `/webhook/developer-agent`
- **JSON Dosyası:** `n8n-workflows/developer-agent-final.json`
- **Görevler:**
  - Sistem performansını analiz et
  - Kod kalitesini değerlendir
  - Hata analizi yap
  - Optimizasyon önerileri sun
  - Teknik dokümantasyon oluştur

---

## 📥 Import Adımları

### n8n UI'de:

1. **Workflows** → **Import from JSON**
2. İlgili JSON dosyasını kopyalayıp yapıştırın
3. **Import** butonuna tıklayın
4. **Planning Agent (GPT-4o)** node'una tıklayın
5. **Credentials** → OpenAI API credential'ınızı seçin
6. **Save** butonuna tıklayın
7. Workflow'u **Active** yapın (sağ üstte toggle)

---

## 🧪 Test Komutları

### Planning Agent

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "planning",
    "prompt": "100 adet Ürün A için üretim planı oluştur",
    "context": {}
  }'
```

### Production Agent

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "production",
    "prompt": "Üretim planı #123 için operatör ataması yap",
    "context": {}
  }'
```

### Warehouse Agent

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "warehouse",
    "prompt": "Zone A stok durumunu analiz et",
    "context": {}
  }'
```

### Purchase Agent

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "purchase",
    "prompt": "Malzeme X için tedarikçi analizi yap",
    "context": {}
  }'
```

### Manager Agent

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "manager",
    "prompt": "Kritik sipariş #456 için onay kararı ver",
    "context": {}
  }'
```

### Developer Agent

```bash
curl -X POST http://192.168.1.250:3000/api/ai/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "developer",
    "prompt": "Sistem performansını analiz et ve optimizasyon öner",
    "context": {}
  }'
```

---

## 💻 TypeScript Kullanımı

```typescript
import { getN8nClient } from '@/lib/ai/n8n-client';

const client = getN8nClient();

// Planning Agent
const planningResult = await client.runPlanningAgent(
  "100 adet Ürün A için üretim planı oluştur",
  { plan_id: "123", order_id: "456" }
);

// Production Agent
const productionResult = await client.runProductionAgent(
  "Üretim planı #123 için operatör ataması yap",
  { production_log_id: "789", operator_id: "op-1" }
);

// Warehouse Agent
const warehouseResult = await client.runWarehouseAgent(
  "Zone A stok durumunu analiz et",
  { zone_id: "zone-1", material_id: "mat-1" }
);

// Purchase Agent
const purchaseResult = await client.runPurchaseAgent(
  "Malzeme X için tedarikçi analizi yap",
  { purchase_order_id: "po-1", supplier_id: "sup-1" }
);

// Manager Agent
const managerResult = await client.runManagerAgent(
  "Kritik sipariş #456 için onay kararı ver",
  { approval_id: "app-1", decision_type: "critical" }
);

// Developer Agent
const developerResult = await client.runDeveloperAgent(
  "Sistem performansını analiz et ve optimizasyon öner",
  { system_metric: "performance", optimization_area: "database" }
);
```

---

## 📁 Dosya Yapısı

```
n8n-workflows/
├── planning-agent-final.json      ✅
├── production-agent-final.json    ✅
├── warehouse-agent-final.json     ✅
├── purchase-agent-final.json      ✅
├── manager-agent-final.json        ✅
└── developer-agent-final.json     ✅
```

---

## ✅ Durum

- ✅ Planning Agent - Tamamlandı ve test edildi
- ✅ Production Agent - JSON hazır
- ✅ Warehouse Agent - JSON hazır
- ✅ Purchase Agent - JSON hazır
- ✅ Manager Agent - JSON hazır
- ✅ Developer Agent - JSON hazır

---

**📅 Oluşturulma Tarihi:** 2025-01-27  
**✅ Durum:** Tüm workflow'lar hazır, import edilmeyi bekliyor!

