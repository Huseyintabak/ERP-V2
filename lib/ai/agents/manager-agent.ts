/**
 * Manager Agent
 * Yönetim departmanı AI asistanı - Stratejik kararlar, kritik onaylar, performans analizi
 */

import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, ValidationResult } from '../types/agent.types';
import { agentLogger } from '../utils/logger';
import { createClient } from '@/lib/supabase/server';

export class ManagerAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Sen ThunderV2 ERP sisteminin Yönetim departmanı AI asistanısın.

Sorumlulukların:
- Stratejik karar desteği ve yönlendirme
- Kritik işlemler için onay ve risk değerlendirmesi
- Performans analizi ve raporlama
- Sistem geneli optimizasyon önerileri
- Departmanlar arası koordinasyon ve dengeleme
- Bütçe ve maliyet kontrolü
- Risk yönetimi ve önleme
- Stratejik planlama ve hedef belirleme

**Risk Skorlama Metrikleri:**
1. Mali Risk (0-100):
   - >100K TL işlem: Yüksek risk (75+)
   - 50-100K TL işlem: Orta risk (50-74)
   - <50K TL işlem: Düşük risk (0-49)

2. Operasyonel Risk (0-100):
   - Üretim durması riski: Yüksek (75+)
   - Kritik stok eksikliği: Yüksek (75+)
   - Tedarik gecikmesi: Orta (50-74)
   - Normal operasyon: Düşük (0-49)

3. Stratejik Risk (0-100):
   - Uzun vadeli etki: Yüksek (75+)
   - Müşteri memnuniyeti etkisi: Orta-Yüksek (50-100)
   - Kısa vadeli etki: Düşük (0-49)

4. Toplam Risk Skoru:
   - 0-40: 🟢 Düşük Risk - Onay
   - 41-70: 🟡 Orta Risk - Koşullu Onay
   - 71-90: 🟠 Yüksek Risk - İnceleme Gerekli
   - 91-100: 🔴 Kritik Risk - Red/İnceleme

**Bütçe Etki Analizi:**
- Pozitif Etki: Gelir artışı, maliyet azalışı
- Nötr: Etkisiz işlem
- Negatif Etki: Gider artışı (bütçe aşımı riski)

**Stratejik Uyumluluk Kriterleri:**
- Uzun vadeli hedeflerle uyumlu mu?
- Müşteri memnuniyetini artırıyor mu?
- İş sürekliliğini koruyor mu?
- Rekabet avantajı sağlıyor mu?

Diğer departmanlarla iletişim kur:
- Tüm Agent'lar: Genel yönetim ve koordinasyon için tüm agent'larla iletişim kur
- Planning GPT: Planlama stratejilerini değerlendir, optimizasyon öner
- Warehouse GPT: Stok yönetimi stratejilerini analiz et
- Production GPT: Üretim verimliliğini değerlendir
- Purchase GPT: Satın alma stratejilerini ve bütçe kontrolünü yap
- Developer GPT: Sistem iyileştirmelerini önceliklendir

Karar verirken:
1. Her zaman stratejik perspektiften bak
2. Risk değerlendirmesi yap (Mali, Operasyonel, Stratejik risk skorları)
3. Bütçe ve maliyet kontrolü yap (Bütçe etki analizi)
4. Sistem geneli etkiyi değerlendir
5. Departmanlar arası dengeyi koru
6. Uzun vadeli hedefleri göz önünde bulundur (Stratejik uyumluluk)
7. Kritik işlemler için detaylı analiz yap

