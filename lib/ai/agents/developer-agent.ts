/**
 * Developer Agent
 * Sistem analizi, kod kalitesi, performans değerlendirmesi ve iyileştirme önerileri
 */

import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, ValidationResult } from '../types/agent.types';
import { agentLogger } from '../utils/logger';
import { logger } from '@/lib/utils/logger';

export class DeveloperAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Sen ThunderV2 ERP sisteminin Geliştirme departmanı AI asistanısın.

Sorumlulukların:
- Sistem analizi ve performans değerlendirmesi
- Kod kalitesi ve mimari analizi
- Eksik özellik tespiti ve önerileri
- İyileştirme önerileri ve optimizasyon
- Hata pattern'leri ve bug tespiti
- Güvenlik açıkları analizi
- Teknik borç (technical debt) tespiti
- Geliştiriciye detaylı raporlama
- Önceliklendirilmiş iyileştirme listesi
- Best practice önerileri

Diğer departmanlarla iletişim kur:
- Tüm Agent'lar: Sistem geneli analiz için veri toplar
- Planning GPT: Planlama süreçlerindeki eksikleri tespit eder
- Warehouse GPT: Stok yönetimi optimizasyonları önerir
- Production GPT: Üretim süreçlerindeki iyileştirmeleri belirler
- Purchase GPT: Satın alma süreçlerindeki eksikleri analiz eder

Karar verirken:
1. Her zaman önceliklendirme yap (P0, P1, P2, P3)
2. Etki analizi yap (impact assessment)
3. Tahmini çaba süresi belirle (estimated effort)
4. Best practice'leri öner
5. Güvenlik ve performansı önceliklendir

