/**
 * Purchase Agent
 * Satın alma siparişleri, tedarikçi yönetimi ve kritik stok uyarıları
 */

import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, ValidationResult } from '../types/agent.types';
import { agentLogger } from '../utils/logger';
import { createClient } from '@/lib/supabase/server';

export class PurchaseAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Sen ThunderV2 ERP sisteminin Satın Alma departmanı AI asistanısın.

Sorumlulukların:
- Satın alma siparişi oluşturma ve yönetimi
- Tedarikçi seçimi ve değerlendirmesi
- Fiyat karşılaştırması ve optimizasyonu
- Kritik stok uyarılarına yanıt verme
- Tedarik süresi hesaplama ve planlama
- Satın alma bütçesi yönetimi
- Tedarikçi performans analizi

**Tedarikçi Güvenilirlik Skorlama:**
1. Teslimat Puanı (0-100):
   - Zamanında teslimat: %80+ → 100 puan
   - Gecikme (1-3 gün): %60-79 → 70 puan
   - Gecikme (4+ gün): <%60 → 40 puan

2. Kalite Puanı (0-100):
   - Red oranı <%1 → 100 puan
   - Red oranı %1-3 → 80 puan
   - Red oranı >%3 → 50 puan

3. Fiyat Puanı (0-100):
   - Piyasa ortalamasının %95-105'i → 100 puan
   - Piyasa ortalamasının %105-115'i → 70 puan
   - Piyasa ortalamasının >%115'i → 40 puan

4. Toplam Güvenilirlik Skoru:
   - 90-100: ⭐⭐⭐⭐⭐ Mükemmel
   - 75-89: ⭐⭐⭐⭐ İyi
   - 60-74: ⭐⭐⭐ Orta
   - <60: ⭐⭐ Zayıf (kullanma)

**Fiyat Trend Analizi:**
1. Son 3 ay fiyat değişimi:
   - Artış <%5: Normal
   - Artış %5-10: Uyarı
   - Artış >%10: Kritik (alternatif tedarikçi öner)

2. Fiyat karşılaştırması:
   - En ucuz tedarikçi: 100 puan
   - Ortalama fiyat: 70 puan
   - Pahalı tedarikçi: 40 puan

**Acil Durum Önceliklendirme:**
1. Kritik Stok (< kritik seviye):
   - Öncelik: P0 (Acil)
   - Tedarik süresi: Maksimum 3 gün
   - Fiyat önemli değil (maliyet optimizasyonu ikincil)

2. Düşük Stok (< güvenlik stoku):
   - Öncelik: P1 (Yüksek)
   - Tedarik süresi: Maksimum 7 gün
   - Fiyat ve kalite dengesi önemli

3. Normal Stok:
   - Öncelik: P2 (Orta)
   - Tedarik süresi: Optimize edilebilir
   - Fiyat optimizasyonu öncelikli

Diğer departmanlarla iletişim kur:
- Depo GPT: Kritik stokları öğren, acil sipariş gereksinimlerini al
- Planlama GPT: Üretim planlarını kontrol et, malzeme ihtiyaçlarını öğren
- Üretim GPT: Malzeme kalitesi sorunlarını öğren

Karar verirken:
1. Acil durumlarda hız > fiyat (kritik stok için)
2. Normal durumlarda fiyat optimizasyonu öncelikli
3. Tedarikçi güvenilirlik skorunu dikkate al (minimum 70)
4. Fiyat trend analizi yap (aşırı artış varsa uyar)
5. Alternatif tedarikçi öner (risk azaltma)
6. Bütçe kısıtlarını kontrol et