Yanıtlarını JSON formatında ver:
{
  "decision": "approve" | "reject" | "conditional",
  "action": "approve_critical_operation" | "reject_operation" | "request_analysis" | "strategic_recommendation",
  "data": {
    "operation": "operation_type",
    "amount": 0,
    "riskLevel": "low" | "medium" | "high" | "critical",
    "totalRiskScore": 0-100,
    "budgetImpact": "positive" | "neutral" | "negative",
    "strategicAlignment": true | false,
    "recommendations": [],
    "conditions": []
  },
  "reasoning": "Açıklama",
  "confidence": 0.0-1.0,
  "issues": ["sorun1", "sorun2"],
  "recommendations": ["öneri1", "öneri2"]
}`;

    super(
      'Manager Agent',
      'manager',
      [
        'Stratejik karar desteği',
        'Kritik işlemler için onay',
        'Performans analizi ve raporlama',
        'Risk değerlendirmesi',
        'Sistem geneli optimizasyon önerileri',
        'Departmanlar arası koordinasyon',
        'Bütçe ve maliyet kontrolü',
        'Stratejik planlama'
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
      // Request tipine göre işlem yap
      switch (request.type) {
        case 'request':
          return await this.handleCriticalOperation(request);
        case 'query':
          // Developer Agent'tan gelen sistem analiz raporu mu kontrol et
          if (request.context?.reportType === 'system_analysis_critical_findings' || 
              request.context?.sourceAgent === 'Developer Agent') {
            return await this.handleDeveloperReport(request);
          }
          return await this.handleStrategicQuery(request);
        case 'analysis':
          return await this.handlePerformanceAnalysis(request);
        case 'validation':
          return await this.handleRiskValidation(request);
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
        action: 'process_request_error',
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
          issues: [`OpenAI API error: ${errorMessage}`],
          timestamp: new Date()
        };
      }

      // Diğer hatalar için reject
      return {
        id: request.id,
        agent: this.name,
        decision: 'reject',
        reasoning: `Error processing request: ${errorMessage}`,
        confidence: 0.0,
        issues: [errorMessage],
        timestamp: new Date()
      };
    }
  }

  /**
   * Kritik işlem onayı
   */
  private async handleCriticalOperation(request: AgentRequest): Promise<AgentResponse> {
    const context = request.context || {};
    const operation = context.operation || 'unknown';
    const amount = context.amount || 0;
    const urgency = request.urgency || 'medium';

    // GPT'ye sor
    const prompt = `
      Bu kritik işlemi değerlendir ve onay/red kararı ver:
      
      İşlem: ${operation}
      Miktar/Tutar: ${amount}
      Aciliyet: ${urgency}
      Severity: ${request.severity || 'medium'}
      
      Context: ${JSON.stringify(context, null, 2)}
      
      Değerlendir:
      1. Risk seviyesi nedir?
      2. Bütçe etkisi nedir?
      3. Stratejik uyum var mı?
      4. Sistem geneli etkisi nedir?
      5. Departmanlar arası dengeyi etkiler mi?
    `;

    const response = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: urgency === 'critical' ? 'critical' : 'complex',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(response);
  }

  /**
   * Stratejik sorgu
   */
  private async handleStrategicQuery(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `
      ${request.prompt}
      
      Stratejik perspektiften değerlendir ve öneriler sun.
    `;

    const response = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'medium',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(response);
  }

  /**
   * Developer Agent'tan sistem analiz raporunu işle
   * Yeni mimari yapıya göre: Manager Agent ← Developer Agent
   */
  private async handleDeveloperReport(request: AgentRequest): Promise<AgentResponse> {
    const context = request.context || {};
    const reportType = context.reportType || 'unknown';
    const criticalFindings = context.criticalFindings || [];
    const summary = context.summary || {};
    
    // Developer Agent'tan gelen kritik bulguları analiz et
    const prompt = `
      Developer Agent'tan sistem analiz raporu alındı:
      
      Rapor Tipi: ${reportType}
      
      Özet:
      - Toplam Sorun: ${summary.totalIssues || 0}
      - Kritik: ${summary.critical || 0}
      - Yüksek: ${summary.high || 0}
      - Orta: ${summary.medium || 0}
      - Düşük: ${summary.low || 0}
      - Tahmini Toplam Çaba: ${summary.estimatedTotalEffort || 'N/A'}
      
      Kritik Bulgular (${criticalFindings.length} adet):
      ${JSON.stringify(criticalFindings, null, 2)}
      
      Lütfen bu raporu stratejik perspektiften değerlendir:
      1. Hangi bulgular en kritik ve acil müdahale gerektiriyor?
      2. Hangi bulgular için bütçe ayrılmalı?
      3. Hangi bulgular stratejik öneme sahip?
      4. Risk değerlendirmesi yap (her bulgu için risk skoru)
      5. Öncelik sıralaması oluştur
      6. Stratejik öneriler sun
    `;

    const response = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: criticalFindings.length > 0 ? 'complex' : 'medium',
        requestId: request.id,
        requestType: request.type
      }
    );

    const parsed = this.parseResponse(response);
    
    // Manager Agent'ın analiz sonucunu data field'ına ekle
    parsed.data = {
      ...parsed.data,
      reportType,
      criticalFindings,
      summary,
      strategicAnalysis: parsed.reasoning,
      prioritizedFindings: criticalFindings.map((f: any, index: number) => ({
        ...f,
        strategicPriority: index + 1,
        requiresBudget: f.severity === 'critical' || f.severity === 'high',
        requiresApproval: f.severity === 'critical'
      }))
    };

    // Kritik bulgular varsa human approval'a gönder (gelecekte)
    const criticalCount = criticalFindings.filter((f: any) => 
      f.severity === 'critical' || f.priority === 'P0'
    ).length;
    
    if (criticalCount > 0) {
      parsed.recommendations = [
        ...(parsed.recommendations || []),
        `${criticalCount} kritik bulgu için human approval gerekebilir`
      ];
    }

    return parsed;
  }

  /**
   * Performans analizi
   */
  private async handlePerformanceAnalysis(request: AgentRequest): Promise<AgentResponse> {
    const context = request.context || {};
    
    // Tüm agent'lardan performans verilerini topla
    const allAgents = ['planning', 'warehouse', 'production', 'purchase', 'developer'];
    const performanceData: any[] = [];

    for (const agentName of allAgents) {
      try {
        const agentResponse = await this.askAgent(agentName, 
          'Performans metriklerin neler? Son işlemlerin başarı oranı nedir?',
          { analysisType: 'performance' }
        );
        performanceData.push({
          agent: agentName,
          data: agentResponse.data
        });
      } catch (error) {
        // Agent yanıt veremezse devam et
        continue;
      }
    }

    const prompt = `
      Sistem geneli performans analizi yap:
      
      Agent Performans Verileri:
      ${JSON.stringify(performanceData, null, 2)}
      
      Context: ${JSON.stringify(context, null, 2)}
      
      Analiz et:
      1. Genel performans durumu
      2. İyileştirme gereken alanlar
      3. Stratejik öneriler
      4. Risk alanları
    `;

    const response = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(response);
  }

  /**
   * Risk doğrulama
   */
  private async handleRiskValidation(request: AgentRequest): Promise<AgentResponse> {
    const context = request.context || {};
    const operation = context.operation || 'unknown';

    // Risk faktörlerini kontrol et
    const riskFactors: string[] = [];
    
    if (context.amount && context.amount > 10000) {
      riskFactors.push('Yüksek tutarlı işlem');
    }
    
    if (request.severity === 'critical') {
      riskFactors.push('Kritik seviye işlem');
    }

    const prompt = `
      Bu işlemin risk değerlendirmesini yap:
      
      İşlem: ${operation}
      Risk Faktörleri: ${riskFactors.join(', ') || 'Yok'}
      Context: ${JSON.stringify(context, null, 2)}
      
      Değerlendir:
      1. Risk seviyesi (low, medium, high, critical)
      2. Potansiyel sorunlar
      3. Önlem önerileri
      4. Onay/Red kararı
    `;

    const response = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: request.id,
        requestType: request.type
      }
    );

    return this.parseResponse(response);
  }

  /**
   * Diğer agent'larla doğrulama
   */
  async validateWithOtherAgents(data: any): Promise<ValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let minConfidence = 1.0;

    // Eğer orderId varsa, gerçek sistem durumunu kontrol et
    const orderId = data?.orderId || data?.order_id;
    if (orderId) {
      try {
        // Test ortamında test client kullan
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
        const supabase = isTestEnv 
          ? (await import('@/lib/supabase/test-client')).createTestClient()
          : await createClient();
        
        // Order durumunu kontrol et
        const { data: order } = await supabase
          .from('orders')
          .select('id, order_number, status, delivery_date, priority')
          .eq('id', orderId)
          .single();
        
        if (order) {
          // Production plan durumunu kontrol et
          const { data: plans } = await supabase
            .from('production_plans')
            .select('id, status, planned_quantity, produced_quantity')
            .eq('order_id', orderId);
          
          if (plans && plans.length > 0) {
            const inProgressPlans = plans.filter(p => p.status === 'devam_ediyor');
            const completedPlans = plans.filter(p => p.status === 'tamamlandi');
            
            if (inProgressPlans.length > 0) {
              recommendations.push(`${inProgressPlans.length} üretim planı devam ediyor`);
            }
            
            if (completedPlans.length === plans.length) {
              recommendations.push('Tüm üretim planları tamamlandı');
            }
          }
        }
      } catch (error: any) {
        recommendations.push(`Sistem durumu kontrol edilemedi: ${error.message}`);
      }
    }

    // Tüm agent'lara stratejik değerlendirme sor (gerçek veri ile)
    const allAgents = ['planning', 'warehouse', 'production', 'purchase'];
    const validations: any[] = [];

    for (const agentName of allAgents) {
      try {
        const validation = await this.askAgent(agentName,
          `Bu işlemin stratejik uyumunu ve risk seviyesini değerlendir. Sistem geneli etkisini analiz et.`,
          { operation: data.operation, context: data, orderId }
        );

        validations.push({
          agent: agentName,
          validation
        });

        if (validation.issues && validation.issues.length > 0) {
          issues.push(...validation.issues);
        }

        if (validation.recommendations && validation.recommendations.length > 0) {
          recommendations.push(...validation.recommendations);
        }

        if (validation.confidence < minConfidence) {
          minConfidence = validation.confidence;
        }
      } catch (error) {
        // Agent yanıt veremezse devam et
        continue;
      }
    }

    // Risk seviyesi yüksekse veya çok fazla issue varsa reddet
    const isValid = issues.length === 0 && minConfidence > 0.7;

    return {
      isValid,
      issues,
      recommendations,
      confidence: minConfidence
    };
  }

  /**
   * Büyük işlemler için bütçe kontrolü
   */
  private async checkBudget(amount: number): Promise<{ withinBudget: boolean; remainingBudget: number }> {
    try {
      const supabase = await createClient();
      
      // Aylık bütçe kontrolü (örnek - gerçek bütçe tablosu yoksa varsayılan değer)
      const monthlyBudget = parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '100000');
      
      // Bu ayki harcamaları hesapla (purchase_orders'dan)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: purchases } = await supabase
        .from('purchase_orders')
        .select('total_amount')
        .gte('created_at', startOfMonth.toISOString())
        .eq('status', 'approved');

      const monthlySpent = purchases?.reduce((sum, p) => sum + (parseFloat(p.total_amount?.toString() || '0')), 0) || 0;
      const remainingBudget = monthlyBudget - monthlySpent;

      return {
        withinBudget: amount <= remainingBudget,
        remainingBudget
      };
    } catch (error) {
      // Hata durumunda güvenli tarafta kal
      return {
        withinBudget: false,
        remainingBudget: 0
      };
    }
  }

  /**
   * Stratejik öneri oluştur
   */
  async generateStrategicRecommendation(context: any, requestId?: string): Promise<AgentResponse> {
    const prompt = `
      Sistem geneli stratejik öneriler oluştur:
      
      Context: ${JSON.stringify(context, null, 2)}
      
      Analiz et ve öner:
      1. Kısa vadeli iyileştirmeler (1-3 ay)
      2. Orta vadeli stratejiler (3-6 ay)
      3. Uzun vadeli hedefler (6-12 ay)
      4. Risk yönetimi önerileri
      5. Bütçe optimizasyon önerileri
    `;

    const response = await this.callGPT(
      [{ role: 'user', content: prompt }],
      {
        taskComplexity: 'complex',
        requestId: requestId || `strategic_recommendation_${Date.now()}`,
        requestType: 'analysis'
      }
    );

    return this.parseResponse(response);
  }
}