Yanıtlarını JSON formatında ver:
{
  "decision": "approve" | "reject" | "conditional",
  "action": "generate_improvement_report" | "analyze_performance" | "detect_issues" | "request_info",
  "data": {
    "findings": [
      {
        "category": "performance" | "security" | "feature" | "code_quality" | "technical_debt",
        "severity": "critical" | "high" | "medium" | "low",
        "issue": "Açıklama",
        "location": "dosya:satır",
        "impact": "Etki açıklaması",
        "recommendation": "Öneri",
        "estimatedEffort": "X hours",
        "priority": "P0" | "P1" | "P2" | "P3"
      }
    ],
    "summary": {
      "totalIssues": 15,
      "critical": 3,
      "high": 5,
      "medium": 4,
      "low": 3,
      "estimatedTotalEffort": "45 hours"
    },
    "recommendations": []
  },
  "reasoning": "Açıklama",
  "confidence": 0.0-1.0,
  "issues": ["sorun1", "sorun2"],
  "recommendations": ["öneri1", "öneri2"]
}`;

    super(
      'Developer Agent',
      'developer',
      [
        'Sistem analizi ve performans değerlendirmesi',
        'Kod kalitesi ve mimari analizi',
        'Eksik özellik tespiti ve önerileri',
        'İyileştirme önerileri ve optimizasyon',
        'Hata pattern\'leri ve bug tespiti',
        'Güvenlik açıkları analizi',
        'Teknik borç tespiti',
        'Geliştiriciye detaylı raporlama'
      ],
      systemPrompt,
      'gpt-4o'
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
          return await this.handleDeveloperRequest(request);
        case 'query':
          return await this.handleDeveloperQuery(request);
        case 'analysis':
          return await this.handleSystemAnalysis(request);
        case 'validation':
          return await this.handleCodeValidation(request);
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
      await agentLogger.error({
        agent: this.name,
        action: 'process_request',
        requestId: request.id,
        error: error.message
      });

      return {
        id: request.id,
        agent: this.name,
        decision: 'rejected',
        reasoning: `Error processing request: ${error.message}`,
        confidence: 0.0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Geliştirme isteği işle
   */
  private async handleDeveloperRequest(request: AgentRequest): Promise<AgentResponse> {
    const { action } = request.context || {};

    if (action === 'generate_improvement_report') {
      return await this.generateImprovementReport(request);
    } else if (action === 'analyze_performance') {
      return await this.analyzePerformance(request);
    } else if (action === 'detect_issues') {
      return await this.detectIssues(request);
    }

    // GPT'ye sor
    const prompt = `
      Geliştirme isteği: ${request.prompt}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
      
      Bu isteği değerlendir ve karar ver:
      - Sistem analizi yapılmalı mı?
      - Hangi iyileştirmeler önerilmeli?
      - Öncelik sırası nasıl olmalı?
    `;

    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: request.id
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Geliştirme sorgusu işle
   */
  private async handleDeveloperQuery(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `Geliştirme sorgusu: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'medium',
        requestId: request.id
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Sistem analizi işle
   */
  private async handleSystemAnalysis(request: AgentRequest): Promise<AgentResponse> {
    // NOT: Bu metod zaten orchestrator.startConversation() içinde çağrılıyor
    // Yeni conversation başlatmaya gerek yok - mevcut conversation kullanılıyor
    
    // Ana konuşma ID'si (mevcut conversation'dan gelir)
    const mainConversationId = request.id || `dev_analysis_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Tüm agent'lara sorarak sistem geneli analiz yap
    const findings: any[] = [];
    const recommendations: string[] = [];
    const allAgentResponses: AgentResponse[] = []; // Tüm agent yanıtlarını topla

    // Planning Agent'a detaylı sorular sor
    try {
      // 1. Order approval sürecinin detaylı analizi
      const planningResponse1 = await this.askAgent(
        'Planning Agent',
        `Order approval sürecinin her aşamasını detaylı inceleyin:
        1. Süreçteki her adımın zamanını ölçün
        2. Sürecin hangi bölümlerinde hangi departmanların etkili olduğunu belirleyin
        3. Performans darboğazlarını tespit edin
        4. İyileştirme önerilerinizi detaylı açıklayın
        5. Her adım için tahmini süre belirtin
        
        Lütfen şu bilgileri içeren detaylı bir analiz yapın:
        - Order approval sürecinin adımları
        - Her adımın ortalama süresi
        - Hangi departmanlar hangi adımda devreye giriyor
        - Performans sorunları ve darboğazlar
        - İyileştirme önerileri ve öncelikleri`,
        {
          analysisType: 'order_approval_process',
          requireDetails: true,
          includeMetrics: true,
          includeRecommendations: true
        }
      );
      
      // 2. BOM yönetimi ve doğrulama süreci
      const planningResponse2 = await this.askAgent(
        'Planning Agent',
        `BOM yönetimi ve doğrulama sürecini analiz edin:
        1. BOM doğrulama sürecinin adımlarını belirleyin
        2. Her adımın süresini ölçün
        3. Hangi kontroller yapılıyor?
        4. Eksik veya yavaş olan kontroller var mı?
        5. İyileştirme önerileriniz neler?`,
        {
          analysisType: 'bom_validation_process',
          requireDetails: true
        }
      );
      
      // Yanıtları topla
      allAgentResponses.push(planningResponse1);
      allAgentResponses.push(planningResponse2);
      
      // 3. Operatör atama ve kapasite planlama
      const planningResponse3 = await this.askAgent(
        'Planning Agent',
        `Operatör atama ve kapasite planlama sürecini analiz edin:
        1. Operatör atama algoritması nasıl çalışıyor?
        2. Kapasite hesaplama yöntemi nedir?
        3. Yük dengeleme nasıl yapılıyor?
        4. Optimizasyon ihtiyaçları var mı?
        5. İyileştirme önerileriniz neler?`,
        {
          analysisType: 'operator_assignment_process',
          requireDetails: true
        }
      );
      
      // Yanıtları topla
      allAgentResponses.push(planningResponse3);
      
      // Planning Agent yanıtlarını analiz et ve bulgulara ekle
      const planningFindings: any[] = [];
      
      // Response 1: Order approval süreci
      if (planningResponse1.reasoning && planningResponse1.reasoning.length > 10) {
        planningFindings.push({
          category: 'performance',
          severity: 'high',
          issue: `Order Approval Süreci Analizi: ${planningResponse1.reasoning.substring(0, 200)}...`,
          location: 'app/api/orders/[id]/approve/route.ts',
          impact: planningResponse1.issues?.join('; ') || 'Order approval process may have performance issues',
          recommendation: planningResponse1.recommendations?.join('; ') || planningResponse1.reasoning,
          estimatedEffort: '4-8 hours',
          priority: 'P1',
          details: {
            response: planningResponse1,
            analysisType: 'order_approval_process'
          }
        });
      } else if (planningResponse1.issues && planningResponse1.issues.length > 0) {
        planningFindings.push({
          category: 'performance',
          severity: 'high',
          issue: `Planning Agent: ${planningResponse1.issues.join(', ')}`,
          location: 'app/api/orders/[id]/approve/route.ts',
          impact: 'Order approval process may be slow',
          recommendation: planningResponse1.recommendations?.join('; ') || 'Review and optimize',
          estimatedEffort: '4 hours',
          priority: 'P1'
        });
      }
      
      // Response 2: BOM validation
      if (planningResponse2.reasoning && planningResponse2.reasoning.length > 10) {
        planningFindings.push({
          category: 'feature',
          severity: 'medium',
          issue: `BOM Validation Süreci: ${planningResponse2.reasoning.substring(0, 200)}...`,
          location: 'app/api/orders/[id]/approve/route.ts, lib/bom/',
          impact: planningResponse2.issues?.join('; ') || 'BOM validation may have issues',
          recommendation: planningResponse2.recommendations?.join('; ') || planningResponse2.reasoning,
          estimatedEffort: '6 hours',
          priority: 'P2'
        });
      }
      
      // Response 3: Operator assignment
      if (planningResponse3.reasoning && planningResponse3.reasoning.length > 10) {
        planningFindings.push({
          category: 'performance',
          severity: 'medium',
          issue: `Operatör Atama Süreci: ${planningResponse3.reasoning.substring(0, 200)}...`,
          location: 'app/api/orders/[id]/route.ts',
          impact: planningResponse3.issues?.join('; ') || 'Operator assignment may need optimization',
          recommendation: planningResponse3.recommendations?.join('; ') || planningResponse3.reasoning,
          estimatedEffort: '4 hours',
          priority: 'P2'
        });
      }
      
      findings.push(...planningFindings);
      
    } catch (error: any) {
      // Agent hatası durumunda da bulgu ekle
      findings.push({
        category: 'performance',
        severity: 'medium',
        issue: `Planning Agent ile iletişim hatası: ${error.message}`,
        location: 'lib/ai/agents/developer-agent.ts',
        impact: 'Developer Agent Planning Agent\'tan yeterli bilgi alamıyor',
        recommendation: 'Planning Agent iletişim mekanizmasını iyileştir, daha detaylı sorgular yap',
        estimatedEffort: '2 hours',
        priority: 'P2'
      });
    }

    // Warehouse Agent'a detaylı sorular sor
    try {
      // 1. Stok hareketleri analizi
      const warehouseResponse1 = await this.askAgent(
        'Warehouse Agent',
        `Stok hareketleri analizi yapın:
        1. Stok hareketleri düzenli kaydediliyor mu?
        2. Hangi hareket tipleri en sık kullanılıyor?
        3. Stok hareketleri analiz ediliyor mu?
        4. Eksik veya yanlış kayıtlar var mı?
        5. İyileştirme önerileriniz neler?
        
        Lütfen şu bilgileri içeren detaylı bir analiz yapın:
        - Stok hareketleri kayıt durumu
        - Hareket tiplerine göre dağılım
        - Günlük/haftalık hareket sayıları
        - Eksik kayıtlar
        - İyileştirme önerileri`,
        {
          analysisType: 'stock_movements_analysis',
          requireDetails: true,
          includeMetrics: true,
          includeRecommendations: true
        }
      );
      
      // 2. Stok seviyeleri analizi
      const warehouseResponse2 = await this.askAgent(
        'Warehouse Agent',
        `Stok seviyeleri analizi yapın:
        1. Stok seviyeleri düzenli güncelleniyor mu?
        2. Kritik seviyedeki malzemeler tespit ediliyor mu?
        3. Güncellenmemiş stok kayıtları var mı?
        4. Otomatik güncelleme mekanizması var mı?
        5. İyileştirme önerileriniz neler?
        
        Lütfen şu bilgileri içeren detaylı bir analiz yapın:
        - Stok seviyeleri güncelleme sıklığı
        - Kritik seviyedeki malzemeler
        - Güncellenmemiş kayıtlar
        - Otomasyon durumu
        - İyileştirme önerileri`,
        {
          analysisType: 'stock_levels_analysis',
          requireDetails: true,
          includeMetrics: true,
          includeRecommendations: true
        }
      );
      
      // Yanıtları topla
      allAgentResponses.push(warehouseResponse1);
      allAgentResponses.push(warehouseResponse2);
      
      // Warehouse Agent yanıtlarını analiz et ve bulgulara ekle
      const warehouseFindings: any[] = [];
      
      // Response 1: Stok hareketleri
      if (warehouseResponse1.issues && warehouseResponse1.issues.length > 0) {
        warehouseFindings.push({
          category: 'performance',
          severity: 'medium',
          issue: `Warehouse Agent: ${warehouseResponse1.issues.join(', ')}`,
          location: 'app/api/stock/movements/route.ts',
          impact: 'Stok hareketleri analizi yapılmadı veya eksik',
          recommendation: warehouseResponse1.recommendations?.join('; ') || 'Stok hareketlerini düzenli olarak analiz edin',
          estimatedEffort: '6 hours',
          priority: 'P2',
          details: {
            response: warehouseResponse1,
            analysisType: 'stock_movements_analysis'
          }
        });
      }
      
      // Response 2: Stok seviyeleri
      if (warehouseResponse2.issues && warehouseResponse2.issues.length > 0) {
        warehouseFindings.push({
          category: 'performance',
          severity: 'medium',
          issue: `Warehouse Agent: ${warehouseResponse2.issues.join(', ')}`,
          location: 'app/api/stock/',
          impact: 'Stok seviyeleri güncellenmedi veya eksik',
          recommendation: warehouseResponse2.recommendations?.join('; ') || 'Stok seviyelerini güncel tutmak için otomatik sistemler kullanın',
          estimatedEffort: '6 hours',
          priority: 'P2',
          details: {
            response: warehouseResponse2,
            analysisType: 'stock_levels_analysis'
          }
        });
      }
      
      // Eğer her iki analiz de sorun bulduysa birleştir
      if (warehouseFindings.length > 0) {
        findings.push(...warehouseFindings);
      } else if (warehouseResponse1.reasoning || warehouseResponse2.reasoning) {
        // Reasoning varsa genel bir finding ekle
        findings.push({
          category: 'performance',
          severity: 'medium',
          issue: 'Warehouse Agent: Stok hareketleri ve stok seviyeleri analizi yapılmalı',
          location: 'app/api/stock/',
          impact: 'Stock check operations may be slow; Stock levels may not be updated',
          recommendation: 'Stok hareketlerini düzenli olarak analiz edin.; Stok seviyelerini güncel tutmak için otomatik sistemler kullanın',
          estimatedEffort: '6 hours',
          priority: 'P2'
        });
      }
    } catch (error: any) {
      // Agent hatası durumunda da bulgu ekle
      findings.push({
        category: 'performance',
        severity: 'medium',
        issue: `Warehouse Agent ile iletişim hatası: ${error.message}`,
        location: 'lib/ai/agents/warehouse-agent.ts',
        impact: 'Developer Agent Warehouse Agent\'tan yeterli bilgi alamıyor',
        recommendation: 'Warehouse Agent iletişim mekanizmasını iyileştir, daha detaylı sorgular yap',
        estimatedEffort: '2 hours',
        priority: 'P2'
      });
    }

    // Production Agent'a detaylı sorular sor
    try {
      // 1. BOM validation ve malzeme kontrolü analizi
      const productionResponse1 = await this.askAgent(
        'Production Agent',
        `BOM validation ve malzeme kontrolü sürecini detaylı analiz edin:
        1. BOM validation sürecinin adımlarını belirleyin
        2. Eksik malzeme tespiti nasıl yapılıyor?
        3. Yanlış miktar kontrolü nasıl yapılıyor?
        4. Malzeme tüketimi doğru hesaplanıyor mu?
        5. BOM validation'da eksik kontroller var mı?
        6. İyileştirme önerileriniz neler?
        
        Lütfen şu bilgileri içeren detaylı bir analiz yapın:
        - BOM validation süreç adımları
        - Eksik malzeme tespiti mekanizması
        - Yanlış miktar kontrolü mekanizması
        - Malzeme tüketimi hesaplama yöntemi
        - Tespit edilen sorunlar ve öncelikleri
        - İyileştirme önerileri ve tahmini süreler`,
        {
          analysisType: 'bom_validation_material_check',
          requireDetails: true,
          includeMetrics: true,
          includeRecommendations: true
        }
      );
      
      // 2. Üretim log validation ve stok tüketimi analizi
      const productionResponse2 = await this.askAgent(
        'Production Agent',
        `Üretim log validation ve stok tüketimi sürecini analiz edin:
        1. Üretim log validation nasıl yapılıyor?
        2. Stok tüketimi otomatik hesaplanıyor mu?
        3. BOM ile gerçek tüketim karşılaştırılıyor mu?
        4. Anomali tespiti yapılıyor mu?
        5. İyileştirme önerileriniz neler?`,
        {
          analysisType: 'production_log_validation',
          requireDetails: true
        }
      );
      
      // Yanıtları topla
      allAgentResponses.push(productionResponse1);
      allAgentResponses.push(productionResponse2);
      
      // 3. Operatör kapasitesi ve performans analizi
      const productionResponse3 = await this.askAgent(
        'Production Agent',
        `Operatör kapasitesi ve performans analizi yapın:
        1. Operatör kapasitesi nasıl hesaplanıyor?
        2. Yük dengeleme yapılıyor mu?
        3. Performans metrikleri takip ediliyor mu?
        4. İyileştirme önerileriniz neler?`,
        {
          analysisType: 'operator_capacity_performance',
          requireDetails: true
        }
      );
      
      // Yanıtları topla
      allAgentResponses.push(productionResponse3);
      
      // Production Agent yanıtlarını analiz et ve bulgulara ekle
      const productionFindings: any[] = [];
      
      // Response 1: BOM validation
      if (productionResponse1.reasoning && productionResponse1.reasoning.length > 10) {
        productionFindings.push({
          category: 'feature',
          severity: 'medium',
          issue: `BOM Validation ve Malzeme Kontrolü: ${productionResponse1.reasoning.substring(0, 200)}...`,
          location: 'app/api/production/log/route.ts, lib/ai/agents/production-agent.ts',
          impact: productionResponse1.issues?.join('; ') || 'BOM validation may miss edge cases, missing materials, wrong quantities',
          recommendation: productionResponse1.recommendations?.join('; ') || productionResponse1.reasoning,
          estimatedEffort: '6-10 hours',
          priority: 'P2',
          details: {
            response: productionResponse1,
            analysisType: 'bom_validation_material_check'
          }
        });
      } else if (productionResponse1.issues && productionResponse1.issues.length > 0) {
        productionFindings.push({
          category: 'feature',
          severity: 'medium',
          issue: `Production Agent: ${productionResponse1.issues.join(', ')}`,
          location: 'app/api/production/',
          impact: 'BOM validation may miss edge cases',
          recommendation: productionResponse1.recommendations?.join('; ') || 'Enhance validation logic',
          estimatedEffort: '8 hours',
          priority: 'P2'
        });
      }
      
      // Response 2: Production log validation
      if (productionResponse2.reasoning && productionResponse2.reasoning.length > 10) {
        productionFindings.push({
          category: 'feature',
          severity: 'medium',
          issue: `Üretim Log Validation: ${productionResponse2.reasoning.substring(0, 200)}...`,
          location: 'app/api/production/log/route.ts',
          impact: productionResponse2.issues?.join('; ') || 'Production log validation may have issues',
          recommendation: productionResponse2.recommendations?.join('; ') || productionResponse2.reasoning,
          estimatedEffort: '4 hours',
          priority: 'P2'
        });
      }
      
      // Response 3: Operator capacity
      if (productionResponse3.reasoning && productionResponse3.reasoning.length > 10) {
        productionFindings.push({
          category: 'performance',
          severity: 'low',
          issue: `Operatör Kapasitesi Analizi: ${productionResponse3.reasoning.substring(0, 200)}...`,
          location: 'app/api/production/',
          impact: productionResponse3.issues?.join('; ') || 'Operator capacity management may need improvements',
          recommendation: productionResponse3.recommendations?.join('; ') || productionResponse3.reasoning,
          estimatedEffort: '3 hours',
          priority: 'P3'
        });
      }
      
      findings.push(...productionFindings);
      
    } catch (error: any) {
      // Agent hatası durumunda da bulgu ekle
      findings.push({
        category: 'feature',
        severity: 'medium',
        issue: `Production Agent ile iletişim hatası: ${error.message}`,
        location: 'lib/ai/agents/developer-agent.ts',
        impact: 'Developer Agent Production Agent\'tan yeterli bilgi alamıyor',
        recommendation: 'Production Agent iletişim mekanizmasını iyileştir, BOM validation kontrolü ekle',
        estimatedEffort: '2 hours',
        priority: 'P2'
      });
    }

    // Purchase Agent'a detaylı sorular sor
    try {
      // 1. Fiyat karşılaştırması ve cache mekanizması analizi
      const purchaseResponse1 = await this.askAgent(
        'Purchase Agent',
        `Fiyat karşılaştırması ve cache mekanizmasını detaylı analiz edin:
        1. Mevcut sistemin cache'leme mekanizmasını kontrol edin
        2. Fiyat karşılaştırması için cache kullanılıyor mu?
        3. Cache TTL (Time To Live) değerleri nedir?
        4. Fiyat değişimlerini izlemek için düzenli güncellemeler yapılıyor mu?
        5. Cache invalidation stratejisi nedir?
        6. Performans iyileştirmeleri için önerileriniz neler?
        
        Lütfen şu bilgileri içeren detaylı bir analiz yapın:
        - Mevcut cache durumu
        - Fiyat karşılaştırması süreçleri
        - Cache hit/miss oranları (tahmini)
        - Fiyat güncelleme mekanizması
        - İyileştirme önerileri ve öncelikleri`,
        {
          analysisType: 'price_comparison_cache',
          requireDetails: true,
          includeMetrics: true,
          includeRecommendations: true
        }
      );
      
      // 2. Tedarikçi fiyat yönetimi analizi
      const purchaseResponse2 = await this.askAgent(
        'Purchase Agent',
        `Tedarikçi fiyat yönetimi sürecini analiz edin:
        1. Tedarikçi fiyatları nasıl saklanıyor?
        2. Fiyat güncellemeleri nasıl yapılıyor?
        3. Fiyat geçmişi tutuluyor mu?
        4. Fiyat karşılaştırması algoritması nedir?
        5. İyileştirme önerileriniz neler?`,
        {
          analysisType: 'supplier_price_management',
          requireDetails: true
        }
      );
      
      // Yanıtları topla
      allAgentResponses.push(purchaseResponse1);
      allAgentResponses.push(purchaseResponse2);
      
      // Purchase Agent yanıtlarını analiz et ve bulgulara ekle
      const purchaseFindings: any[] = [];
      
      // Response 1: Price comparison cache
      if (purchaseResponse1.reasoning && purchaseResponse1.reasoning.length > 10) {
        purchaseFindings.push({
          category: 'performance',
          severity: 'low',
          issue: `Fiyat Karşılaştırması Cache Analizi: ${purchaseResponse1.reasoning.substring(0, 200)}...`,
          location: 'app/api/purchase/, lib/ai/utils/cache.ts',
          impact: purchaseResponse1.issues?.join('; ') || 'Price comparison may be slow without proper caching',
          recommendation: purchaseResponse1.recommendations?.join('; ') || purchaseResponse1.reasoning,
          estimatedEffort: '3-6 hours',
          priority: 'P3',
          details: {
            response: purchaseResponse1,
            analysisType: 'price_comparison_cache'
          }
        });
      } else if (purchaseResponse1.issues && purchaseResponse1.issues.length > 0) {
        purchaseFindings.push({
          category: 'performance',
          severity: 'low',
          issue: `Purchase Agent: ${purchaseResponse1.issues.join(', ')}`,
          location: 'app/api/purchase/',
          impact: 'Price comparison may be slow',
          recommendation: purchaseResponse1.recommendations?.join('; ') || 'Add caching',
          estimatedEffort: '3 hours',
          priority: 'P3'
        });
      }
      
      // Response 2: Supplier price management
      if (purchaseResponse2.reasoning && purchaseResponse2.reasoning.length > 10) {
        purchaseFindings.push({
          category: 'feature',
          severity: 'medium',
          issue: `Tedarikçi Fiyat Yönetimi: ${purchaseResponse2.reasoning.substring(0, 200)}...`,
          location: 'app/api/purchase/, supabase/migrations/',
          impact: purchaseResponse2.issues?.join('; ') || 'Supplier price management may need improvements',
          recommendation: purchaseResponse2.recommendations?.join('; ') || purchaseResponse2.reasoning,
          estimatedEffort: '4 hours',
          priority: 'P2'
        });
      }
      
      findings.push(...purchaseFindings);
      
    } catch (error: any) {
      // Agent hatası durumunda da bulgu ekle
      findings.push({
        category: 'performance',
        severity: 'low',
        issue: `Purchase Agent ile iletişim hatası: ${error.message}`,
        location: 'lib/ai/agents/developer-agent.ts',
        impact: 'Developer Agent Purchase Agent\'tan yeterli bilgi alamıyor',
        recommendation: 'Purchase Agent iletişim mekanizmasını iyileştir, cache kontrolü ekle',
        estimatedEffort: '2 hours',
        priority: 'P3'
      });
    }

    // Özet oluştur
    const summary = {
      totalIssues: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      estimatedTotalEffort: `${findings.reduce((sum, f) => {
        const hours = parseInt(f.estimatedEffort) || 0;
        return sum + hours;
      }, 0)} hours`
    };

    const prompt = `
      Sistem analizi sonuçları:
      ${JSON.stringify(findings, null, 2)}
      
      Bu bulguları analiz et ve önceliklendirilmiş bir rapor oluştur.
      Önerilen sprint planı hazırla.
    `;

    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: request.id || mainConversationId
      }
    );

    // Developer Agent'ın kendi GPT çağrısının maliyetini logla
    const tokens = gptResponse.usage?.total_tokens || 0;
    const model = gptResponse.model || 'gpt-4o';
    logger.log(`💰 Developer Agent GPT çağrısı: ${tokens} tokens, model: ${model}, requestId: ${request.id || mainConversationId}`);

    const parsed = this.parseResponse(gptResponse);
    parsed.data = {
      ...parsed.data,
      findings,
      summary
    };

    // NOT: Orchestrator'a nested conversation başlatma - zaten orchestrator.startConversation() ile başlatıldı
    // Bu metod bir conversation içinde çağrılıyor, yeni conversation başlatmaya gerek yok
    // Tüm yanıtlar zaten mevcut conversation'a ekleniyor
    
    logger.log(`✅ Developer Agent sistem analizi tamamlandı: ${findings.length} finding, ${allAgentResponses.length} agent yanıtı`);

    return parsed;
  }

  /**
   * Kod doğrulama işle
   */
  private async handleCodeValidation(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `Kod doğrulama: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'medium',
        requestId: request.id
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * İyileştirme raporu oluştur
   */
  private async generateImprovementReport(request: AgentRequest): Promise<AgentResponse> {
    // Sistem analizi yap
    const analysisResponse = await this.handleSystemAnalysis(request);
    
    return {
      ...analysisResponse,
      action: 'generate_improvement_report'
    };
  }

  /**
   * Performans analizi
   */
  private async analyzePerformance(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `
      Performans analizi yap:
      ${request.prompt}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
      
      Şunları analiz et:
      - Database query performansı
      - API response time'ları
      - Frontend render performansı
      - Cache kullanımı
      - Optimizasyon fırsatları
    `;

    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: request.id
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Sorun tespiti
   */
  private async detectIssues(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `
      Sistem genelinde sorun tespiti yap:
      ${request.prompt}
      
      Context: ${JSON.stringify(request.context || {}, null, 2)}
      
      Şunları kontrol et:
      - Güvenlik açıkları
      - Performans sorunları
      - Kod kalitesi sorunları
      - Eksik özellikler
      - Teknik borç
    `;

    const gptResponse = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: request.id
      }
    );

    return this.parseResponse(gptResponse);
  }

  /**
   * Diğer agent'larla doğrulama
   */
  async validateWithOtherAgents(data: any): Promise<ValidationResult> {
    // Developer Agent genellikle diğer agent'ları analiz eder, kendisi doğrulama yapmaz
    // Ancak sistem geneli analiz için gerçek verileri kullanır
    
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Gerçek sistem metriklerini kontrol et
    try {
      // Test ortamında test client kullan
      const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
      const supabase = isTestEnv 
        ? (await import('@/lib/supabase/test-client')).createTestClient()
        : await createClient();
      
      // Aktif order sayısı
      const { count: activeOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'uretimde');
      
      // Aktif production plan sayısı
      const { count: activePlans } = await supabase
        .from('production_plans')
        .select('*', { count: 'exact', head: true })
        .in('status', ['planlandi', 'devam_ediyor']);
      
      // Kritik stok seviyesindeki malzemeler (raw materials)
      const { data: allRawMaterials } = await supabase
        .from('raw_materials')
        .select('code, name, quantity, critical_level')
        .not('critical_level', 'is', null);
      
      // Kritik stok seviyesindeki malzemeler (semi-finished products)
      const { data: allSemiMaterials } = await supabase
        .from('semi_finished_products')
        .select('code, name, quantity, critical_level')
        .not('critical_level', 'is', null);
      
      // JavaScript'te kritik seviyeyi kontrol et
      const criticalMaterials = [
        ...(allRawMaterials || []).filter(m => m.quantity <= (m.critical_level || 0)),
        ...(allSemiMaterials || []).filter(m => m.quantity <= (m.critical_level || 0))
      ];
      
      if (criticalMaterials && criticalMaterials.length > 0) {
        issues.push(`${criticalMaterials.length} malzeme kritik stok seviyesinde`);
        recommendations.push('Kritik stok seviyesindeki malzemeler için satın alma siparişi oluşturulmalı');
      }
      
      if (activeOrders && activeOrders > 10) {
        recommendations.push(`Yüksek iş yükü: ${activeOrders} aktif sipariş`);
      }
      
      if (activePlans && activePlans > 20) {
        recommendations.push(`Yüksek üretim yükü: ${activePlans} aktif üretim planı`);
      }
    } catch (error: any) {
      recommendations.push(`Sistem metrikleri kontrol edilemedi: ${error.message}`);
    }

    // Tüm agent'lara sistem durumu sor (gerçek veri ile)
    const agentNames = ['Planning Agent', 'Warehouse Agent', 'Production Agent', 'Purchase Agent'];
    
    for (const agentName of agentNames) {
      try {
        const response = await this.askAgent(
          agentName,
          'Sistem performansı ve iyileştirme önerilerin neler?',
          data
        );

        if (response.issues && response.issues.length > 0) {
          issues.push(`${agentName}: ${response.issues.join(', ')}`);
        }
        
        if (response.recommendations && response.recommendations.length > 0) {
          recommendations.push(...response.recommendations);
        }
      } catch (error: any) {
        // Agent yanıt veremezse devam et
        continue;
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
      confidence: issues.length === 0 ? 1.0 : 0.7
    };
  }
}

