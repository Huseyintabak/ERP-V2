/**
 * Production Agent
 * Üretim takibi, BOM doğrulama ve operatör kapasitesi kontrolü
 */

import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, ValidationResult } from '../types/agent.types';
import { agentLogger } from '../utils/logger';
import { createClient } from '@/lib/supabase/server';

export class ProductionAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Sen ThunderV2 ERP sisteminin Üretim departmanı AI asistanısın.

Sorumlulukların:
- Üretim takibi ve gerçek zamanlı izleme
- BOM doğrulama ve hesaplama kontrolü
- Stok tüketimi kontrolü ve doğrulama
- Operatör performans analizi ve değerlendirme
- Kalite kontrol ve anomali tespiti
- Üretim verimliliği optimizasyonu
- Hata tespiti ve önleme

**BOM Doğrulama Kriterleri:**
1. Malzeme tüketim oranları:
   - Normal tüketim: BOM miktarı ±%5 tolerans
   - Fazla tüketim: >%5 → Anomali (kontrol gerekli)
   - Az tüketim: <%5 → Verimlilik artışı (logla)

2. Anomali Tespiti Kriterleri:
   - Tüketim oranı >%10 fark: 🔴 KRİTİK
   - Tüketim oranı >%5 fark: 🟡 UYARI
   - Operatör hata oranı >%3: 🔴 KRİTİK
   - Üretim süresi >%20 fark: 🟡 UYARI
   - Kalite red oranı >%2: 🔴 KRİTİK

3. Kalite Kontrol Standartları:
   - İlk üretim kontrolü: İlk 5 ürün %100 kontrol
   - Random kontrol: Her 10 üründen 1'i kontrol
   - Kritik hata: Anında üretim durdur (Manager onayı gerekli)
   - Uyarı seviyesi: Üretim devam eder, log tutulur

4. Stok Tüketim Doğrulama:
   - BOM'daki malzemeler stokta mevcut mu?
   - Rezervasyon yapılmış mı?
   - Tüketim miktarı doğru mu? (BOM x üretim adedi)
   - Alternatif malzeme kullanımı kaydedilmiş mi?

Diğer departmanlarla iletişim kur:
- Depo GPT: Stok yeterliliğini kontrol et, tüketim kayıtlarını yap
- Planlama GPT: Üretim planlarını doğrula, operatör atamalarını kontrol et
- Satın Alma GPT: Malzeme kalitesi sorunlarını bildir

Karar verirken:
1. Her zaman BOM doğruluğunu kontrol et (tüketim oranları dahil)
2. Stok tüketimini doğru hesapla (tolerans dahil)
3. Anomalileri erken tespit et (pattern analizi)
4. Kaliteyi koru (standartlara uygunluk)
5. Verimliliği optimize et (süre ve maliyet)
6. Hata pattern'lerini tespit et (tekrarlayan sorunlar)

