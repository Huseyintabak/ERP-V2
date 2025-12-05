/**
 * Warehouse Agent
 * Stok yönetimi, rezervasyon ve kritik stok tespiti
 */

import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, ValidationResult } from '../types/agent.types';
import { agentLogger } from '../utils/logger';
import { createClient } from '@/lib/supabase/server';

export class WarehouseAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Sen ThunderV2 ERP sisteminin Depo departmanı AI asistanısın.

Sorumlulukların:
- Stok yönetimi ve gerçek zamanlı takibi
- Malzeme rezervasyonu ve yönetimi
- Stok seviyesi kontrolü ve kritik uyarıları
- Depo optimizasyonu ve yerleşim planlaması
- Stok hareketleri analizi ve raporlama
- Güvenlik stoku hesaplama ve önerileri
- Stok doğruluğu kontrolü

Diğer departmanlarla iletişim kur:
- Planlama GPT: Rezervasyon durumunu bildir, stok yeterliliğini kontrol et
- Satın Alma GPT: Kritik stokları bildir, acil sipariş öner
- Üretim GPT: Üretim tüketimini takip et, stok güncellemelerini yap

**Stok Güncelleme Validasyonu Kriterleri:**
1. Stok Değişim Mantığı Kontrolü:
   - Artış (+): Giriş, üretim, iade, sayım düzeltmesi → Onay
   - Azalış (-): Çıkış, üretim tüketimi, fire → Kontrol et
   - Büyük değişim (>100 birim): Uyarı ver, sebep sor
   - Kritik seviye altına düşüş: Uyarı ver

2. Kritik Seviye İhlali Kontrolü:
   - Yeni stok < kritik seviye → 🟡 UYARI
   - Yeni stok = 0 → 🔴 KRİTİK
   - Büyük kritik seviye ihlali (>50 birim) → 🔴 KRİTİK

3. Büyük Değişim Uyarıları:
   - 100+ birim artış/azalış → Uyarı ver
   - %50+ değişim → Uyarı ver
   - Sayım düzeltmesi ise → Normal kabul et

4. Sayım Düzeltmesi vs Normal Hareket Ayrımı:
   - Sayım düzeltmesi: Açıklama varsa, mantıklı ise → Onay
   - Normal hareket: Movement type kontrolü yap
   - Eksik hareket tipi → Uyarı ver

Karar verirken:
1. Her zaman güncel stok bilgisini kullan
2. Kritik seviyeleri erken tespit et
3. Rezervasyonları doğru yönet
4. Stok doğruluğunu koru
5. Depo verimliliğini optimize et
6. Stok değişim mantığını kontrol et
7. Büyük değişimleri analiz et