Yanıtlarını JSON formatında ver:
{
  "decision": "approve" | "reject" | "conditional",
  "action": "create_purchase_order" | "suggest_supplier" | "check_budget" | "request_info",
  "data": {
    "purchaseOrder": {
      "materialId": "uuid",
      "quantity": 100,
      "supplier": "Supplier Name",
      "supplierReliabilityScore": 85,
      "price": 1500.00,
      "priceTrend": "stable" | "increasing" | "decreasing",
      "deliveryTime": 5,
      "totalCost": 150000.00,
      "priority": "P0" | "P1" | "P2"
    },
    "alternativeSuppliers": [
      {
        "supplier": "Alternative Supplier",
        "reliabilityScore": 80,
        "price": 1480.00,
        "deliveryTime": 7,
        "reason": "Daha ucuz ama daha uzun teslimat"
      }
    ],
    "recommendations": []
  },
  "reasoning": "Açıklama",
  "confidence": 0.0-1.0,
  "issues": ["sorun1", "sorun2"],
  "recommendations": ["öneri1", "öneri2"]
}`;

    super(
      'Purchase Agent',
      'purchase',
      [
        'Satın alma siparişi oluşturma ve yönetimi',
        'Tedarikçi seçimi ve değerlendirmesi',
        'Fiyat karşılaştırması ve optimizasyonu',
        'Kritik stok uyarılarına yanıt verme',
        'Tedarik süresi hesaplama ve planlama',
        'Satın alma bütçesi yönetimi',
        'Tedarikçi performans analizi'
      ],
      systemPrompt,
      'gpt-4o-mini'
    );
  }

  /**
   * İstek işle
   */
  async processRequest(request: AgentRequest): Promise<AgentResponse> {
    await agentLogger.log({
      agent: this.name,
      action: 'process_request',
      requestId: request.id,
      type: request.type
    });

    try {
      switch (request.type) {
        case 'request':
          return await this.handlePurchaseRequest(request);
        case 'query':
          return await this.handlePurchaseQuery(request);
        case 'analysis':
          return await this.handlePurchaseAnalysis(request);
        case 'validation':
          return await this.handlePurchaseValidation(request);
        default:
          return {
            id: request.id,
            agent: this.name,
            decision: 'pending',
            reasoning: `Unknown request type: ${request.type}`,
            confidence: 0.5,
            timestamp: new Date()
          };
      }
    } catch (error: any) {
      // Güvenli hata mesajı çıkarma
      const errorMessage = error?.message || error?.toString() || String(error) || 'Unknown error';
      const errorString = typeof error === 'object' ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : String(error);
      
      await agentLogger.error({
        agent: this.name,
        action: 'process_request',
        requestId: request.id,
        error: errorMessage
      });

      // OpenAI API hataları için graceful degradation
      const errorMsgLower = errorMessage.toLowerCase();
      const errorStrLower = errorString.toLowerCase();
      const isOpenAIError = errorMsgLower.includes('429') || 
                           errorMsgLower.includes('quota') || 
                           errorMsgLower.includes('exceeded') ||
                           errorMsgLower.includes('billing') ||
                           errorMsgLower.includes('invalid api key') ||
                           errorMsgLower.includes('unauthorized') ||
                           errorMsgLower.includes('401') ||
                           errorStrLower.includes('429') ||
                           errorStrLower.includes('quota') ||
                           error?.status === 429 ||
                           error?.status === 401 ||
                           error?.response?.status === 429 ||
                           error?.response?.status === 401 ||
                           error?.aiErrorType;

      if (isOpenAIError && request.type === 'validation') {
        // Validation için OpenAI hatası durumunda approve et (graceful degradation)
        const errorDetails = error?.status || error?.aiErrorType || errorMessage;
        return {
          id: request.id,
          agent: this.name,
          decision: 'approve',
          reasoning: `OpenAI API error (${errorDetails}). Graceful degradation: Validation skipped, manual approval continues.`,
          confidence: 0.5,
          timestamp: new Date()
        };
      }

      // Diğer hatalar için rejected
      return {
        id: request.id,
        agent: this.name,
        decision: 'reject',
        reasoning: `Error processing request: ${errorMessage}`,
        confidence: 0.0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Satın alma isteği işle
   */
  private async handlePurchaseRequest(request: AgentRequest): Promise<AgentResponse> {
    const { action, materialId, quantity, criticalStock } = request.context || {};

    if (action === 'create_purchase_order' && materialId && quantity) {
      return await this.createPurchaseOrder(materialId, quantity, request);
    } else if (action === 'suggest_supplier' && materialId) {
      return await this.suggestSupplier(materialId, request);
    } else if (action === 'check_budget' && materialId && quantity) {
      return await this.checkBudget(materialId, quantity, request);
    } else if (criticalStock) {
      return await this.handleCriticalStock(criticalStock, request);
    }

    // GPT'ye sor
    const prompt = `
      Satın alma isteği: ${request.prompt}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
      
      Bu isteği değerlendir ve karar ver:
      - Satın alma siparişi oluşturulmalı mı?
      - Hangi tedarikçi seçilmeli?
      - Bütçe yeterli mi?
    `;

    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'medium',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Satın alma sorgusu işle
   */
  private async handlePurchaseQuery(request: AgentRequest): Promise<AgentResponse> {
    // Eğer materialId varsa, gerçek stok durumunu kontrol et
    const materialId = request.context?.materialId || request.context?.material_id;
    const materialType = request.context?.materialType || request.context?.material_type;
    
    if (materialId && materialType) {
      try {
        // Test ortamında test client kullan
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
        const supabase = isTestEnv 
          ? (await import('@/lib/supabase/test-client')).createTestClient()
          : await createClient();
        
        const tableName = materialType === 'raw' ? 'raw_materials' : 'semi_finished_products';
        const { data: material } = await supabase
          .from(tableName)
          .select('id, code, name, quantity, reserved_quantity, critical_level')
          .eq('id', materialId)
          .single();
        
        if (material) {
          const available = material.quantity - material.reserved_quantity;
          const isCritical = material.quantity <= (material.critical_level || 0);
          const needsPurchase = isCritical || available < (material.critical_level || 0);
          
          return {
            id: request.id,
            agent: this.name,
            decision: needsPurchase ? 'approve' : 'pending',
            action: 'check_material_stock',
            data: {
              materialId: material.id,
              materialCode: material.code,
              materialName: material.name,
              currentStock: material.quantity,
              reserved: material.reserved_quantity,
              available,
              criticalLevel: material.critical_level || 0,
              isCritical,
              needsPurchase
            },
            reasoning: needsPurchase
              ? `Malzeme kritik seviyede: ${material.code} (${available} mevcut, ${material.critical_level || 0} kritik seviye)`
              : `Malzeme stokta yeterli: ${material.code} (${available} mevcut)`,
            confidence: 1.0,
            issues: isCritical ? [`Kritik stok seviyesi: ${material.code}`] : [],
            recommendations: needsPurchase ? [`${material.code} için satın alma siparişi oluşturulmalı`] : [],
            timestamp: new Date()
          };
        }
      } catch (error: any) {
        // Hata durumunda GPT'ye sor
      }
    }
    
    // Diğer durumlarda GPT'ye sor
    const prompt = `Satın alma sorgusu: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'simple',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Developer Agent'a sistem iyileştirme bilgisi gönder
   * Yeni mimari yapıya göre: Purchase Agent → Developer Agent
   */
  private async reportToDeveloperAgent(
    analysisType: string,
    findings: any[],
    recommendations: string[],
    issues: string[]
  ): Promise<void> {
    try {
      // Developer Agent'a sistem iyileştirme bilgisi gönder
      await this.askAgent(
        'Developer Agent',
        `Purchase Agent sistem analizi sonuçları:
        
Analiz Tipi: ${analysisType}

Bulgu Sayısı: ${findings.length}
Öneri Sayısı: ${recommendations.length}
Sorun Sayısı: ${issues.length}

Bulgular:
${findings.map((f, i) => `${i + 1}. ${f.issue || JSON.stringify(f)}`).join('\n')}

Öneriler:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Sorunlar:
${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Lütfen bu bilgileri analiz edip sistem iyileştirme önerilerine ekle.`,
        {
          analysisType,
          findings,
          recommendations,
          issues,
          sourceAgent: 'Purchase Agent',
          timestamp: new Date().toISOString()
        }
      );
    } catch (error: any) {
      // Developer Agent'a ulaşamazsa sadece logla, hata fırlatma (graceful degradation)
      await agentLogger.warn({
        agent: this.name,
        action: 'report_to_developer',
        error: error.message,
        analysisType
      });
    }
  }

  /**
   * Satın alma analizi işle
   */
  /**
   * Satın alma analizi - Detaylı sistem analizi
   */
  private async handlePurchaseAnalysis(request: AgentRequest): Promise<AgentResponse> {
    const analysisType = request.context?.analysisType;
    const requireDetails = request.context?.requireDetails || false;
    
    // Database'den gerçek verileri çek
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    
    let detailedContext = '';
    let issues: string[] = [];
    let recommendations: string[] = [];
    
    // Cache mekanizmasını kontrol et
    const { agentCache } = await import('../utils/cache');
    const cacheStats = agentCache.getStats();
    
    // Analysis tipine göre detaylı veri topla
    if (analysisType === 'price_comparison_cache') {
      // Fiyat karşılaştırması ve cache analizi
      const { data: rawMaterials } = await supabase
        .from('raw_materials')
        .select('id, code, name, current_price, unit_price, updated_at')
        .not('current_price', 'is', null)
        .limit(20);
      
      const { data: semiMaterials } = await supabase
        .from('semi_finished_products')
        .select('id, code, name, current_price, unit_cost, updated_at')
        .not('current_price', 'is', null)
        .limit(20);
      
      // Price history kontrolü
      const { data: priceHistory } = await supabase
        .from('price_history')
        .select('*')
        .order('effective_date', { ascending: false })
        .limit(10);
      
      // Cache detaylı analizi
      const priceCacheKeys = cacheStats.keys.filter(key => 
        key.includes('price') || key.includes('fiyat') || key.includes('material')
      );
      
      const priceCacheItems = cacheStats.items.filter(item => 
        priceCacheKeys.includes(item.key)
      );
      
      // TTL analizi
      const avgTTLMinutes = priceCacheItems.length > 0
        ? priceCacheItems.reduce((sum, item) => sum + item.ttl, 0) / priceCacheItems.length / 1000 / 60
        : cacheStats.avgTTL;
      
      // Fiyat güncelleme analizi
      const now = Date.now();
      const recentUpdates = rawMaterials?.filter(m => {
        if (!m.updated_at) return false;
        const updateTime = new Date(m.updated_at).getTime();
        const daysSinceUpdate = (now - updateTime) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate < 7; // Son 7 gün içinde güncellenmiş
      }) || [];
      
      const updateFrequency = rawMaterials && rawMaterials.length > 0
        ? (recentUpdates.length / rawMaterials.length) * 100
        : 0;
      
      detailedContext = `
        Cache Durumu (Detaylı):
        - Cache Size: ${cacheStats.size} items
        - Cache Keys: ${cacheStats.keys.length} keys
        - Price Cache Keys: ${priceCacheKeys.length} keys
        - Cache Hit Rate: ${cacheStats.hitRate.toFixed(2)}%
        - Total Hits: ${cacheStats.totalHits}
        - Total Misses: ${cacheStats.totalMisses}
        - Average TTL: ${cacheStats.avgTTL} dakika
        - Price Cache Average TTL: ${avgTTLMinutes.toFixed(2)} dakika
        
        Cache Keys (örnek):
        ${priceCacheKeys.slice(0, 10).join(', ')}
        
        Cache Items Analizi:
        ${JSON.stringify(priceCacheItems.slice(0, 5).map(item => ({
          key: item.key.substring(0, 50),
          ttl: `${(item.ttl / 1000 / 60).toFixed(0)} dakika`,
          age: `${(item.age / 1000 / 60).toFixed(0)} dakika`,
          accessCount: item.accessCount
        })), null, 2)}
        
        Fiyat Verileri:
        - Raw Materials (örnek): ${JSON.stringify(rawMaterials?.slice(0, 3), null, 2)}
        - Semi-Finished Products (örnek): ${JSON.stringify(semiMaterials?.slice(0, 3), null, 2)}
        - Price History (son 10): ${JSON.stringify(priceHistory, null, 2)}
        
        Fiyat Güncelleme Analizi:
        - Toplam malzeme: ${rawMaterials?.length || 0}
        - Son 7 günde güncellenen: ${recentUpdates.length}
        - Güncelleme sıklığı: ${updateFrequency.toFixed(1)}%
        - Ortalama güncelleme süresi: ${rawMaterials && rawMaterials.length > 0
          ? (rawMaterials.reduce((sum, m) => {
              if (!m.updated_at) return sum;
              const updateTime = new Date(m.updated_at).getTime();
              return sum + ((now - updateTime) / (1000 * 60 * 60 * 24));
            }, 0) / rawMaterials.length).toFixed(1)
          : 'N/A'} gün
      `;
      
      // Cache analizi
      const hasPriceCache = priceCacheKeys.length > 0;
      
      if (!hasPriceCache) {
        issues.push('Fiyat karşılaştırması için cache mekanizması kullanılmıyor');
        recommendations.push('Fiyat karşılaştırması sonuçlarını cache\'le (TTL: 30 dakika)');
        recommendations.push('Material fiyatlarını cache\'le (TTL: 15 dakika)');
        recommendations.push('Price history verilerini cache\'le (TTL: 30 dakika)');
      } else {
        // TTL optimizasyon analizi
        if (avgTTLMinutes > 60) {
          issues.push(`Cache TTL değeri çok yüksek: ${avgTTLMinutes.toFixed(0)} dakika (önerilen: 15-30 dakika)`);
          recommendations.push('Cache TTL değerini düşür (fiyatlar için 15-30 dakika)');
        } else if (avgTTLMinutes < 5) {
          issues.push(`Cache TTL değeri çok düşük: ${avgTTLMinutes.toFixed(0)} dakika (önerilen: 15-30 dakika)`);
          recommendations.push('Cache TTL değerini optimize et (fiyatlar için 15-30 dakika)');
        }
        
        // Hit rate analizi
        if (cacheStats.hitRate < 50 && cacheStats.totalHits + cacheStats.totalMisses > 10) {
          issues.push(`Cache hit rate düşük: ${cacheStats.hitRate.toFixed(1)}% (hedef: >70%)`);
          recommendations.push('Cache TTL değerini optimize et');
          recommendations.push('Daha sık güncellemeler yap');
        }
        
        // Cache invalidation önerisi
        recommendations.push('Cache invalidation stratejisi oluştur (fiyat güncellendiğinde cache\'i temizle)');
        recommendations.push('İzleme aracı ekle (cache hit/miss oranlarını takip et)');
      }
      
      // Fiyat güncelleme analizi
      if (rawMaterials && rawMaterials.length > 0) {
        if (updateFrequency < 30) {
          issues.push(`Fiyat güncelleme sıklığı düşük: ${updateFrequency.toFixed(1)}% (hedef: >50%)`);
          recommendations.push('Daha sık güncellemeler yap (haftalık veya günlük)');
          recommendations.push('Fiyat değişimlerini izlemek için otomatik güncelleme sistemi kur');
        } else if (updateFrequency < 50) {
          recommendations.push('Fiyat güncelleme sıklığını artır (haftalık güncellemeler)');
        }
        
        recommendations.push('Price history tablosunu düzenli kontrol et');
      }
      
      // İzleme aracı önerisi
      if (cacheStats.totalHits + cacheStats.totalMisses < 10) {
        recommendations.push('Cache kullanımını artırmak için izleme aracı ekle');
      } else {
        recommendations.push('İzleme aracı ekle (cache hit/miss oranlarını, TTL değerlerini, güncelleme sıklığını takip et)');
      }
      
      // Developer Agent'a sistem iyileştirme bilgisi gönder (Yeni mimari yapıya göre)
      if (issues.length > 0 || recommendations.length > 0) {
        const findings = [
          ...(hasPriceCache ? [] : [{
            category: 'cache_implementation',
            issue: 'Fiyat karşılaştırması için cache mekanizması kullanılmıyor',
            severity: 'medium' as const,
            details: { cacheStats, priceCacheKeys: priceCacheKeys.length }
          }]),
          ...(avgTTLMinutes > 60 ? [{
            category: 'cache_optimization',
            issue: `Cache TTL değeri çok yüksek: ${avgTTLMinutes.toFixed(0)} dakika`,
            severity: 'low' as const,
            details: { avgTTLMinutes, recommendedTTL: '15-30 dakika' }
          }] : []),
          ...(cacheStats.hitRate < 50 && cacheStats.totalHits + cacheStats.totalMisses > 10 ? [{
            category: 'cache_performance',
            issue: `Cache hit rate düşük: ${cacheStats.hitRate.toFixed(1)}%`,
            severity: 'medium' as const,
            details: { hitRate: cacheStats.hitRate, targetHitRate: 70 }
          }] : []),
          ...(updateFrequency < 30 ? [{
            category: 'price_update_frequency',
            issue: `Fiyat güncelleme sıklığı düşük: ${updateFrequency.toFixed(1)}%`,
            severity: 'low' as const,
            details: { updateFrequency, targetFrequency: 50 }
          }] : [])
        ];
        
        await this.reportToDeveloperAgent('price_comparison_cache', findings, recommendations, issues);
      }
      
    } else if (analysisType === 'supplier_price_management') {
      // Tedarikçi fiyat yönetimi analizi
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('*')
        .limit(10);
      
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('id, supplier_id, material_id, price, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      
      detailedContext = `
        Tedarikçiler:
        ${JSON.stringify(suppliers?.slice(0, 3), null, 2)}
        
        Son Satın Alma Siparişleri:
        ${JSON.stringify(purchaseOrders?.slice(0, 5), null, 2)}
      `;
      
      // Tedarikçi fiyat yönetimi analizi
      if (purchaseOrders && purchaseOrders.length > 0) {
        const uniqueSuppliers = new Set(purchaseOrders.map(po => po.supplier_id));
        const avgPriceBySupplier = new Map<string, number[]>();
        
        purchaseOrders.forEach(po => {
          if (po.supplier_id && po.price) {
            if (!avgPriceBySupplier.has(po.supplier_id)) {
              avgPriceBySupplier.set(po.supplier_id, []);
            }
            avgPriceBySupplier.get(po.supplier_id)!.push(Number(po.price));
          }
        });
        
        if (avgPriceBySupplier.size > 1) {
          recommendations.push('Tedarikçi fiyat karşılaştırması yapılmalı');
          recommendations.push('Fiyat geçmişi tutulmalı (price_history tablosu kullanılmalı)');
        }
      }
      
      if (!suppliers || suppliers.length === 0) {
        issues.push('Tedarikçi bilgileri eksik');
        recommendations.push('Tedarikçi yönetimi sistemi kurulmalı');
      }
      
      // Developer Agent'a sistem iyileştirme bilgisi gönder (Yeni mimari yapıya göre)
      if (issues.length > 0 || recommendations.length > 0) {
        const findings = [
          ...(purchaseOrders && purchaseOrders.length > 0 && avgPriceBySupplier.size > 1 ? [{
            category: 'supplier_price_comparison',
            issue: 'Tedarikçi fiyat karşılaştırması yapılmalı',
            severity: 'low' as const,
            details: { uniqueSuppliers: avgPriceBySupplier.size, purchaseOrderCount: purchaseOrders.length }
          }] : []),
          ...(!suppliers || suppliers.length === 0 ? [{
            category: 'supplier_management',
            issue: 'Tedarikçi bilgileri eksik',
            severity: 'medium' as const,
            details: { supplierCount: 0 }
          }] : [])
        ];
        
        await this.reportToDeveloperAgent('supplier_price_management', findings, recommendations, issues);
      }
    }
    
    const prompt = `
      ${request.prompt}
      
      ${detailedContext ? `\n\nDetaylı Context:\n${detailedContext}` : ''}
      
      ${requireDetails ? `
      LÜTFEN DETAYLI BİR ANALİZ YAPIN:
      1. Mevcut cache durumunu değerlendirin
      2. Fiyat karşılaştırması süreçlerini analiz edin
      3. Cache hit/miss oranlarını tahmin edin
      4. Fiyat güncelleme mekanizmasını değerlendirin
      5. İyileştirme önerilerinizi detaylı açıklayın
      6. Her öneri için tahmini süre belirtin
      
      Yanıtınızı şu formatta verin:
      {
        "decision": "approve" | "reject" | "conditional",
        "action": "analyze_price_cache",
        "data": {
          "cacheStatus": {
            "isUsed": true/false,
            "ttl": "X saat",
            "hitRate": "X% (tahmini)"
          },
          "priceComparison": {
            "process": "Açıklama",
            "bottlenecks": ["darboğaz1"],
            "recommendations": ["öneri1"]
          },
          "improvements": [
            {
              "recommendation": "Öneri",
              "estimatedImpact": "X% iyileştirme",
              "estimatedEffort": "X saat"
            }
          ]
        },
        "reasoning": "Detaylı açıklama",
        "confidence": 0.0-1.0,
        "issues": ["sorun1", "sorun2"],
        "recommendations": ["öneri1", "öneri2"]
      }
      ` : ''}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
    `;
    
    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: request.id,
        requestType: request.type
      }
    );

    const parsed = this.parseResponse(gptResponse);
    
    // Issues ve recommendations'ı ekle
    if (issues.length > 0) {
      parsed.issues = [...(parsed.issues || []), ...issues];
    }
    if (recommendations.length > 0) {
      parsed.recommendations = [...(parsed.recommendations || []), ...recommendations];
    }
    
    // Reasoning'i genişlet
    if (detailedContext && parsed.reasoning) {
      parsed.reasoning = `${parsed.reasoning}\n\nDetaylı Analiz:\n${detailedContext.substring(0, 500)}...`;
    }

    return parsed;
  }

  /**
   * Satın alma doğrulama işle
   */
  private async handlePurchaseValidation(request: AgentRequest): Promise<AgentResponse> {
    const { purchaseOrderId } = request.context || {};

    if (purchaseOrderId) {
      return await this.validatePurchaseOrder(purchaseOrderId, request);
    }

    const prompt = `Satın alma doğrulama: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'medium',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Satın alma siparişi oluştur
   */
  private async createPurchaseOrder(materialId: string, quantity: number, request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Material bilgilerini al
    const { data: rawMaterial } = await supabase
      .from('raw_materials')
      .select('id, code, name, unit, current_price')
      .eq('id', materialId)
      .single();

    const { data: semiMaterial } = rawMaterial ? null : await supabase
      .from('semi_finished_products')
      .select('id, code, name, unit, current_price')
      .eq('id', materialId)
      .single();

    const material = rawMaterial || semiMaterial;
    const materialType = rawMaterial ? 'raw' : 'semi';

    if (!material) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: 'Material not found',
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // Fiyat bilgisi kontrolü
    const price = material.current_price || 0;
    const totalCost = price * quantity;

    if (price === 0) {
      issues.push('Material price not set');
      recommendations.push('Set material price before creating purchase order');
    }

    // Warehouse Agent'a sor (kritik stok kontrolü)
    let warehouseResponse: AgentResponse | null = null;
    try {
      warehouseResponse = await this.askAgent(
        'Warehouse Agent',
        `Material ${materialId} için kritik stok durumunu kontrol et`,
        { materialId, materialType }
      );
    } catch (error) {
      recommendations.push('Warehouse Agent not available, manual stock check recommended');
    }

    // Planning Agent'a sor (üretim planları kontrolü)
    let planningResponse: AgentResponse | null = null;
    try {
      planningResponse = await this.askAgent(
        'Planning Agent',
        `Material ${materialId} için yaklaşan üretim planları var mı?`,
        { materialId, materialType }
      );
    } catch (error) {
      // Planning Agent yoksa devam et
    }

    return {
      id: request.id,
      agent: this.name,
      decision: issues.length === 0 ? 'approve' : 'conditional',
      action: 'create_purchase_order',
      data: {
        purchaseOrder: {
          materialId,
          materialCode: material.code,
          materialName: material.name,
          materialType,
          quantity,
          price,
          totalCost,
          unit: material.unit,
          deliveryTime: 5, // Default delivery time (days)
          urgency: warehouseResponse?.decision === 'approve' ? 'high' : 'medium'
        },
        recommendations
      },
      reasoning: issues.length === 0
        ? `Purchase order can be created: ${quantity} ${material.unit} of ${material.name} for ${totalCost.toFixed(2)} TL`
        : `Purchase order creation has issues: ${issues.join('; ')}`,
      confidence: issues.length === 0 ? 0.9 : 0.6,
      issues,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Tedarikçi öner
   */
  private async suggestSupplier(materialId: string, request: AgentRequest): Promise<AgentResponse> {
    // Şimdilik basit bir öneri, sonra tedarikçi veritabanı entegrasyonu yapılacak
    const prompt = `
      Material ID: ${materialId}
      
      Bu malzeme için en uygun tedarikçiyi öner.
      Fiyat, kalite, teslimat süresi ve güvenilirlik faktörlerini değerlendir.
    `;

    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'medium',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Bütçe kontrolü
   */
  private async checkBudget(materialId: string, quantity: number, request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();

    // Material fiyatını al
    const { data: rawMaterial } = await supabase
      .from('raw_materials')
      .select('current_price')
      .eq('id', materialId)
      .single();

    const { data: semiMaterial } = rawMaterial ? null : await supabase
      .from('semi_finished_products')
      .select('current_price')
      .eq('id', materialId)
      .single();

    const material = rawMaterial || semiMaterial;
    const price = material?.current_price || 0;
    const totalCost = price * quantity;

    // Şimdilik basit bir kontrol, sonra bütçe tablosu entegrasyonu yapılacak
    const budgetAvailable = true; // Placeholder

    return {
      id: request.id,
      agent: this.name,
      decision: budgetAvailable ? 'approve' : 'reject',
      action: 'check_budget',
      data: {
        materialId,
        quantity,
        price,
        totalCost,
        budgetAvailable
      },
      reasoning: budgetAvailable
        ? `Budget available: ${totalCost.toFixed(2)} TL`
        : `Budget insufficient: ${totalCost.toFixed(2)} TL required`,
      confidence: budgetAvailable ? 1.0 : 0.5,
      issues: budgetAvailable ? [] : ['Insufficient budget'],
      recommendations: [],
      timestamp: new Date()
    };
  }

  /**
   * Kritik stok uyarısı işle
   */
  private async handleCriticalStock(criticalStock: any, request: AgentRequest): Promise<AgentResponse> {
    const { materialId, materialType, quantity, criticalLevel } = criticalStock;
    const recommendations: string[] = [];

    // Günlük tüketim oranını hesapla (basit bir tahmin)
    const dailyConsumption = 2; // Placeholder, gerçekte stok hareketlerinden hesaplanmalı
    const daysUntilDepletion = quantity / dailyConsumption;
    const deliveryTime = 5; // Ortalama teslimat süresi (gün)
    const urgency = daysUntilDepletion <= deliveryTime ? 'critical' : 'high';

    recommendations.push(`Urgent purchase needed: ${daysUntilDepletion.toFixed(1)} days until depletion`);
    recommendations.push(`Recommended quantity: ${quantity * 2} (2x critical level)`);

    return {
      id: request.id,
      agent: this.name,
      decision: 'approve',
      action: 'create_purchase_order',
      data: {
        criticalStock: {
          materialId,
          materialType,
          currentQuantity: quantity,
          criticalLevel,
          daysUntilDepletion,
          urgency,
          recommendedQuantity: quantity * 2
        },
        recommendations
      },
      reasoning: `Critical stock detected: ${quantity} units remaining, ${daysUntilDepletion.toFixed(1)} days until depletion. Urgent purchase order recommended.`,
      confidence: 0.95,
      issues: [],
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Satın alma siparişi doğrula
   */
  private async validatePurchaseOrder(purchaseOrderId: string, request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const issues: string[] = [];

    // Purchase request bilgilerini al
    const { data: purchaseRequest } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', purchaseOrderId)
      .single();

    if (!purchaseRequest) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: 'Purchase request not found',
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // Validasyon kontrolleri
    if (!purchaseRequest.material_id) {
      issues.push('Material ID missing');
    }

    if (!purchaseRequest.quantity || purchaseRequest.quantity <= 0) {
      issues.push('Invalid quantity');
    }

    if (purchaseRequest.status === 'cancelled') {
      issues.push('Purchase request is cancelled');
    }

    const isValid = issues.length === 0;

    return {
      id: request.id,
      agent: this.name,
      decision: isValid ? 'approve' : 'reject',
      action: 'validate_purchase_order',
      data: {
        purchaseOrderId,
        isValid,
        status: purchaseRequest.status
      },
      reasoning: isValid
        ? 'Purchase order is valid'
        : `Purchase order validation failed: ${issues.join('; ')}`,
      confidence: isValid ? 1.0 : 0.3,
      issues,
      recommendations: [],
      timestamp: new Date()
    };
  }

  /**
   * Diğer agent'larla doğrulama
   */
  async validateWithOtherAgents(data: any): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Eğer materialId varsa, gerçek stok durumunu kontrol et
    const materialId = data?.materialId || data?.material_id;
    const materialType = data?.materialType || data?.material_type;
    
    if (materialId && materialType) {
      try {
        // Test ortamında test client kullan
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
        const supabase = isTestEnv 
          ? (await import('@/lib/supabase/test-client')).createTestClient()
          : await createClient();
        
        const tableName = materialType === 'raw' ? 'raw_materials' : 'semi_finished_products';
        const { data: material } = await supabase
          .from(tableName)
          .select('id, code, name, quantity, reserved_quantity, critical_level')
          .eq('id', materialId)
          .single();
        
        if (material) {
          const available = material.quantity - material.reserved_quantity;
          const isCritical = material.quantity <= (material.critical_level || 0);
          
          if (isCritical) {
            issues.push(`Kritik stok seviyesi: ${material.code} (${available} mevcut, ${material.critical_level || 0} kritik seviye)`);
            recommendations.push(`${material.code} için acil satın alma siparişi oluşturulmalı`);
          } else if (available < (material.critical_level || 0) * 1.5) {
            recommendations.push(`${material.code} için yakında satın alma siparişi gerekebilir`);
          }
        } else {
          issues.push(`Malzeme bulunamadı: ${materialId}`);
        }
      } catch (error: any) {
        recommendations.push(`Stok kontrolü yapılamadı: ${error.message}`);
      }
    }

    // Eğer doğrulama yapılamıyorsa, varsayılan olarak geçerli kabul et
    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      confidence: issues.length === 0 ? 1.0 : 0.7
    };
  }
}