Yanıtlarını JSON formatında ver:
{
  "decision": "approve" | "reject" | "conditional",
  "action": "validate_production" | "check_capacity" | "validate_bom" | "request_info",
  "data": {
    "planId": "uuid",
    "bomValidation": {
      "isValid": true,
      "consumptionRate": 0.98,
      "anomalies": [
        {
          "materialId": "uuid",
          "expected": 10,
          "actual": 12,
          "difference": 20,
          "severity": "warning",
          "reason": "Fazla tüketim - kontrol gerekli"
        }
      ],
      "issues": []
    },
    "stockValidation": {
      "isAvailable": true,
      "shortages": [],
      "reservations": []
    },
    "qualityCheck": {
      "firstProductionCheck": true,
      "randomCheckPassed": true,
      "rejectRate": 0.01,
      "issues": []
    },
    "operatorCapacity": {
      "available": true,
      "currentLoad": 2,
      "maxCapacity": 5,
      "performanceScore": 0.95
    }
  },
  "reasoning": "BOM doğrulaması: Tüm malzemeler mevcut. Tüketim oranı normal (±%5). Anomali yok. Onaylandı.",
  "confidence": 0.0-1.0,
  "issues": ["sorun1", "sorun2"],
  "recommendations": ["öneri1", "öneri2"]
}`;

    super(
      'Production Agent',
      'production',
      [
        'Üretim takibi ve izleme',
        'BOM doğrulama ve kontrol',
        'Stok tüketimi kontrolü',
        'Operatör performans analizi',
        'Kalite kontrol ve anomali tespiti',
        'Üretim verimliliği optimizasyonu',
        'Hata tespiti ve önleme'
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
          return await this.handleProductionRequest(request);
        case 'query':
          return await this.handleProductionQuery(request);
        case 'analysis':
          return await this.handleProductionAnalysis(request);
        case 'validation':
          return await this.handleProductionValidation(request);
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
        const errorDetails = error?.aiErrorType || error?.status || errorMessage;
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
   * Üretim isteği işle
   */
  private async handleProductionRequest(request: AgentRequest): Promise<AgentResponse> {
    const { planId, action, operatorId } = request.context || {};

    if (action === 'validate_production' && planId) {
      return await this.validateProduction(planId, request);
    } else if (action === 'check_capacity' && operatorId) {
      return await this.checkOperatorCapacity(operatorId, request);
    } else if (action === 'validate_bom' && planId) {
      return await this.validateBOM(planId, request);
    }

    // GPT'ye sor
    const prompt = `
      Üretim isteği: ${request.prompt}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
      
      Bu isteği değerlendir ve karar ver:
      - Üretim yapılabilir mi?
      - BOM doğru mu?
      - Operatör kapasitesi yeterli mi?
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
   * Üretim sorgusu işle
   */
  private async handleProductionQuery(request: AgentRequest): Promise<AgentResponse> {
    // Eğer context'te orderId varsa, gerçek kapasite kontrolü yap
    const orderId = request.context?.orderId;
    if (orderId) {
      // Test ortamında test client kullan
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
      const supabase = isTestEnv 
        ? (await import('@/lib/supabase/test-client')).createTestClient()
        : await createClient();
      
      // Order'dan assigned_operator_id'yi al
      const { data: order } = await supabase
        .from('orders')
        .select('assigned_operator_id')
        .eq('id', orderId)
        .single();
      
      if (order?.assigned_operator_id) {
        return await this.checkOperatorCapacity(order.assigned_operator_id, request);
      } else {
        // Operatör atanmamışsa, kapasite kontrolü yapılamaz ama reddetme
        return {
          id: request.id,
          agent: this.name,
          decision: 'approve', // Operatör atanmamış, sonra atanabilir
          action: 'check_capacity',
          data: { orderId, operatorId: null },
          reasoning: 'No operator assigned yet, capacity check skipped',
          confidence: 0.7,
          issues: [],
          recommendations: ['Assign operator before production'],
          timestamp: new Date()
        };
      }
    }
    
    // Diğer durumlarda GPT'ye sor
    const prompt = `Üretim sorgusu: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
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
   * Yeni mimari yapıya göre: Production Agent → Developer Agent
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
        `Production Agent sistem analizi sonuçları:
        
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
          sourceAgent: 'Production Agent',
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
   * Üretim analizi işle
   */
  /**
   * Üretim analizi - Detaylı sistem analizi
   */
  private async handleProductionAnalysis(request: AgentRequest): Promise<AgentResponse> {
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
        if (analysisType === 'bom_validation_material_check') {
          // BOM validation ve malzeme kontrolü analizi - DETAYLI VERSİYON
          const { data: productionPlans } = await supabase
            .from('production_plans')
            .select('id, product_id, planned_quantity, produced_quantity, status, created_at, updated_at')
            .limit(50);
          
          const { data: bomItems } = await supabase
            .from('bom')
            .select('*')
            .limit(100);
          
          const { data: products } = await supabase
            .from('finished_products')
            .select('id, code, name')
            .limit(50);
          
          // Production logs kontrolü
          const { data: productionLogs } = await supabase
            .from('production_logs')
            .select('id, plan_id, quantity_produced, created_at')
            .order('created_at', { ascending: false })
            .limit(50);
          
          // Stock movements kontrolü
          const { data: stockMovements } = await supabase
            .from('stock_movements')
            .select('id, movement_type, quantity, material_type, material_id, created_at')
            .eq('movement_type', 'uretim')
            .order('created_at', { ascending: false })
            .limit(50);
          
          // Raw materials ve semi-finished products kontrolü
          const { data: rawMaterials } = await supabase
            .from('raw_materials')
            .select('id, code, name, quantity, reserved_quantity')
            .limit(50);
          
          const { data: semiMaterials } = await supabase
            .from('semi_finished_products')
            .select('id, code, name, quantity, reserved_quantity')
            .limit(50);
          
          // BOM validation adımları analizi
          const bomValidationSteps = [
            {
              step: 1,
              name: 'BOM verilerinin toplanması ve güncellenmesi',
              status: bomItems && bomItems.length > 0 ? 'active' : 'missing',
              description: 'BOM tablosundan ürün için gerekli malzemeler ve miktarları toplanır'
            },
            {
              step: 2,
              name: 'Kullanılan malzemelerin ve miktarlarının kontrol edilmesi',
              status: 'active',
              description: 'BOM\'daki malzeme listesi ile stok verileri karşılaştırılır'
            },
            {
              step: 3,
              name: 'Malzeme tedarikçileri ve kalite standartlarının doğrulanması',
              status: 'partial',
              description: 'Malzeme tedarikçi bilgileri kontrol edilir (şu anda sınırlı)'
            },
            {
              step: 4,
              name: 'Üretim sürecinde ihtiyaç duyulan malzeme miktarlarının hesaplanması',
              status: 'active',
              description: 'BOM\'daki quantity_needed değerleri ile planlanan miktar çarpılır'
            },
            {
              step: 5,
              name: 'Eksik malzeme ve yanlış miktarların tespit edilmesi',
              status: 'active',
              description: 'Stok kontrolü ve miktar karşılaştırması yapılır'
            },
            {
              step: 6,
              name: 'Sonuçların raporlanması ve gerekli düzeltmelerin yapılması',
              status: 'partial',
              description: 'Hatalar tespit edilir ancak otomatik düzeltme sınırlı'
            }
          ];
          
          // Eksik malzeme tespiti analizi
          const missingMaterialAnalysis: any[] = [];
          if (productionPlans && bomItems && rawMaterials && semiMaterials) {
            productionPlans.forEach(plan => {
              const bomForPlan = bomItems.filter(bom => bom.finished_product_id === plan.product_id);
              if (bomForPlan.length === 0) {
                missingMaterialAnalysis.push({
                  planId: plan.id,
                  productId: plan.product_id,
                  issue: 'BOM eksik',
                  severity: 'high'
                });
                return;
              }
              
              bomForPlan.forEach(bom => {
                const needed = (bom.quantity_needed || 0) * plan.planned_quantity;
                const tableName = bom.material_type === 'raw' ? rawMaterials : semiMaterials;
                const material = tableName.find(m => m.id === bom.material_id);
                
                if (!material) {
                  missingMaterialAnalysis.push({
                    planId: plan.id,
                    materialId: bom.material_id,
                    materialType: bom.material_type,
                    issue: 'Malzeme bulunamadı',
                    severity: 'high'
                  });
                } else {
                  const available = material.quantity - (material.reserved_quantity || 0);
                  if (available < needed) {
                    missingMaterialAnalysis.push({
                      planId: plan.id,
                      materialId: bom.material_id,
                      materialName: material.name,
                      needed,
                      available,
                      shortage: needed - available,
                      severity: 'medium'
                    });
                  }
                }
              });
            });
          }
          
          // Yanlış miktar kontrolü analizi
          const wrongQuantityAnalysis: any[] = [];
          if (productionPlans && bomItems) {
            productionPlans.forEach(plan => {
              const bomForPlan = bomItems.filter(bom => bom.finished_product_id === plan.product_id);
              if (bomForPlan.length === 0) return;
              
              // BOM'daki toplam malzeme miktarını kontrol et
              const totalMaterialNeeded = bomForPlan.reduce((sum, bom) => sum + (bom.quantity_needed || 0), 0);
              
              // Production log'lardan gerçek tüketimi kontrol et
              const planLogs = productionLogs?.filter(log => log.plan_id === plan.id) || [];
              const totalProduced = planLogs.reduce((sum, log) => sum + (log.quantity_produced || 0), 0);
              
              if (totalMaterialNeeded === 0) {
                wrongQuantityAnalysis.push({
                  planId: plan.id,
                  issue: 'BOM miktarı sıfır',
                  severity: 'high'
                });
              } else if (totalProduced > 0 && Math.abs(totalProduced - plan.planned_quantity) > plan.planned_quantity * 0.1) {
                wrongQuantityAnalysis.push({
                  planId: plan.id,
                  plannedQuantity: plan.planned_quantity,
                  producedQuantity: totalProduced,
                  difference: Math.abs(totalProduced - plan.planned_quantity),
                  severity: 'medium'
                });
              }
            });
          }
          
          // Malzeme tüketimi hesaplama analizi
          const consumptionAnalysis: any[] = [];
          if (productionLogs && stockMovements && bomItems) {
            productionLogs.forEach(log => {
              const plan = productionPlans?.find(p => p.id === log.plan_id);
              if (!plan) return;
              
              const bomForPlan = bomItems.filter(bom => bom.finished_product_id === plan.product_id);
              const relatedStockMovements = stockMovements.filter(sm => {
                if (!sm.created_at || !log.created_at) return false;
                const timeDiff = Math.abs(new Date(sm.created_at).getTime() - new Date(log.created_at).getTime());
                return timeDiff < 60000; // 1 dakika içinde
              });
              
              if (relatedStockMovements.length === 0 && bomForPlan.length > 0) {
                consumptionAnalysis.push({
                  logId: log.id,
                  planId: log.plan_id,
                  issue: 'Stok hareketi eksik',
                  severity: 'medium'
                });
              }
              
              // BOM ile gerçek tüketim karşılaştırması
              if (relatedStockMovements.length > 0 && bomForPlan.length > 0) {
                const expectedConsumption = bomForPlan.reduce((sum, bom) => {
                  return sum + ((bom.quantity_needed || 0) * (log.quantity_produced || 0));
                }, 0);
                
                const actualConsumption = relatedStockMovements.reduce((sum, sm) => sum + (sm.quantity || 0), 0);
                
                if (Math.abs(actualConsumption - expectedConsumption) > expectedConsumption * 0.1) {
                  consumptionAnalysis.push({
                    logId: log.id,
                    planId: log.plan_id,
                    expectedConsumption,
                    actualConsumption,
                    difference: Math.abs(actualConsumption - expectedConsumption),
                    severity: 'medium'
                  });
                }
              }
            });
          }
          
          detailedContext = `
            BOM Validation ve Malzeme Kontrolü Detaylı Analizi:
            
            Üretim Planları (${productionPlans?.length || 0}):
            - Toplam plan: ${productionPlans?.length || 0}
            - Aktif planlar: ${productionPlans?.filter(p => p.status === 'devam_ediyor').length || 0}
            - Bekleyen planlar: ${productionPlans?.filter(p => p.status === 'beklemede').length || 0}
            - Tamamlanan planlar: ${productionPlans?.filter(p => p.status === 'tamamlandi').length || 0}
            
            BOM Örnekleri (${bomItems?.length || 0}):
            ${JSON.stringify(bomItems?.slice(0, 5), null, 2)}
            
            Üretim Logları (${productionLogs?.length || 0}):
            - Son 50 log analizi
            
            Stok Hareketleri (${stockMovements?.length || 0}):
            - Üretim tipi hareketler
            
            BOM Validation Adımları:
            ${JSON.stringify(bomValidationSteps, null, 2)}
            
            Eksik Malzeme Analizi:
            - Toplam sorun: ${missingMaterialAnalysis.length}
            - Yüksek öncelik: ${missingMaterialAnalysis.filter(m => m.severity === 'high').length}
            - Orta öncelik: ${missingMaterialAnalysis.filter(m => m.severity === 'medium').length}
            ${JSON.stringify(missingMaterialAnalysis.slice(0, 5), null, 2)}
            
            Yanlış Miktar Analizi:
            - Toplam sorun: ${wrongQuantityAnalysis.length}
            ${JSON.stringify(wrongQuantityAnalysis.slice(0, 5), null, 2)}
            
            Malzeme Tüketimi Analizi:
            - Toplam sorun: ${consumptionAnalysis.length}
            ${JSON.stringify(consumptionAnalysis.slice(0, 5), null, 2)}
          `;
          
          // Sorun tespiti
          if (missingMaterialAnalysis.length > 0) {
            const highSeverity = missingMaterialAnalysis.filter(m => m.severity === 'high').length;
            if (highSeverity > 0) {
              issues.push(`${highSeverity} yüksek öncelikli eksik malzeme sorunu tespit edildi`);
            }
            issues.push(`Toplam ${missingMaterialAnalysis.length} eksik malzeme sorunu tespit edildi`);
            recommendations.push('Eksik malzeme tespiti için otomatik raporlama sistemi kurulması');
            recommendations.push('Veri doğrulama süreçlerini otomatikleştirmek');
            recommendations.push('Eksik malzemeleri hızlı tespit etmek için ileri düzey tarama teknolojileri kullanmak');
          }
          
          if (wrongQuantityAnalysis.length > 0) {
            issues.push(`${wrongQuantityAnalysis.length} yanlış miktar sorunu tespit edildi`);
            recommendations.push('Yanlış miktar kontrolü için otomasyon sistemlerinin kurulması');
            recommendations.push('BOM miktarları ile planlanan miktarlar otomatik karşılaştırılmalı');
          }
          
          if (consumptionAnalysis.length > 0) {
            issues.push(`${consumptionAnalysis.length} malzeme tüketimi uyumsuzluğu tespit edildi`);
            recommendations.push('Malzeme tüketimi hesaplamalarının otomatikleştirilmesi');
            recommendations.push('BOM ile gerçek tüketim karşılaştırmalarını düzenli olarak yapın');
            recommendations.push('Anomali tespiti için izleme sistemleri kurun');
          }
          
      // Genel öneriler
      if (bomValidationSteps.filter(s => s.status === 'missing' || s.status === 'partial').length > 0) {
        recommendations.push('BOM validation sürecini güçlendirin');
        recommendations.push('Tüm adımların otomatikleştirilmesi');
      }
      
      recommendations.push('Stok tüketimi için otomatik hesaplama mekanizması geliştirin');
      
      // Developer Agent'a sistem iyileştirme bilgisi gönder (Yeni mimari yapıya göre)
      if (issues.length > 0 || recommendations.length > 0 || missingMaterialAnalysis.length > 0) {
        const findings = [
          ...missingMaterialAnalysis.map(m => ({
            category: 'bom_validation',
            issue: `Eksik malzeme: ${m.materialName || m.materialId} - Plan: ${m.planId}`,
            severity: m.severity,
            details: m
          })),
          ...wrongQuantityAnalysis.map(w => ({
            category: 'quantity_validation',
            issue: `Yanlış miktar - Plan: ${w.planId}`,
            severity: w.severity,
            details: w
          })),
          ...consumptionAnalysis.map(c => ({
            category: 'consumption_validation',
            issue: `Tüketim uyumsuzluğu - Log: ${c.logId}`,
            severity: c.severity,
            details: c
          }))
        ];
        
        await this.reportToDeveloperAgent('bom_validation_material_check', findings, recommendations, issues);
      }
      
    } else if (analysisType === 'production_log_validation') {
      // Üretim log validation analizi - DETAYLI VERSİYON
      const { data: recentLogs } = await supabase
        .from('production_logs')
        .select('id, plan_id, quantity_produced, barcode_scanned, operator_id, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      
      const { data: stockMovements } = await supabase
        .from('stock_movements')
        .select('id, movement_type, quantity, material_type, material_id, created_at, description')
        .eq('movement_type', 'uretim')
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Production plans ile ilişkilendir
      const planIds = recentLogs?.map(log => log.plan_id).filter((id, index, self) => self.indexOf(id) === index) || [];
      const { data: productionPlans } = await supabase
        .from('production_plans')
        .select('id, product_id, planned_quantity, produced_quantity, status, assigned_operator_id')
        .in('id', planIds.length > 0 ? planIds : ['00000000-0000-0000-0000-000000000000']);
      
      // BOM items
      const productIds = productionPlans?.map(plan => plan.product_id).filter((id, index, self) => self.indexOf(id) === index) || [];
      const { data: bomItems } = await supabase
        .from('bom')
        .select('*')
        .in('finished_product_id', productIds.length > 0 ? productIds : ['00000000-0000-0000-0000-000000000000']);
      
      // Validation analizi
      const validationResults: any[] = [];
      const bomValidationIssues: any[] = [];
      const stockValidationIssues: any[] = [];
      const consumptionMismatches: any[] = [];
      const anomalyDetections: any[] = [];
      
      if (recentLogs && productionPlans && bomItems) {
        recentLogs.forEach(log => {
          const plan = productionPlans.find(p => p.id === log.plan_id);
          if (!plan) {
            validationResults.push({
              logId: log.id,
              issue: 'Production plan bulunamadı',
              severity: 'high'
            });
            return;
          }
          
          // BOM Validation
          const bomForPlan = bomItems.filter(bom => bom.finished_product_id === plan.product_id);
          if (bomForPlan.length === 0) {
            bomValidationIssues.push({
              logId: log.id,
              planId: plan.id,
              productId: plan.product_id,
              issue: 'BOM\'da eksik malzeme tanımı',
              severity: 'high'
            });
          } else {
            // BOM'daki malzemelerin kontrolü
            bomForPlan.forEach(bom => {
              if (!bom.material_id || !bom.material_type) {
                bomValidationIssues.push({
                  logId: log.id,
                  planId: plan.id,
                  bomId: bom.id,
                  issue: 'BOM\'da eksik malzeme tanımı (material_id veya material_type eksik)',
                  severity: 'high'
                });
              }
            });
          }
          
          // Stock Validation
          const relatedStockMovements = stockMovements?.filter(sm => {
            if (!sm.created_at || !log.created_at) return false;
            const timeDiff = Math.abs(new Date(sm.created_at).getTime() - new Date(log.created_at).getTime());
            return timeDiff < 300000; // 5 dakika içinde
          }) || [];
          
          if (relatedStockMovements.length === 0 && bomForPlan.length > 0) {
            stockValidationIssues.push({
              logId: log.id,
              planId: plan.id,
              issue: 'Stok tüketimi otomatik olarak hesaplanmamaktadır',
              severity: 'high',
              expectedMaterials: bomForPlan.length
            });
          }
          
          // BOM ile gerçek tüketim karşılaştırması
          if (bomForPlan.length > 0 && relatedStockMovements.length > 0) {
            const expectedConsumption = bomForPlan.reduce((sum, bom) => {
              return sum + ((bom.quantity_needed || 0) * (log.quantity_produced || 0));
            }, 0);
            
            const actualConsumption = relatedStockMovements.reduce((sum, sm) => sum + (sm.quantity || 0), 0);
            
            if (expectedConsumption > 0) {
              const difference = Math.abs(actualConsumption - expectedConsumption);
              const differencePercentage = (difference / expectedConsumption) * 100;
              
              if (differencePercentage > 10) {
                consumptionMismatches.push({
                  logId: log.id,
                  planId: plan.id,
                  expectedConsumption,
                  actualConsumption,
                  difference,
                  differencePercentage: differencePercentage.toFixed(2) + '%',
                  severity: 'medium',
                  issue: 'BOM ile gerçek tüketim karşılaştırması yapılmamaktadır veya uyumsuzluk var'
                });
              }
            }
          }
          
          // Anomali tespiti
          // 1. Üretilen miktar planlanandan çok fazla/az
          if (plan.planned_quantity > 0) {
            const producedRatio = (log.quantity_produced || 0) / plan.planned_quantity;
            if (producedRatio > 1.2 || producedRatio < 0.8) {
              anomalyDetections.push({
                logId: log.id,
                planId: plan.id,
                type: 'quantity_anomaly',
                plannedQuantity: plan.planned_quantity,
                producedQuantity: log.quantity_produced,
                ratio: (producedRatio * 100).toFixed(2) + '%',
                severity: 'medium',
                issue: 'Üretilen miktar planlanandan %20\'den fazla farklı'
              });
            }
          }
          
          // 2. Barcode kontrolü
          if (!log.barcode_scanned) {
            anomalyDetections.push({
              logId: log.id,
              planId: plan.id,
              type: 'barcode_missing',
              severity: 'low',
              issue: 'Barcode taranmamış'
            });
          }
          
          // 3. Operator kontrolü
          if (!log.operator_id && plan.assigned_operator_id) {
            anomalyDetections.push({
              logId: log.id,
              planId: plan.id,
              type: 'operator_mismatch',
              severity: 'low',
              issue: 'Log\'daki operatör ile plan\'daki operatör eşleşmiyor'
            });
          }
        });
      }
      
      // Otomatik hesaplama mekanizması kontrolü
      const autoCalculationStatus = {
        stockConsumption: stockValidationIssues.length === 0 ? 'active' : 'missing',
        bomComparison: consumptionMismatches.length === 0 ? 'active' : 'partial',
        anomalyDetection: anomalyDetections.length > 0 ? 'partial' : 'active'
      };
      
      detailedContext = `
        Üretim Log Validation Detaylı Analizi:
        
        Üretim Logları (${recentLogs?.length || 0}):
        - Son 50 log analizi
        - Toplam üretilen: ${recentLogs?.reduce((sum, log) => sum + (log.quantity_produced || 0), 0) || 0}
        
        Stok Hareketleri (${stockMovements?.length || 0}):
        - Üretim tipi hareketler
        - Toplam tüketim: ${stockMovements?.reduce((sum, sm) => sum + (sm.quantity || 0), 0) || 0}
        
        Production Plans (${productionPlans?.length || 0}):
        - İlgili planlar
        
        BOM Items (${bomItems?.length || 0}):
        - İlgili BOM kayıtları
        
        BOM Validation Sonuçları:
        - Toplam sorun: ${bomValidationIssues.length}
        - Yüksek öncelik: ${bomValidationIssues.filter(i => i.severity === 'high').length}
        ${JSON.stringify(bomValidationIssues.slice(0, 5), null, 2)}
        
        Stok Validation Sonuçları:
        - Toplam sorun: ${stockValidationIssues.length}
        - Otomatik hesaplama: ${autoCalculationStatus.stockConsumption}
        ${JSON.stringify(stockValidationIssues.slice(0, 5), null, 2)}
        
        Tüketim Uyumsuzlukları:
        - Toplam sorun: ${consumptionMismatches.length}
        - BOM karşılaştırması: ${autoCalculationStatus.bomComparison}
        ${JSON.stringify(consumptionMismatches.slice(0, 5), null, 2)}
        
        Anomali Tespitleri:
        - Toplam anomali: ${anomalyDetections.length}
        - Anomali tespiti: ${autoCalculationStatus.anomalyDetection}
        ${JSON.stringify(anomalyDetections.slice(0, 5), null, 2)}
        
        Otomatik Hesaplama Durumu:
        ${JSON.stringify(autoCalculationStatus, null, 2)}
      `;
      
      // Sorun tespiti
      if (bomValidationIssues.length > 0) {
        const highSeverity = bomValidationIssues.filter(i => i.severity === 'high').length;
        if (highSeverity > 0) {
          issues.push(`${highSeverity} yüksek öncelikli BOM validation sorunu tespit edildi`);
        }
        issues.push(`BOM'da eksik malzeme tanımı (${bomValidationIssues.length} sorun)`);
        recommendations.push('BOM doğrulama sürecini güçlendirin');
      }
      
      if (stockValidationIssues.length > 0) {
        issues.push(`Stokta yetersizlik veya otomatik hesaplama eksikliği (${stockValidationIssues.length} sorun)`);
        recommendations.push('Stok tüketimi için otomatik hesaplama mekanizması geliştirin');
      }
      
      if (consumptionMismatches.length > 0) {
        issues.push(`BOM ile gerçek tüketim uyumsuzluğu (${consumptionMismatches.length} sorun)`);
        recommendations.push('Gerçek tüketim ile BOM karşılaştırmalarını düzenli olarak yapın');
      }
      
      if (anomalyDetections.length > 0) {
        const highSeverity = anomalyDetections.filter(a => a.severity === 'high' || a.severity === 'medium').length;
        if (highSeverity > 0) {
          issues.push(`Anomali tespiti için yeterli kontrol mekanizmaları bulunmamaktadır (${highSeverity} anomali)`);
          recommendations.push('Anomali tespiti için izleme sistemleri kurun');
        }
      }
      
      // Genel öneriler
      if (autoCalculationStatus.stockConsumption === 'missing') {
        recommendations.push('Stok tüketimi için otomatik hesaplama mekanizması geliştirin');
      }
      
      if (autoCalculationStatus.bomComparison === 'partial') {
        recommendations.push('BOM ile gerçek tüketim karşılaştırmalarını düzenli olarak yapın');
      }
      
      if (autoCalculationStatus.anomalyDetection === 'partial') {
        recommendations.push('Anomali tespiti için izleme sistemleri kurun');
      }
      
      recommendations.push('Her üretim log\'unda otomatik stok tüketimi yapılmalı');
      recommendations.push('BOM doğrulama sürecini güçlendirin');
      
      // Developer Agent'a sistem iyileştirme bilgisi gönder (Yeni mimari yapıya göre)
      if (issues.length > 0 || recommendations.length > 0 || bomValidationIssues.length > 0 || stockValidationIssues.length > 0) {
        const findings = [
          ...bomValidationIssues.map(b => ({
            category: 'bom_validation',
            issue: `BOM validation sorunu - Log: ${b.logId}`,
            severity: b.severity,
            details: b
          })),
          ...stockValidationIssues.map(s => ({
            category: 'stock_validation',
            issue: `Stok validation sorunu - Log: ${s.logId}`,
            severity: s.severity,
            details: s
          })),
          ...consumptionMismatches.map(c => ({
            category: 'consumption_mismatch',
            issue: `Tüketim uyumsuzluğu: ${c.differencePercentage} fark - Log: ${c.logId}`,
            severity: c.severity,
            details: c
          })),
          ...anomalyDetections.map(a => ({
            category: 'anomaly_detection',
            issue: `Anomali tespiti: ${a.type} - Log: ${a.logId}`,
            severity: a.severity,
            details: a
          }))
        ];
        
        await this.reportToDeveloperAgent('production_log_validation', findings, recommendations, issues);
      }
      
    } else if (analysisType === 'operator_capacity_performance') {
      // Operatör kapasitesi analizi - DETAYLI VERSİYON
      const { data: operators } = await supabase
        .from('users')
        .select('id, name, role, email, created_at')
        .eq('role', 'operator')
        .limit(20);
      
      const { data: activePlans } = await supabase
        .from('production_plans')
        .select('id, assigned_operator_id, status, planned_quantity, produced_quantity, product_id, order_id, created_at, updated_at')
        .in('status', ['devam_ediyor', 'beklemede'])
        .limit(100);
      
      const { data: completedPlans } = await supabase
        .from('production_plans')
        .select('id, assigned_operator_id, status, planned_quantity, produced_quantity, created_at, updated_at')
        .eq('status', 'tamamlandi')
        .order('updated_at', { ascending: false })
        .limit(50);
      
      const { data: productionLogs } = await supabase
        .from('production_logs')
        .select('id, plan_id, operator_id, quantity_produced, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Operatör kapasitesi ve performans analizi
      const operatorMetrics = new Map<string, {
        activePlans: number;
        totalQuantity: number;
        completedPlans: number;
        completedQuantity: number;
        avgCompletionTime: number;
        efficiency: number;
        productivity: number;
        maxCapacity: number;
        currentLoad: number;
        loadPercentage: number;
      }>();
      
      // Aktif planlar analizi
      if (activePlans) {
        activePlans.forEach(plan => {
          if (plan.assigned_operator_id) {
            const current = operatorMetrics.get(plan.assigned_operator_id) || {
              activePlans: 0,
              totalQuantity: 0,
              completedPlans: 0,
              completedQuantity: 0,
              avgCompletionTime: 0,
              efficiency: 0,
              productivity: 0,
              maxCapacity: 5, // Default
              currentLoad: 0,
              loadPercentage: 0
            };
            
            operatorMetrics.set(plan.assigned_operator_id, {
              ...current,
              activePlans: current.activePlans + 1,
              totalQuantity: current.totalQuantity + (plan.planned_quantity || 0),
              currentLoad: current.activePlans + 1
            });
          }
        });
      }
      
      // Tamamlanan planlar analizi
      if (completedPlans) {
        completedPlans.forEach(plan => {
          if (plan.assigned_operator_id) {
            const current = operatorMetrics.get(plan.assigned_operator_id) || {
              activePlans: 0,
              totalQuantity: 0,
              completedPlans: 0,
              completedQuantity: 0,
              avgCompletionTime: 0,
              efficiency: 0,
              productivity: 0,
              maxCapacity: 5,
              currentLoad: 0,
              loadPercentage: 0
            };
            
            const created = new Date(plan.created_at);
            const updated = plan.updated_at ? new Date(plan.updated_at) : new Date();
            const completionTime = (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // saat
            
            operatorMetrics.set(plan.assigned_operator_id, {
              ...current,
              completedPlans: current.completedPlans + 1,
              completedQuantity: current.completedQuantity + (plan.produced_quantity || plan.planned_quantity || 0),
              avgCompletionTime: current.avgCompletionTime === 0 
                ? completionTime 
                : (current.avgCompletionTime + completionTime) / 2
            });
          }
        });
      }
      
      // Production logs analizi
      if (productionLogs) {
        productionLogs.forEach(log => {
          if (log.operator_id) {
            const current = operatorMetrics.get(log.operator_id) || {
              activePlans: 0,
              totalQuantity: 0,
              completedPlans: 0,
              completedQuantity: 0,
              avgCompletionTime: 0,
              efficiency: 0,
              productivity: 0,
              maxCapacity: 5,
              currentLoad: 0,
              loadPercentage: 0
            };
            
            // Productivity hesaplama (üretilen miktar / zaman)
            operatorMetrics.set(log.operator_id, {
              ...current,
              productivity: current.productivity + (log.quantity_produced || 0)
            });
          }
        });
      }
      
      // Efficiency ve load percentage hesaplama
      operatorMetrics.forEach((metrics, operatorId) => {
        if (metrics.completedPlans > 0) {
          metrics.efficiency = (metrics.completedQuantity / (metrics.totalQuantity + metrics.completedQuantity)) * 100;
        }
        metrics.loadPercentage = (metrics.currentLoad / metrics.maxCapacity) * 100;
      });
      
      // Operatör detayları
      const operatorDetails = operators?.map(op => {
        const metrics = operatorMetrics.get(op.id) || {
          activePlans: 0,
          totalQuantity: 0,
          completedPlans: 0,
          completedQuantity: 0,
          avgCompletionTime: 0,
          efficiency: 0,
          productivity: 0,
          maxCapacity: 5,
          currentLoad: 0,
          loadPercentage: 0
        };
        
        return {
          id: op.id,
          name: op.name,
          activePlans: metrics.activePlans,
          totalQuantity: metrics.totalQuantity,
          completedPlans: metrics.completedPlans,
          completedQuantity: metrics.completedQuantity,
          avgCompletionTime: metrics.avgCompletionTime.toFixed(2) + ' saat',
          efficiency: metrics.efficiency.toFixed(1) + '%',
          productivity: metrics.productivity,
          maxCapacity: metrics.maxCapacity,
          currentLoad: metrics.currentLoad,
          loadPercentage: metrics.loadPercentage.toFixed(1) + '%',
          available: metrics.currentLoad < metrics.maxCapacity
        };
      });
      
      // Yük dengeleme analizi
      const loads = Array.from(operatorMetrics.values());
      const maxActivePlans = loads.length > 0 ? Math.max(...loads.map(l => l.activePlans)) : 0;
      const minActivePlans = loads.length > 0 ? Math.min(...loads.map(l => l.activePlans)) : 0;
      const loadImbalance = maxActivePlans - minActivePlans;
      
      const maxLoadPercentage = loads.length > 0 ? Math.max(...loads.map(l => l.loadPercentage)) : 0;
      const minLoadPercentage = loads.length > 0 ? Math.min(...loads.map(l => l.loadPercentage)) : 0;
      
      // Performans metrikleri
      const avgEfficiency = operatorDetails && operatorDetails.length > 0
        ? operatorDetails.reduce((sum, op) => sum + parseFloat(op.efficiency), 0) / operatorDetails.length
        : 0;
      
      const avgLoadPercentage = operatorDetails && operatorDetails.length > 0
        ? operatorDetails.reduce((sum, op) => sum + parseFloat(op.loadPercentage), 0) / operatorDetails.length
        : 0;
      
      detailedContext = `
        Operatör Kapasitesi ve Performans Analizi:
        
        Operatörler (${operators?.length || 0}):
        ${JSON.stringify(operatorDetails, null, 2)}
        
        Aktif Üretim Planları (${activePlans?.length || 0}):
        - Devam eden: ${activePlans?.filter(p => p.status === 'devam_ediyor').length || 0}
        - Bekleyen: ${activePlans?.filter(p => p.status === 'beklemede').length || 0}
        - Atanmamış: ${activePlans?.filter(p => !p.assigned_operator_id).length || 0}
        
        Tamamlanan Planlar (${completedPlans?.length || 0}):
        - Son 50 tamamlanan plan analizi
        
        Production Logs (${productionLogs?.length || 0}):
        - Son 100 üretim log'u analizi
        
        Kapasite Metrikleri:
        - Maksimum aktif plan: ${maxActivePlans}
        - Minimum aktif plan: ${minActivePlans}
        - Yük dengesizliği: ${loadImbalance} plan farkı
        - Maksimum yük yüzdesi: ${maxLoadPercentage.toFixed(1)}%
        - Minimum yük yüzdesi: ${minLoadPercentage.toFixed(1)}%
        - Ortalama yük yüzdesi: ${avgLoadPercentage.toFixed(1)}%
        
        Performans Metrikleri:
        - Ortalama verimlilik: ${avgEfficiency.toFixed(1)}%
        - Toplam üretim log sayısı: ${productionLogs?.length || 0}
        
        Süreç Adımları:
        1. Operatör Kapasitesi Hesaplama
           - Mevcut yük analizi (aktif planlar)
           - Maksimum kapasite belirleme
           - Gerçek zamanlı veri entegrasyonu
           
        2. Performans Takibi
           - Tamamlanan plan sayısı
           - Ortalama tamamlanma süresi
           - Verimlilik hesaplama
           - Üretkenlik metrikleri
           
        3. Yük Dengeleme
           - Yük dağılımı analizi
           - Dengesizlik tespiti
           - Otomatik dengeleme önerileri
           
        4. Kapasite Planlama
           - Gerçek zamanlı yük takibi
           - Tahmin doğruluğu
           - Dinamik kapasite ayarlama
      `;
      
      // Sorun tespiti
      if (loadImbalance > 2) {
        issues.push(`Operatör yük dengesizliği: ${loadImbalance} plan farkı (hedef: <2)`);
        recommendations.push('Yük dengeleme algoritması iyileştirilmeli');
        recommendations.push('Operatör kapasitesi dinamik olarak hesaplanmalı');
      }
      
      if (maxLoadPercentage > 90) {
        issues.push(`Bazı operatörler kapasite limitinde: ${maxLoadPercentage.toFixed(1)}%`);
        recommendations.push('Yük dengeleme stratejilerinin sürekli gözden geçirilerek adaptasyonunun sağlanması');
      }
      
      const unassignedPlans = activePlans?.filter(p => !p.assigned_operator_id).length || 0;
      if (unassignedPlans > 0) {
        issues.push(`${unassignedPlans} plan atanmamış operatör bekliyor`);
        recommendations.push('Otomatik atama mekanizması geliştirilmeli');
      }
      
      if (avgEfficiency < 80) {
        issues.push(`Ortalama operatör verimliliği düşük: ${avgEfficiency.toFixed(1)}% (hedef: >85%)`);
        recommendations.push('Operatör performans takibi ve iyileştirme programı');
      }
      
      // Süreç iyileştirme önerileri
      recommendations.push('Operatörlerin mevcut yüklerini izlemek için bir sistem geliştirin');
      recommendations.push('Performans metriklerini belirleyin ve düzenli olarak takip edin');
      recommendations.push('Yük dengelemesi için otomatik bir algoritma uygulayın');
      recommendations.push('Operatör kapasitesi hesaplamalarında gerçek zamanlı veri entegrasyonunu artırarak daha doğru tahminler yapılması');
      
      // Developer Agent'a sistem iyileştirme bilgisi gönder (Yeni mimari yapıya göre)
      if (issues.length > 0 || recommendations.length > 0) {
        const findings = operatorDetails?.map(op => ({
          category: 'operator_capacity',
          issue: `Operatör ${op.name}: Yük ${op.loadPercentage}, Verimlilik ${op.efficiency}`,
          severity: parseFloat(op.loadPercentage) > 90 ? 'high' : parseFloat(op.loadPercentage) > 80 ? 'medium' : 'low',
          details: {
            operatorId: op.id,
            operatorName: op.name,
            currentLoad: op.currentLoad,
            maxCapacity: op.maxCapacity,
            loadPercentage: op.loadPercentage,
            efficiency: op.efficiency,
            available: op.available
          }
        })) || [];
        
        if (loadImbalance > 2) {
          findings.push({
            category: 'load_balancing',
            issue: `Yük dengesizliği: ${loadImbalance} plan farkı`,
            severity: 'medium',
            details: {
              maxActivePlans,
              minActivePlans,
              loadImbalance,
              maxLoadPercentage,
              minLoadPercentage
            }
          });
        }
        
        await this.reportToDeveloperAgent('operator_capacity_performance', findings, recommendations, issues);
      }
    }
    
    const prompt = `
      ${request.prompt}
      
      ${detailedContext ? `\n\nDetaylı Context:\n${detailedContext}` : ''}
      
      ${requireDetails ? (analysisType === 'operator_capacity_performance' ? `
      LÜTFEN DETAYLI BİR ANALİZ YAPIN:
      1. Operatör kapasitesi hesaplama sürecini analiz edin (yukarıdaki metrikleri kullanın)
      2. Performans takibi mekanizmasını değerlendirin
      3. Yük dengeleme stratejilerini analiz edin
      4. Kapasite planlama sürecini değerlendirin
      5. Tespit edilen sorunları önceliklendirin
      6. İyileştirme önerilerinizi detaylı açıklayın
      7. Her öneri için tahmini süre belirtin
      
      ÖNEMLİ: Yanıtınızı MUTLAKA şu JSON formatında verin:
      {
        "decision": "approve" | "reject" | "conditional",
        "action": "analyze_operator_capacity",
        "data": {
          "operatorCapacity": {
            "calculationMethod": "Açıklama",
            "realTimeIntegration": "Açıklama",
            "loadBalancing": "Açıklama"
          },
          "performanceTracking": {
            "metrics": ["metrik1", "metrik2"],
            "trackingFrequency": "Açıklama",
            "improvements": ["öneri1"]
          },
          "loadBalancing": {
            "strategy": "Açıklama",
            "currentImbalance": "X plan farkı (gerçek değer: yukarıdaki metriklerden)",
            "recommendations": ["öneri1"]
          },
          "improvements": [
            {
              "recommendation": "Öneri açıklaması",
              "estimatedImpact": "X% iyileştirme veya X plan dengesizliği azalması",
              "estimatedEffort": "X saat veya X gün"
            }
          ]
        },
        "reasoning": "Detaylı açıklama - Operatör kapasitesi, performans, yük dengeleme durumu",
        "confidence": 0.0-1.0,
        "issues": ["sorun1", "sorun2"],
        "recommendations": ["öneri1", "öneri2"]
      }
      
      LÜTFEN SADECE JSON DÖNDÜRÜN, EK AÇIKLAMA YAPMAYIN!
      ` : `
      LÜTFEN DETAYLI BİR ANALİZ YAPIN:
      1. Süreçteki her adımı belirleyin
      2. Eksik malzeme tespiti mekanizmasını analiz edin
      3. Yanlış miktar kontrolü mekanizmasını analiz edin
      4. Malzeme tüketimi hesaplama yöntemini değerlendirin
      5. Tespit edilen sorunları önceliklendirin
      6. İyileştirme önerilerinizi detaylı açıklayın
      7. Her öneri için tahmini süre belirtin
      
      Yanıtınızı şu formatta verin:
      {
        "decision": "approve" | "reject" | "conditional",
        "action": "analyze_bom_validation",
        "data": {
          "bomValidation": {
            "process": "Açıklama",
            "missingMaterialDetection": "Açıklama",
            "wrongQuantityDetection": "Açıklama",
            "materialConsumption": "Açıklama"
          },
          "issues": [
            {
              "type": "missing_material" | "wrong_quantity" | "consumption_mismatch",
              "description": "Açıklama",
              "priority": "P1" | "P2" | "P3"
            }
          ],
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
      `) : ''}
      
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
   * Üretim doğrulama işle
   */
  private async handleProductionValidation(request: AgentRequest): Promise<AgentResponse> {
    const { planId } = request.context || {};

    if (planId) {
      return await this.validateProduction(planId, request);
    }

    const prompt = `Üretim doğrulama: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
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
   * Üretim planını doğrula
   */
  private async validateProduction(planId: string, request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Production plan bilgilerini al
    const { data: plan } = await supabase
      .from('production_plans')
      .select(`
        *,
        product:finished_products(*),
        order:orders(*)
      `)
      .eq('id', planId)
      .single();

    if (!plan) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: 'Production plan not found',
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // BOM doğrulama
    const bomValidation = await this.validateBOM(planId, request);
    if (bomValidation.decision !== 'approve') {
      issues.push(...(bomValidation.issues || []));
    }

    // Stok kontrolü (Warehouse Agent'a sor)
    let stockValidation: any = { isAvailable: true, shortages: [] };
    try {
      const warehouseResponse = await this.askAgent(
        'Warehouse Agent',
        `Production plan ${planId} için stok yeterliliğini kontrol et`,
        { planId, productId: plan.product_id, quantity: plan.planned_quantity }
      );
      
      if (warehouseResponse.decision !== 'approve') {
        stockValidation.isAvailable = false;
        stockValidation.shortages = warehouseResponse.issues || [];
        issues.push(...(warehouseResponse.issues || []));
      }
    } catch (error: any) {
      recommendations.push('Warehouse Agent not available, manual stock check recommended');
    }

    // Operatör kapasitesi kontrolü
    let operatorCapacity: any = { available: true };
    if (plan.assigned_operator_id) {
      operatorCapacity = await this.checkOperatorCapacity(plan.assigned_operator_id, request);
      if (operatorCapacity.decision !== 'approve') {
        issues.push('Operator capacity insufficient');
      }
    } else {
      recommendations.push('No operator assigned to this plan');
    }

    const allValid = bomValidation.decision === 'approve' && 
                     stockValidation.isAvailable && 
                     operatorCapacity.available;

    // Reasoning mesajını daha açıklayıcı yap
    let reasoning: string;
    if (allValid) {
      reasoning = 'BOM doğru, stok yeterli, operatör kapasitesi mevcut, üretim yapılabilir';
    } else {
      // Issues varsa detaylı açıkla, yoksa her bir kontrolü açıkla
      if (issues.length > 0) {
        reasoning = `Production validation failed: ${issues.join('; ')}`;
      } else {
        // Her kontrolün durumunu açıkla
        const failureReasons: string[] = [];
        if (bomValidation.decision !== 'approve') {
          failureReasons.push(`BOM validation failed: ${bomValidation.reasoning || 'BOM doğrulaması başarısız'}`);
        }
        if (!stockValidation.isAvailable) {
          failureReasons.push(`Stock validation failed: ${stockValidation.shortages?.join('; ') || 'Stok yetersiz'}`);
        }
        if (!operatorCapacity.available) {
          failureReasons.push(`Operator capacity insufficient: ${operatorCapacity.reasoning || 'Operatör kapasitesi yetersiz'}`);
        }
        reasoning = failureReasons.length > 0 
          ? `Production validation failed: ${failureReasons.join('; ')}`
          : 'Production validation failed: Unknown validation error';
      }
    }

    const response: AgentResponse = {
      id: request.id,
      agent: this.name,
      decision: allValid ? 'approve' : 'reject',
      action: 'validate_production',
      data: {
        planId,
        bomValidation: {
          isValid: bomValidation.decision === 'approve',
          issues: bomValidation.issues || []
        },
        stockValidation,
        operatorCapacity: {
          available: operatorCapacity.available,
          currentLoad: operatorCapacity.data?.currentLoad || 0,
          maxCapacity: operatorCapacity.data?.maxCapacity || 0
        }
      },
      reasoning,
      confidence: allValid ? 0.99 : 0.5,
      issues: issues.length > 0 ? issues : (allValid ? [] : ['Production validation check failed']),
      recommendations,
      timestamp: new Date()
    };

    // Developer Agent'a önemli bulguları bildir (Yeni mimari yapıya göre)
    // Sadece reject veya önemli sorunlar varsa bildir (spam önlemek için)
    if (!allValid && (issues.length > 0 || recommendations.length > 0)) {
      const findings = [
        {
          category: 'production_validation',
          issue: `Production validation failed for plan ${planId}`,
          severity: 'high' as const,
          details: {
            planId,
            bomValid: bomValidation.decision === 'approve',
            stockAvailable: stockValidation.isAvailable,
            operatorAvailable: operatorCapacity.available,
            issues: response.issues
          }
        }
      ];
      
      // Arka planda gönder, hata olsa bile response'u döndür
      this.reportToDeveloperAgent('production_validation', findings, recommendations, issues).catch(error => {
        // Hata olsa bile logla ama response'u bozmama
        agentLogger.warn({
          agent: this.name,
          action: 'report_to_developer_failed',
          error: error.message
        });
      });
    }

    return response;
  }

  /**
   * BOM doğrulama
   */
  private async validateBOM(planId: string, request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const issues: string[] = [];

    // Production plan bilgilerini al
    const { data: plan } = await supabase
      .from('production_plans')
      .select('*, product:finished_products(*)')
      .eq('id', planId)
      .single();

    if (!plan || !plan.product_id) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: 'Production plan or product not found',
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // BOM'u kontrol et
    const { data: bomItems } = await supabase
      .from('bom')
      .select('*')
      .eq('finished_product_id', plan.product_id);

    if (!bomItems || bomItems.length === 0) {
      issues.push('BOM not found for this product');
    } else {
      // BOM item'larını doğrula
      for (const bomItem of bomItems) {
        if (!bomItem.material_id || !bomItem.material_type) {
          issues.push(`Invalid BOM item: missing material_id or material_type`);
        }
        
        if (!bomItem.quantity_needed || bomItem.quantity_needed <= 0) {
          issues.push(`Invalid BOM item: quantity_needed must be greater than 0`);
        }

        // Material'ın var olduğunu kontrol et
        const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
        const { data: material } = await supabase
          .from(tableName)
          .select('id, code, name')
          .eq('id', bomItem.material_id)
          .single();

        if (!material) {
          issues.push(`Material not found: ${bomItem.material_id}`);
        }
      }
    }

    const isValid = issues.length === 0;

    return {
      id: request.id,
      agent: this.name,
      decision: isValid ? 'approve' : 'reject',
      action: 'validate_bom',
      data: {
        planId,
        bomItems: bomItems?.length || 0,
        isValid
      },
      reasoning: isValid
        ? 'BOM is valid and complete'
        : `BOM validation failed: ${issues.join('; ')}`,
      confidence: isValid ? 1.0 : 0.3,
      issues,
      recommendations: [],
      timestamp: new Date()
    };
  }

  /**
   * Operatör kapasitesi kontrolü
   */
  private async checkOperatorCapacity(operatorId: string, request: AgentRequest): Promise<AgentResponse> {
    // Test ortamında test client kullan
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    const supabase = isTestEnv 
      ? (await import('@/lib/supabase/test-client')).createTestClient()
      : await createClient();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Operatör bilgilerini al
    const { data: operator } = await supabase
      .from('operators')
      .select('*, user:users(*)')
      .eq('id', operatorId)
      .single();

    if (!operator) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: 'Operator not found',
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // Aktif üretim sayısını kontrol et
    const { data: activePlans } = await supabase
      .from('production_plans')
      .select('id')
      .eq('assigned_operator_id', operatorId)
      .in('status', ['planlandi', 'devam_ediyor']);

    const currentLoad = activePlans?.length || 0;
    const maxCapacity = operator.daily_capacity || 5; // Default capacity
    const isAvailable = currentLoad < maxCapacity;

    if (!isAvailable) {
      issues.push(`Operator at capacity: ${currentLoad}/${maxCapacity} active productions`);
      recommendations.push('Consider assigning to another operator or wait for completion');
    }

    return {
      id: request.id,
      agent: this.name,
      decision: isAvailable ? 'approve' : 'reject',
      action: 'check_capacity',
      data: {
        operatorId,
        currentLoad,
        maxCapacity,
        available: isAvailable
      },
      reasoning: isAvailable
        ? `Operator has capacity: ${currentLoad}/${maxCapacity} active productions`
        : `Operator at capacity: ${currentLoad}/${maxCapacity} active productions`,
      confidence: isAvailable ? 1.0 : 0.5,
      issues,
      recommendations,
      timestamp: new Date()
    };
  }

  /**
   * Diğer agent'larla doğrulama
   */
  async validateWithOtherAgents(data: any): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Eğer orderId varsa, operatör kapasitesi kontrolü yap
    const orderId = data?.orderId || data?.order_id;
    if (orderId) {
      try {
        // Test ortamında test client kullan
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
        const supabase = isTestEnv 
          ? (await import('@/lib/supabase/test-client')).createTestClient()
          : await createClient();
        
        // Order'dan assigned_operator_id'yi al
        const { data: order } = await supabase
          .from('orders')
          .select('assigned_operator_id')
          .eq('id', orderId)
          .single();
        
        if (order?.assigned_operator_id) {
          const capacityCheck = await this.checkOperatorCapacity(order.assigned_operator_id, {
            id: `validate_${Date.now()}`,
            prompt: 'Kapasite kontrolü',
            type: 'validation',
            context: { orderId, operatorId: order.assigned_operator_id }
          });
          
          if (capacityCheck.decision !== 'approve') {
            issues.push(`Operatör kapasitesi yetersiz: ${capacityCheck.reasoning}`);
          }
        }
      } catch (error: any) {
        // Hata durumunda uyarı ver ama reddetme
        recommendations.push(`Kapasite kontrolü yapılamadı: ${error.message}`);
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