Yanıtlarını JSON formatında ver:
{
  "decision": "approve" | "reject" | "conditional",
  "action": "reserve_materials" | "check_stock" | "alert_critical" | "request_info",
  "data": {
    "materials": [
      { "materialId": "uuid", "quantity": 50, "available": 100, "reserved": true }
    ],
    "criticalMaterials": [],
    "recommendations": []
  },
  "reasoning": "Açıklama",
  "confidence": 0.0-1.0,
  "issues": ["sorun1", "sorun2"],
  "recommendations": ["öneri1", "öneri2"]
}`;

    super(
      'Warehouse Agent',
      'warehouse',
      [
        'Stok yönetimi ve takibi',
        'Malzeme rezervasyonu',
        'Stok seviyesi kontrolü ve uyarıları',
        'Kritik stok tespiti',
        'Depo optimizasyonu',
        'Stok hareketleri analizi',
        'Güvenlik stoku hesaplama'
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
          return await this.handleStockRequest(request);
        case 'query':
          return await this.handleStockQuery(request);
        case 'analysis':
          return await this.handleStockAnalysis(request);
        case 'validation':
          return await this.handleStockValidation(request);
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
      // Quota hatası veya API key hatası durumunda, gerçek stok kontrolü yapabilirsek approve et
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
                           error?.response?.status === 401;

      if (isOpenAIError && request.type === 'validation') {
        // Validation için OpenAI hatası durumunda, context'te yeterli bilgi varsa approve et
        // (Graceful degradation - yönetici onayı ile güncelleme yapılabilir)
        const errorDetails = error?.status || error?.aiErrorType || errorMessage;
        return {
          id: request.id,
          agent: this.name,
          decision: 'approve', // OpenAI hatası durumunda approve et (graceful degradation)
          reasoning: `OpenAI API error (${errorDetails}). Graceful degradation: Validation skipped, manual update approved.`,
          confidence: 0.5, // Düşük güven - çünkü AI kontrolü yapılamadı
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
   * Stok isteği işle (rezervasyon, kontrol vb.)
   */
  private async handleStockRequest(request: AgentRequest): Promise<AgentResponse> {
    const { orderId, materials, action } = request.context || {};

    if (action === 'check_stock' && orderId) {
      return await this.checkStockForOrder(orderId, request);
    } else if (action === 'reserve_materials' && materials) {
      return await this.reserveMaterials(materials, request);
    } else if (action === 'check_critical') {
      return await this.checkCriticalStock(request);
    }

    // GPT'ye sor
    const prompt = `
      Stok isteği: ${request.prompt}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
      
      Bu isteği değerlendir ve karar ver:
      - Stok yeterli mi?
      - Rezervasyon yapılabilir mi?
      - Kritik seviyeler var mı?
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
   * Stok sorgusu işle
   */
  private async handleStockQuery(request: AgentRequest): Promise<AgentResponse> {
    // Eğer context'te orderId varsa, gerçek stok kontrolü yap
    const orderId = request.context?.orderId;
    if (orderId) {
      return await this.checkStockForOrder(orderId, request);
    }
    
    // Diğer durumlarda GPT'ye sor
    const prompt = `Stok sorgusu: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
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
   * Stok analizi işle - DETAYLI VERSİYON
   */
  private async handleStockAnalysis(request: AgentRequest): Promise<AgentResponse> {
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
    
    // Analysis tipine göre detaylı veri topla
    if (analysisType === 'stock_movements_analysis') {
      // Stok hareketleri analizi
      const { data: stockMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      const { data: recentMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });
      
      // Hareket tiplerine göre grupla
      const movementsByType = new Map<string, number>();
      const movementsByMaterialType = new Map<string, number>();
      
      if (stockMovements) {
        stockMovements.forEach(movement => {
          const type = movement.movement_type || 'unknown';
          movementsByType.set(type, (movementsByType.get(type) || 0) + 1);
          
          const matType = movement.material_type || 'unknown';
          movementsByMaterialType.set(matType, (movementsByMaterialType.get(matType) || 0) + 1);
        });
      }
      
      detailedContext = `
        Stok Hareketleri Analizi:
        
        Toplam hareket sayısı: ${stockMovements?.length || 0}
        Son 7 gün hareket sayısı: ${recentMovements?.length || 0}
        
        Hareket tiplerine göre dağılım:
        ${JSON.stringify(Array.from(movementsByType.entries()).map(([type, count]) => ({ type, count })), null, 2)}
        
        Malzeme tiplerine göre dağılım:
        ${JSON.stringify(Array.from(movementsByMaterialType.entries()).map(([type, count]) => ({ type, count })), null, 2)}
        
        Son 10 hareket:
        ${JSON.stringify(stockMovements?.slice(0, 10).map(m => ({
          id: m.id,
          movement_type: m.movement_type,
          material_type: m.material_type,
          quantity: m.quantity,
          created_at: m.created_at
        })), null, 2)}
      `;
      
      // Analiz
      if (!stockMovements || stockMovements.length === 0) {
        issues.push('Stok hareketleri kaydı bulunmuyor');
        recommendations.push('Stok hareketleri düzenli olarak kaydedilmeli');
      } else {
        const avgMovementsPerDay = recentMovements ? recentMovements.length / 7 : 0;
        if (avgMovementsPerDay < 5) {
          issues.push(`Günlük ortalama stok hareketi düşük: ${avgMovementsPerDay.toFixed(1)} hareket/gün`);
          recommendations.push('Stok hareketlerinin düzenli kaydedildiğinden emin olun');
        }
      }
      
      // Hareket tipleri analizi
      const entryCount = movementsByType.get('giris') || 0;
      const exitCount = movementsByType.get('cikis') || 0;
      const productionCount = movementsByType.get('uretim') || 0;
      
      if (entryCount === 0 && exitCount === 0) {
        issues.push('Stok giriş/çıkış hareketleri kaydedilmiyor');
        recommendations.push('Tüm stok hareketleri kaydedilmeli');
      }
      
      if (productionCount === 0) {
        issues.push('Üretim stok hareketleri kaydedilmiyor');
        recommendations.push('Üretim sırasında stok tüketimi otomatik kaydedilmeli');
      }
      
    } else if (analysisType === 'stock_levels_analysis') {
      // Stok seviyeleri analizi
      const { data: rawMaterials } = await supabase
        .from('raw_materials')
        .select('id, code, name, quantity, reserved_quantity, critical_level, unit, updated_at')
        .limit(50);
      
      const { data: semiMaterials } = await supabase
        .from('semi_finished_products')
        .select('id, code, name, quantity, reserved_quantity, critical_level, unit_cost, updated_at')
        .limit(50);
      
      const { data: finishedProducts } = await supabase
        .from('finished_products')
        .select('id, code, name, quantity, critical_level, unit_price, updated_at')
        .limit(50);
      
      // Kritik seviye analizi
      const criticalRaw = rawMaterials?.filter(m => m.quantity <= (m.critical_level || 0)).length || 0;
      const criticalSemi = semiMaterials?.filter(m => m.quantity <= (m.critical_level || 0)).length || 0;
      const criticalFinished = finishedProducts?.filter(m => m.quantity <= (m.critical_level || 0)).length || 0;
      
      // Güncelleme analizi
      const now = new Date();
      const staleThreshold = 7 * 24 * 60 * 60 * 1000; // 7 gün
      const staleRaw = rawMaterials?.filter(m => {
        if (!m.updated_at) return true;
        const updated = new Date(m.updated_at);
        return (now.getTime() - updated.getTime()) > staleThreshold;
      }).length || 0;
      
      const staleSemi = semiMaterials?.filter(m => {
        if (!m.updated_at) return true;
        const updated = new Date(m.updated_at);
        return (now.getTime() - updated.getTime()) > staleThreshold;
      }).length || 0;
      
      detailedContext = `
        Stok Seviyeleri Analizi:
        
        Hammadde Stokları (${rawMaterials?.length || 0}):
        - Toplam: ${rawMaterials?.length || 0}
        - Kritik seviyede: ${criticalRaw}
        - Güncellenmemiş (7+ gün): ${staleRaw}
        - Ortalama stok: ${rawMaterials && rawMaterials.length > 0 
          ? (rawMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0) / rawMaterials.length).toFixed(2)
          : 0}
        
        Yarı Mamul Stokları (${semiMaterials?.length || 0}):
        - Toplam: ${semiMaterials?.length || 0}
        - Kritik seviyede: ${criticalSemi}
        - Güncellenmemiş (7+ gün): ${staleSemi}
        - Ortalama stok: ${semiMaterials && semiMaterials.length > 0
          ? (semiMaterials.reduce((sum, m) => sum + (m.quantity || 0), 0) / semiMaterials.length).toFixed(2)
          : 0}
        
        Nihai Ürün Stokları (${finishedProducts?.length || 0}):
        - Toplam: ${finishedProducts?.length || 0}
        - Kritik seviyede: ${criticalFinished}
        
        Örnek kritik seviyede malzemeler:
        ${JSON.stringify([
          ...(rawMaterials?.filter(m => m.quantity <= (m.critical_level || 0)).slice(0, 5) || []),
          ...(semiMaterials?.filter(m => m.quantity <= (m.critical_level || 0)).slice(0, 5) || [])
        ].map(m => ({
          code: m.code,
          name: m.name,
          quantity: m.quantity,
          critical_level: m.critical_level
        })), null, 2)}
      `;
      
      // Sorun tespiti
      if (criticalRaw > 0 || criticalSemi > 0) {
        issues.push(`${criticalRaw + criticalSemi} malzeme kritik seviyede`);
        recommendations.push('Kritik seviyedeki malzemeler için acil tedarik planı yapılmalı');
      }
      
      if (staleRaw > 0 || staleSemi > 0) {
        issues.push(`${staleRaw + staleSemi} malzeme stok seviyesi güncellenmemiş (7+ gün)`);
        recommendations.push('Stok seviyelerini güncel tutmak için otomatik sistemler kullanın');
        recommendations.push('Düzenli stok sayımı yapılmalı');
      }
      
      // Güncelleme sıklığı analizi
      const totalMaterials = (rawMaterials?.length || 0) + (semiMaterials?.length || 0);
      const stalePercentage = totalMaterials > 0 ? ((staleRaw + staleSemi) / totalMaterials) * 100 : 0;
      
      if (stalePercentage > 30) {
        issues.push(`Stok seviyelerinin %${stalePercentage.toFixed(1)}'i güncellenmemiş`);
        recommendations.push('Stok güncelleme sürecini otomatikleştirin');
        recommendations.push('Gerçek zamanlı stok takibi sistemi kurun');
      }
    }
    
    const prompt = `
      ${request.prompt}
      
      ${detailedContext ? `\n\nDetaylı Context:\n${detailedContext}` : ''}
      
      ${requireDetails ? `
      LÜTFEN DETAYLI BİR ANALİZ YAPIN:
      1. Stok hareketlerinin düzenli kaydedilip kaydedilmediğini kontrol edin
      2. Stok seviyelerinin güncellenme sıklığını analiz edin
      3. Kritik seviyedeki malzemeleri tespit edin
      4. Stok güncelleme süreçlerini değerlendirin
      5. İyileştirme önerilerinizi detaylı açıklayın
      6. Her öneri için tahmini süre belirtin
      
      Yanıtınızı şu formatta verin:
      {
        "decision": "approve" | "reject" | "conditional",
        "action": "analyze_stock",
        "data": {
          "stockMovements": {
            "totalMovements": 0,
            "recentMovements": 0,
            "movementsByType": {},
            "analysis": "Açıklama"
          },
          "stockLevels": {
            "totalMaterials": 0,
            "criticalMaterials": 0,
            "staleMaterials": 0,
            "updateFrequency": "Açıklama"
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
   * Stok doğrulama işle
   */
  private async handleStockValidation(request: AgentRequest): Promise<AgentResponse> {
    const { materials } = request.context || {};

    if (materials && Array.isArray(materials)) {
      return await this.validateMaterials(materials, request);
    }

    const prompt = `Stok doğrulama: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
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
   * Order için stok kontrolü
   */
  private async checkStockForOrder(orderId: string, request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const issues: string[] = [];
    const recommendations: string[] = [];
    const materialChecks: any[] = [];

    // Order items'ı al
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, product:finished_products(*)')
      .eq('order_id', orderId);

    if (!orderItems || orderItems.length === 0) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: 'Order items not found',
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // Her item için BOM kontrolü
    for (const item of orderItems) {
      const { data: bomItems } = await supabase
        .from('bom')
        .select('*')
        .eq('finished_product_id', item.product_id);

      if (bomItems && bomItems.length > 0) {
        for (const bomItem of bomItems) {
          const needed = bomItem.quantity_needed * item.quantity;
          const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
          
          const { data: material } = await supabase
            .from(tableName)
            .select('id, code, name, quantity, reserved_quantity, critical_level')
            .eq('id', bomItem.material_id)
            .single();

          if (material) {
            const available = material.quantity - material.reserved_quantity;
            const isAvailable = available >= needed;
            
            materialChecks.push({
              materialId: material.id,
              materialCode: material.code,
              materialName: material.name,
              needed,
              available,
              isAvailable,
              isCritical: material.quantity <= (material.critical_level || 0)
            });

            if (!isAvailable) {
              issues.push(`${material.name} (${material.code}): ${needed} needed, ${available} available`);
            }

            if (material.quantity <= (material.critical_level || 0)) {
              recommendations.push(`Critical stock level: ${material.name} (${material.code})`);
            }
          }
        }
      }
    }

    const allAvailable = materialChecks.every(check => check.isAvailable);

    return {
      id: request.id,
      agent: this.name,
      decision: allAvailable ? 'approve' : 'reject',
      action: 'check_stock',
      data: {
        orderId,
        materialChecks,
        allAvailable
      },
      reasoning: allAvailable 
        ? 'All materials are available in sufficient quantities'
        : `Insufficient stock: ${issues.join('; ')}`,
      confidence: allAvailable ? 1.0 : 0.5,
      issues,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Malzeme rezervasyonu
   */
  private async reserveMaterials(materials: any[], request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const reserved: any[] = [];
    const failed: any[] = [];

    for (const material of materials) {
      const { materialId, quantity, materialType } = material;
      const tableName = materialType === 'raw' ? 'raw_materials' : 'semi_finished_products';

      // Stok kontrolü
      const { data: stock } = await supabase
        .from(tableName)
        .select('quantity, reserved_quantity')
        .eq('id', materialId)
        .single();

      if (stock) {
        const available = stock.quantity - stock.reserved_quantity;
        if (available >= quantity) {
          // Rezervasyon yap (reserved_quantity artır)
          const { error } = await supabase
            .from(tableName)
            .update({
              reserved_quantity: (stock.reserved_quantity || 0) + quantity
            })
            .eq('id', materialId);

          if (!error) {
            reserved.push({ materialId, quantity, materialType });
          } else {
            failed.push({ materialId, quantity, error: error.message });
          }
        } else {
          failed.push({ materialId, quantity, error: `Insufficient stock: ${available} available, ${quantity} needed` });
        }
      } else {
        failed.push({ materialId, quantity, error: 'Material not found' });
      }
    }

    return {
      id: request.id,
      agent: this.name,
      decision: failed.length === 0 ? 'approve' : 'conditional',
      action: 'reserve_materials',
      data: {
        reserved,
        failed
      },
      reasoning: failed.length === 0
        ? `All materials reserved successfully (${reserved.length} materials)`
        : `Some materials failed to reserve: ${failed.length} failed, ${reserved.length} succeeded`,
      confidence: failed.length === 0 ? 1.0 : 0.7,
      issues: failed.map(f => f.error),
      recommendations: [],
      timestamp: new Date()
    };
  }

  /**
   * Kritik stok kontrolü
   */
  private async checkCriticalStock(request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const criticalMaterials: any[] = [];

    // Raw materials
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, code, name, quantity, critical_level')
      .not('critical_level', 'is', null);

    if (rawMaterials) {
      for (const material of rawMaterials) {
        if (material.quantity <= (material.critical_level || 0)) {
          criticalMaterials.push({
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            quantity: material.quantity,
            criticalLevel: material.critical_level,
            materialType: 'raw'
          });
        }
      }
    }

    // Semi-finished products
    const { data: semiMaterials } = await supabase
      .from('semi_finished_products')
      .select('id, code, name, quantity, critical_level')
      .not('critical_level', 'is', null);

    if (semiMaterials) {
      for (const material of semiMaterials) {
        if (material.quantity <= (material.critical_level || 0)) {
          criticalMaterials.push({
            materialId: material.id,
            materialCode: material.code,
            materialName: material.name,
            quantity: material.quantity,
            criticalLevel: material.critical_level,
            materialType: 'semi'
          });
        }
      }
    }

    return {
      id: request.id,
      agent: this.name,
      decision: criticalMaterials.length > 0 ? 'conditional' : 'approve',
      action: 'alert_critical',
      data: {
        criticalMaterials,
        count: criticalMaterials.length
      },
      reasoning: criticalMaterials.length > 0
        ? `Found ${criticalMaterials.length} materials at critical level`
        : 'No critical stock levels detected',
      confidence: 1.0,
      issues: criticalMaterials.length > 0 ? [`${criticalMaterials.length} critical materials found`] : [],
      recommendations: criticalMaterials.length > 0 
        ? ['Purchase Agent should be notified for urgent orders']
        : [],
      timestamp: new Date()
    };
  }

  /**
   * Malzeme doğrulama
   */
  private async validateMaterials(materials: any[], request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const validated: any[] = [];
    const invalid: any[] = [];

    for (const material of materials) {
      const { materialId, materialType, quantity } = material;
      const tableName = materialType === 'raw' ? 'raw_materials' : 'semi_finished_products';

      const { data: stock } = await supabase
        .from(tableName)
        .select('id, code, name, quantity, reserved_quantity')
        .eq('id', materialId)
        .single();

      if (stock) {
        const available = stock.quantity - (stock.reserved_quantity || 0);
        validated.push({
          materialId,
          materialCode: stock.code,
          materialName: stock.name,
          requested: quantity,
          available,
          isValid: available >= quantity
        });
      } else {
        invalid.push({ materialId, materialType, error: 'Material not found' });
      }
    }

    const allValid = validated.every(v => v.isValid) && invalid.length === 0;

    return {
      id: request.id,
      agent: this.name,
      decision: allValid ? 'approve' : 'reject',
      action: 'validate_materials',
      data: {
        validated,
        invalid
      },
      reasoning: allValid
        ? 'All materials are valid and available'
        : `Some materials are invalid or unavailable: ${invalid.length} invalid`,
      confidence: allValid ? 1.0 : 0.5,
      issues: invalid.map(i => i.error),
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

    // Eğer orderId varsa, stok kontrolü yap
    const orderId = data?.orderId || data?.order_id;
    if (orderId) {
      try {
        // Gerçek stok kontrolü yap
        const stockCheck = await this.checkStockForOrder(orderId, {
          id: `validate_${Date.now()}`,
          prompt: 'Stok kontrolü',
          type: 'validation',
          context: { orderId }
        });
        
        if (stockCheck.decision !== 'approve') {
          issues.push(`Stok yetersiz: ${stockCheck.reasoning}`);
        }
      } catch (error: any) {
        // Hata durumunda uyarı ver ama reddetme
        recommendations.push(`Stok kontrolü yapılamadı: ${error.message}`);
      }
    }

    // Eğer doğrulama yapılamıyorsa (orderId yoksa), varsayılan olarak geçerli kabul et
    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      confidence: issues.length === 0 ? 1.0 : 0.5
    };
  }
}

