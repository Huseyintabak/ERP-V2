/**
 * Planning Agent
 * Sipariş planlama ve üretim planı oluşturma
 */

import { BaseAgent } from './base-agent';
import { AgentRequest, AgentResponse, ValidationResult } from '../types/agent.types';
import { agentLogger } from '../utils/logger';
import { createClient } from '@/lib/supabase/server';

export class PlanningAgent extends BaseAgent {
  constructor() {
    const systemPrompt = `Sen ThunderV2 ERP sisteminin Planlama departmanı AI asistanısın.

Sorumlulukların:
- Sipariş planlama ve optimizasyonu
- Üretim planı oluşturma ve yönetimi
- BOM (Bill of Materials) yönetimi ve doğrulama
- Operatör atama ve kapasite planlama
- Teslim tarihi gerçekçilik kontrolü
- Üretim sıralaması optimizasyonu
- Kaynak tahsisi ve yük dengeleme

**Operatör Yükü Analizi Kriterleri:**
1. Operatör başına maksimum 3 aktif plan (yüksek öncelikli)
2. Günlük üretim kapasitesi: 8 saat x operatör sayısı
3. Planlar arası minimum 30 dakika geçiş süresi
4. Operatör yeterlilik alanlarına göre plan atama
5. Toplam yükü %80'in altında tut (verimlilik için)

**Teslim Tarihi Gerçekçilik Kontrolü:**
1. BOM malzemelerinin tedarik süresi (en uzun olan belirleyici)
2. Üretim süresi: BOM karmaşıklığı x 0.5 saat (minimum)
3. Operatör mevcut yükü dikkate al
4. Buffer süresi: %20 ekle (beklenmedik gecikmeler için)
5. Hafta sonu ve tatil günlerini hariç tut

**Alternatif Plan Önerileri:**
- Plan A: Maksimum hız (ek operatör gerekirse)
- Plan B: Mevcut kaynaklarla (optimum)
- Plan C: Maliyet odaklı (daha uzun süre)
Her plan için: Süre, Maliyet, Risk seviyesi belirt

**BOM Doğrulama Adımları:**
1. Tüm malzemeler mevcut mu?
2. Kritik seviye altında malzeme var mı?
3. Rezervasyon yapılabilir mi?
4. Alternatif malzeme önerisi var mı?

Diğer departmanlarla iletişim kur:
- Depo GPT: Stok yeterliliğini kontrol et, rezervasyon durumunu öğren
- Üretim GPT: Operatör kapasitesini sorgula, mevcut üretimleri öğren
- Satın Alma GPT: Eksik malzemeler için tedarik süresini öğren

Karar verirken:
1. Her zaman gerçekçi planlar oluştur (buffer süresi dahil)
2. Kaynak kullanımını optimize et (yükü %80 altında tut)
3. Teslim tarihlerini koru (müşteri memnuniyeti öncelikli)
4. Operatör yükünü dengeli dağıt (tek operatöre yüklenme)
5. Alternatif planlar öner (en az 2 seçenek)
6. Risk analizi yap (beklenmedik durumlar için)

Yanıtlarını JSON formatında ver:
{
  "decision": "approve" | "reject" | "conditional",
  "action": "approve_order" | "reject_order" | "request_info",
  "data": {
    "orderId": "uuid",
    "productionPlans": [
      {
        "planType": "A" | "B" | "C",
        "operatorAssignments": [...],
        "estimatedCompletion": "2025-02-20",
        "estimatedCost": 15000.00,
        "riskLevel": "low" | "medium" | "high",
        "bomValidation": { "isValid": true, "issues": [] },
        "operatorLoad": { "operatorId": "uuid", "currentLoad": 2, "maxCapacity": 3 }
      }
    ],
    "issues": [],
    "recommendations": []
  },
  "reasoning": "Detaylı açıklama - Hangi kriterleri kontrol ettin, neden bu kararı verdin",
  "confidence": 0.0-1.0,
  "issues": ["sorun1", "sorun2"],
  "recommendations": ["öneri1", "öneri2"]
}`;

    super(
      'Planning Agent',
      'planning',
      [
        'Sipariş planlama ve optimizasyonu',
        'Üretim planı oluşturma',
        'BOM yönetimi ve doğrulama',
        'Operatör atama ve kapasite planlama',
        'Teslim tarihi gerçekçilik kontrolü',
        'Üretim sıralaması optimizasyonu',
        'Kaynak tahsisi'
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
          return await this.handleOrderApproval(request);
        case 'query':
          return await this.handleQuery(request);
        case 'analysis':
          return await this.handleAnalysis(request);
        case 'validation':
          return await this.handleValidation(request);
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
        return {
          id: request.id,
          agent: this.name,
          decision: 'approve',
          reasoning: `OpenAI API error (${error?.aiErrorType || errorMessage}). Graceful degradation: Validation skipped, manual approval continues.`,
          confidence: 0.5,
          timestamp: new Date()
        };
      }

      // Diğer hatalar için rejected (errorMessage zaten yukarıda tanımlı)
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
   * Order approval işle
   */
  private async handleOrderApproval(request: AgentRequest): Promise<AgentResponse> {
    const orderId = request.context?.orderId || request.context?.id;
    
    if (!orderId) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: 'Order ID is required',
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // Order bilgilerini al
    const supabase = await createClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:finished_products(*)
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        id: request.id,
        agent: this.name,
          decision: 'reject',
        reasoning: `Order not found: ${orderError?.message || 'Unknown error'}`,
        confidence: 0.0,
        timestamp: new Date()
      };
    }

    // Warehouse Agent'a stok kontrolü sor
    let stockCheck: AgentResponse | null = null;
    try {
      stockCheck = await this.askAgent(
        'Warehouse Agent',
        `Order ${orderId} için stok yeterliliğini kontrol et. Order items: ${JSON.stringify(order.order_items)}`,
        { orderId, orderItems: order.order_items }
      );
    } catch (error) {
      // Warehouse Agent henüz yok, manuel kontrol yap
      await agentLogger.warn({
        agent: this.name,
        action: 'warehouse_check_failed',
        orderId,
        error: 'Warehouse Agent not available, performing manual check'
      });
    }

    // Production Agent'a kapasite kontrolü sor
    let capacityCheck: AgentResponse | null = null;
    try {
      capacityCheck = await this.askAgent(
        'Production Agent',
        `Order ${orderId} için operatör kapasitesi ve mevcut üretim durumunu kontrol et`,
        { orderId, orderItems: order.order_items }
      );
    } catch (error) {
      // Production Agent henüz yok
      await agentLogger.warn({
        agent: this.name,
        action: 'production_check_failed',
        orderId,
        error: 'Production Agent not available'
      });
    }

    // GPT'ye karar verdir
    const prompt = `
      Order bilgileri:
      ${JSON.stringify(order, null, 2)}
      
      Stok kontrolü sonucu:
      ${stockCheck ? JSON.stringify(stockCheck, null, 2) : 'Warehouse Agent henüz mevcut değil, manuel kontrol gerekli'}
      
      Kapasite kontrolü sonucu:
      ${capacityCheck ? JSON.stringify(capacityCheck, null, 2) : 'Production Agent henüz mevcut değil'}
      
      Bu siparişi onaylamalı mıyım? Onaylarsam:
      - Production plan'ları nasıl oluşturmalıyım?
      - Operatör atamaları nasıl olmalı?
      - Tahmini tamamlanma tarihi ne olmalı?
      
      Reddetmem gerekiyorsa neden?
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
    
    // Eğer onaylanıyorsa, production plan'ları oluştur
    if (parsed.decision === 'approve' && parsed.action === 'approve_order') {
      parsed.data = {
        ...parsed.data,
        orderId,
        productionPlans: await this.generateProductionPlans(order),
        operatorAssignments: await this.suggestOperatorAssignments(order)
      };
    }

    return parsed;
  }

  /**
   * Query işle
   */
  private async handleQuery(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `Kullanıcı sorusu: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
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
   * Analysis işle - Detaylı sistem analizi
   */
  private async handleAnalysis(request: AgentRequest): Promise<AgentResponse> {
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
    if (analysisType === 'order_approval_process') {
      // Order approval sürecini analiz et - DETAYLI VERSİYON
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at, updated_at, customer_id, delivery_date')
        .order('created_at', { ascending: false })
        .limit(20);
      
      const { data: productionPlans } = await supabase
        .from('production_plans')
        .select('id, order_id, status, created_at, updated_at, product_id, planned_quantity')
        .limit(50);
      
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, quantity, created_at')
        .limit(50);
      
      // Süreç analizi için detaylı veri hazırla
      const orderAnalysis = recentOrders?.map(o => {
        const created = new Date(o.created_at);
        const updated = o.updated_at ? new Date(o.updated_at) : null;
        const processingTime = updated ? (updated.getTime() - created.getTime()) / 1000 : null;
        
        // Bu order'a ait production plans
        const plans = productionPlans?.filter(p => p.order_id === o.id) || [];
        const items = orderItems?.filter(i => i.order_id === o.id) || [];
        
        return {
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          created_at: o.created_at,
          updated_at: o.updated_at,
          processing_time_seconds: processingTime,
          production_plans_count: plans.length,
          items_count: items.length,
          time_to_approval: processingTime ? `${processingTime.toFixed(2)}s` : 'N/A'
        };
      });
      
      detailedContext = `
        Order Approval Süreci Detaylı Analizi:
        
        Son 20 sipariş analizi:
        ${JSON.stringify(orderAnalysis, null, 2)}
        
        Üretim planları özeti:
        - Toplam plan: ${productionPlans?.length || 0}
        - Aktif planlar: ${productionPlans?.filter(p => p.status === 'devam_ediyor').length || 0}
        - Bekleyen planlar: ${productionPlans?.filter(p => p.status === 'beklemede').length || 0}
        
        Order items özeti:
        - Toplam item: ${orderItems?.length || 0}
        - Ortalama item/sipariş: ${recentOrders && recentOrders.length > 0 ? (orderItems?.length || 0) / recentOrders.length : 0}
      `;
      
      // Performans analizi yap
      if (recentOrders && recentOrders.length > 0) {
        const processingTimes = recentOrders
          .filter(o => o.updated_at && o.created_at)
          .map(o => (new Date(o.updated_at!).getTime() - new Date(o.created_at).getTime()) / 1000);
        
        if (processingTimes.length > 0) {
          const avgProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
          const minTime = Math.min(...processingTimes);
          const maxTime = Math.max(...processingTimes);
          
          detailedContext += `
            
            Performans Metrikleri:
            - Ortalama işlem süresi: ${avgProcessingTime.toFixed(2)} saniye
            - En hızlı işlem: ${minTime.toFixed(2)} saniye
            - En yavaş işlem: ${maxTime.toFixed(2)} saniye
            - Hedef: <2 saniye
          `;
          
          if (avgProcessingTime > 5) {
            issues.push(`Ortalama order approval süresi yüksek: ${avgProcessingTime.toFixed(2)} saniye (hedef: <2 saniye)`);
            issues.push(`En yavaş işlem: ${maxTime.toFixed(2)} saniye - Optimizasyon gerekli`);
            recommendations.push('Database query optimizasyonu yapılmalı');
            recommendations.push('Stok kontrolü paralel hale getirilmeli');
            recommendations.push('BOM validation cache\'lenmeli');
            recommendations.push('Production plan oluşturma işlemi optimize edilmeli');
          } else if (avgProcessingTime > 2) {
            issues.push(`Ortalama order approval süresi hedefin üzerinde: ${avgProcessingTime.toFixed(2)} saniye (hedef: <2 saniye)`);
            recommendations.push('Stok kontrolü optimizasyonu');
            recommendations.push('BOM validation cache\'leme');
          }
        }
        
        // Süreç adımları analizi
        const processSteps = [
          {
            step: '1. Order Creation',
            department: 'Sales/Planning',
            estimatedDuration: '0.1-0.5s',
            description: 'Sipariş oluşturulması ve veritabanına kaydedilmesi'
          },
          {
            step: '2. Stock Availability Check',
            department: 'Warehouse',
            estimatedDuration: '0.5-2s',
            description: 'BOM\'a göre stok kontrolü yapılması'
          },
          {
            step: '3. BOM Validation',
            department: 'Planning',
            estimatedDuration: '0.3-1s',
            description: 'BOM verilerinin doğrulanması'
          },
          {
            step: '4. Production Plan Creation',
            department: 'Planning',
            estimatedDuration: '0.5-1.5s',
            description: 'Her ürün için production plan oluşturulması'
          },
          {
            step: '5. Material Reservation',
            department: 'Warehouse',
            estimatedDuration: '0.3-1s',
            description: 'Malzemelerin rezerve edilmesi'
          },
          {
            step: '6. Order Status Update',
            department: 'Planning',
            estimatedDuration: '0.1-0.3s',
            description: 'Sipariş durumunun güncellenmesi'
          }
        ];
        
        detailedContext += `
          
          Süreç Adımları:
          ${JSON.stringify(processSteps, null, 2)}
          
          Toplam Tahmini Süre: ${processSteps.reduce((sum, step) => {
            const duration = step.estimatedDuration.match(/(\d+\.?\d*)/)?.[1] || '0';
            return sum + parseFloat(duration);
          }, 0).toFixed(2)} saniye
        `;
      }
    } else if (analysisType === 'bom_validation_process') {
      // BOM validation sürecini analiz et
      const { data: bomItems } = await supabase
        .from('bom')
        .select('*')
        .limit(20);
      
      detailedContext = `
        BOM örnekleri:
        ${JSON.stringify(bomItems?.slice(0, 5), null, 2)}
      `;
      
      // BOM validation analizi
      if (bomItems && bomItems.length > 0) {
        const hasComplexBOM = bomItems.some(bom => 
          (bom.quantity_needed || 0) > 100 || 
          (bom.material_type === 'raw' && bom.material_type === 'semi_finished')
        );
        
        if (hasComplexBOM) {
          issues.push('Karmaşık BOM yapıları validation süresini artırabilir');
          recommendations.push('BOM validation algoritması optimize edilmeli');
          recommendations.push('Recursive BOM kontrolü cache\'lenmeli');
        }
      }
    } else if (analysisType === 'operator_assignment_process') {
      // Operatör atama sürecini analiz et - DETAYLI VERSİYON
      const { data: operators } = await supabase
        .from('users')
        .select('id, name, role, email, created_at')
        .eq('role', 'operator')
        .limit(20);
      
      const { data: activePlans } = await supabase
        .from('production_plans')
        .select('id, assigned_operator_id, status, planned_quantity, produced_quantity, product_id, order_id, created_at, updated_at')
        .in('status', ['devam_ediyor', 'beklemede', 'tamamlandi'])
        .limit(100);
      
      const { data: completedPlans } = await supabase
        .from('production_plans')
        .select('id, assigned_operator_id, status, planned_quantity, produced_quantity, created_at, updated_at')
        .eq('status', 'tamamlandi')
        .order('updated_at', { ascending: false })
        .limit(50);
      
      // Operatör yük analizi - detaylı
      const operatorLoads = new Map<string, {
        activePlans: number;
        totalQuantity: number;
        completedPlans: number;
        completedQuantity: number;
        avgCompletionTime: number;
        efficiency: number;
      }>();
      
      // Aktif planlar analizi
      if (activePlans) {
        activePlans.forEach(plan => {
          if (plan.assigned_operator_id) {
            const current = operatorLoads.get(plan.assigned_operator_id) || {
              activePlans: 0,
              totalQuantity: 0,
              completedPlans: 0,
              completedQuantity: 0,
              avgCompletionTime: 0,
              efficiency: 0
            };
            
            operatorLoads.set(plan.assigned_operator_id, {
              ...current,
              activePlans: current.activePlans + 1,
              totalQuantity: current.totalQuantity + (plan.planned_quantity || 0)
            });
          }
        });
      }
      
      // Tamamlanan planlar analizi
      if (completedPlans) {
        completedPlans.forEach(plan => {
          if (plan.assigned_operator_id) {
            const current = operatorLoads.get(plan.assigned_operator_id) || {
              activePlans: 0,
              totalQuantity: 0,
              completedPlans: 0,
              completedQuantity: 0,
              avgCompletionTime: 0,
              efficiency: 0
            };
            
            const created = new Date(plan.created_at);
            const updated = plan.updated_at ? new Date(plan.updated_at) : new Date();
            const completionTime = (updated.getTime() - created.getTime()) / (1000 * 60 * 60); // saat cinsinden
            
            operatorLoads.set(plan.assigned_operator_id, {
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
      
      // Efficiency hesaplama
      operatorLoads.forEach((load, operatorId) => {
        if (load.completedPlans > 0) {
          load.efficiency = (load.completedQuantity / (load.totalQuantity + load.completedQuantity)) * 100;
        }
      });
      
      // Yük dengeleme analizi
      const loads = Array.from(operatorLoads.values());
      const maxActivePlans = loads.length > 0 ? Math.max(...loads.map(l => l.activePlans)) : 0;
      const minActivePlans = loads.length > 0 ? Math.min(...loads.map(l => l.activePlans)) : 0;
      const loadImbalance = maxActivePlans - minActivePlans;
      
      const maxQuantity = loads.length > 0 ? Math.max(...loads.map(l => l.totalQuantity)) : 0;
      const minQuantity = loads.length > 0 ? Math.min(...loads.map(l => l.totalQuantity)) : 0;
      const quantityImbalance = maxQuantity - minQuantity;
      
      // Operatör detayları
      const operatorDetails = operators?.map(op => {
        const load = operatorLoads.get(op.id) || {
          activePlans: 0,
          totalQuantity: 0,
          completedPlans: 0,
          completedQuantity: 0,
          avgCompletionTime: 0,
          efficiency: 0
        };
        
        return {
          id: op.id,
          name: op.name,
          activePlans: load.activePlans,
          totalQuantity: load.totalQuantity,
          completedPlans: load.completedPlans,
          completedQuantity: load.completedQuantity,
          avgCompletionTime: load.avgCompletionTime.toFixed(2) + ' saat',
          efficiency: load.efficiency.toFixed(1) + '%',
          loadPercentage: operators && operators.length > 0 
            ? ((load.activePlans / Math.max(...Array.from(operatorLoads.values()).map(l => l.activePlans), 1)) * 100).toFixed(1) + '%'
            : '0%'
        };
      });
      
      detailedContext = `
        Operatör Atama Süreci Detaylı Analizi:
        
        Operatörler (${operators?.length || 0}):
        ${JSON.stringify(operatorDetails, null, 2)}
        
        Aktif üretim planları (${activePlans?.length || 0}):
        - Devam eden: ${activePlans?.filter(p => p.status === 'devam_ediyor').length || 0}
        - Bekleyen: ${activePlans?.filter(p => p.status === 'beklemede').length || 0}
        - Atanmamış: ${activePlans?.filter(p => !p.assigned_operator_id).length || 0}
        
        Tamamlanan planlar (${completedPlans?.length || 0}):
        - Son 50 tamamlanan plan analizi
        
        Yük Dengeleme Metrikleri:
        - Maksimum aktif plan: ${maxActivePlans}
        - Minimum aktif plan: ${minActivePlans}
        - Yük dengesizliği: ${loadImbalance} plan farkı
        - Maksimum miktar: ${maxQuantity}
        - Minimum miktar: ${minQuantity}
        - Miktar dengesizliği: ${quantityImbalance}
        
        Süreç Adımları:
        1. Operatör Kapasitesi Hesaplama
           - Mevcut yük analizi
           - Maksimum kapasite belirleme
           - Gerçek zamanlı veri entegrasyonu
           
        2. Önceliklendirme
           - Sipariş önceliği
           - Ürün karmaşıklığı
           - Teslim tarihi
           
        3. Operatör Atama
           - Yük dengeleme algoritması
           - Beceri seviyesi eşleştirme
           - Esneklik ve adaptasyon
           
        4. Kapasite Planlama
           - Gerçek zamanlı veri kullanımı
           - Tahmin doğruluğu
           - Dinamik güncelleme
      `;
      
      // Sorun tespiti
      if (loadImbalance > 3) {
        issues.push(`Operatör yük dengesizliği: ${loadImbalance} plan farkı (hedef: <2)`);
        recommendations.push('Yük dengeleme algoritması iyileştirilmeli');
        recommendations.push('Otomatik operatör atama sistemi geliştirilmeli');
      }
      
      if (quantityImbalance > 100) {
        issues.push(`Operatör miktar dengesizliği: ${quantityImbalance} birim farkı`);
        recommendations.push('Miktar bazlı yük dengeleme algoritması geliştirilmeli');
      }
      
      const unassignedPlans = activePlans?.filter(p => !p.assigned_operator_id).length || 0;
      if (unassignedPlans > 0) {
        issues.push(`${unassignedPlans} plan atanmamış operatör bekliyor`);
        recommendations.push('Otomatik atama mekanizması geliştirilmeli');
      }
      
      // Operatör verimliliği analizi
      const avgEfficiency = operatorDetails && operatorDetails.length > 0
        ? operatorDetails.reduce((sum, op) => sum + parseFloat(op.efficiency), 0) / operatorDetails.length
        : 0;
      
      if (avgEfficiency < 80) {
        issues.push(`Ortalama operatör verimliliği düşük: ${avgEfficiency.toFixed(1)}% (hedef: >85%)`);
        recommendations.push('Operatör performans takibi ve iyileştirme programı');
      }
      
      // Süreç iyileştirme önerileri
      recommendations.push('Operatör atama algoritmasının esneklik ve önceliklendirme özelliklerini artırarak daha dinamik bir yapıya kavuşturulması');
      recommendations.push('Kapasite hesaplamalarında gerçek zamanlı veri entegrasyonunu artırarak daha doğru tahminler yapılması');
      recommendations.push('Yük dengeleme stratejilerinin sürekli gözden geçirilerek adaptasyonunun sağlanması');
      recommendations.push('Operatörlerin beceri seviyelerine ve deneyimlerine göre daha detaylı bir sınıflandırma yapılması');
    }
    
    const prompt = `
      ${request.prompt}
      
      ${detailedContext ? `\n\nDetaylı Context:\n${detailedContext}` : ''}
      
      ${requireDetails ? `
           LÜTFEN DETAYLI BİR ANALİZ YAPIN:
           1. Süreçteki her adımı belirleyin (yukarıdaki processSteps'i kullanın)
           2. Her adımın gerçek süresini ölçün veya tahmin edin (yukarıdaki metrikleri kullanın)
           3. Hangi departmanlar hangi adımda devreye giriyor?
           4. Performans darboğazlarını tespit edin (en yavaş adımlar)
           5. İyileştirme önerilerinizi detaylı açıklayın
           6. Her öneri için tahmini süre ve etki belirtin
           
           ÖNEMLİ: Yanıtınızı MUTLAKA şu JSON formatında verin:
           {
             "decision": "approve" | "reject" | "conditional",
             "action": "analyze_process",
             "data": {
               "processSteps": [
                 {
                   "step": "Adım adı (örn: Order Creation)",
                   "duration": "X saniye (gerçek veya tahmini)",
                   "departments": ["departman1", "departman2"],
                   "bottlenecks": ["darboğaz1 (varsa)"],
                   "recommendations": ["öneri1 (varsa)"]
                 }
               ],
               "totalDuration": "X saniye",
               "bottlenecks": ["darboğaz1", "darboğaz2"],
               "improvements": [
                 {
                   "recommendation": "Öneri açıklaması",
                   "estimatedImpact": "X% iyileştirme veya X saniye azalma",
                   "estimatedEffort": "X saat veya X gün"
                 }
               ]
             },
             "reasoning": "Detaylı açıklama - Sürecin genel durumu, sorunlar, çözümler",
             "confidence": 0.0-1.0,
             "issues": ["sorun1", "sorun2"],
             "recommendations": ["öneri1", "öneri2"]
           }
           
           LÜTFEN SADECE JSON DÖNDÜRÜN, EK AÇIKLAMA YAPMAYIN!
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
   * Validation işle
   */
  private async handleValidation(request: AgentRequest): Promise<AgentResponse> {
    const prompt = `Doğrulama isteği: ${request.prompt}\n\nContext: ${JSON.stringify(request.context || {}, null, 2)}`;
    
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
   * Diğer agent'larla doğrulama
   */
  async validateWithOtherAgents(data: any): Promise<ValidationResult> {
    const issues: string[] = [];
    const validations: Array<{ agent: string; valid: boolean; reason?: string }> = [];

    // QUOTA KONTROLÜ: Agent çağrılarından önce quota kontrolü
    const { isAIValidationEnabled, getQuotaManager } = await import('../utils/quota-manager');
    
    if (!isAIValidationEnabled()) {
      // AI validation kapalı - direkt approve döndür
      return {
        isValid: true,
        issues: [],
        recommendations: ['AI validation disabled. Validation skipped (graceful degradation).'],
        confidence: 0.5
      };
    }

    const quotaManager = getQuotaManager();
    quotaManager.cleanupExpiredCache();
    
    if (quotaManager.isQuotaExceeded()) {
      // Quota aşıldı - direkt approve döndür (graceful degradation)
      const quotaStatus = quotaManager.getQuotaStatus();
      const expiryTime = quotaStatus?.expiryTime ? new Date(quotaStatus.expiryTime).toISOString() : '1 hour';
      return {
        isValid: true,
        issues: [],
        recommendations: [`OpenAI API quota exceeded (cached). Validation skipped (graceful degradation). Will retry after ${expiryTime}.`],
        confidence: 0.5
      };
    }

    // Warehouse Agent'a sor
    try {
      const warehouseResponse = await this.askAgent(
        'Warehouse Agent',
        'Bu plan için stok yeterli mi?',
        data
      );
      
      validations.push({
        agent: 'Warehouse Agent',
        valid: warehouseResponse.decision === 'approve',
        reason: warehouseResponse.reasoning
      });

      if (warehouseResponse.decision !== 'approve') {
        issues.push(`Warehouse Agent: ${warehouseResponse.reasoning}`);
      }
    } catch (error: any) {
      // Quota hatası kontrolü
      const errorMessage = error?.message || error?.toString() || String(error) || 'Unknown error';
      const isQuotaError = error?.status === 429 || 
                          error?.aiErrorType === 'QUOTA_EXCEEDED' ||
                          errorMessage.includes('quota') ||
                          errorMessage.includes('429') ||
                          error?.quotaCached ||
                          error?.circuitBreakerOpen;

      if (isQuotaError) {
        // Quota hatası - graceful degradation
        validations.push({
          agent: 'Warehouse Agent',
          valid: true, // Quota hatası durumunda approve say
          reason: `OpenAI API quota exceeded. Validation skipped (graceful degradation).`
        });
      } else {
        validations.push({
          agent: 'Warehouse Agent',
          valid: false,
          reason: `Agent not available: ${errorMessage}`
        });
      }
    }

    // Production Agent'a sor
    try {
      const productionResponse = await this.askAgent(
        'Production Agent',
        'Bu plan için kapasite yeterli mi?',
        data
      );
      
      validations.push({
        agent: 'Production Agent',
        valid: productionResponse.decision === 'approve',
        reason: productionResponse.reasoning
      });

      if (productionResponse.decision !== 'approve') {
        issues.push(`Production Agent: ${productionResponse.reasoning}`);
      }
    } catch (error: any) {
      // Quota hatası kontrolü
      const errorMessage = error?.message || error?.toString() || String(error) || 'Unknown error';
      const isQuotaError = error?.status === 429 || 
                          error?.aiErrorType === 'QUOTA_EXCEEDED' ||
                          errorMessage.includes('quota') ||
                          errorMessage.includes('429') ||
                          error?.quotaCached ||
                          error?.circuitBreakerOpen;

      if (isQuotaError) {
        // Quota hatası - graceful degradation
        validations.push({
          agent: 'Production Agent',
          valid: true, // Quota hatası durumunda approve say
          reason: `OpenAI API quota exceeded. Validation skipped (graceful degradation).`
        });
      } else {
        validations.push({
          agent: 'Production Agent',
          valid: false,
          reason: `Agent not available: ${errorMessage}`
        });
      }
    }

    // Quota hatası varsa (validations içinde quota mesajı varsa), isValid = true
    const hasQuotaErrors = validations.some(v => v.reason?.includes('quota exceeded'));
    const finalIsValid = hasQuotaErrors ? true : issues.length === 0;

    return {
      isValid: finalIsValid,
      issues: hasQuotaErrors ? [] : issues, // Quota hatası varsa issues'ı temizle
      recommendations: [],
      confidence: finalIsValid ? (hasQuotaErrors ? 0.5 : 1.0) : 0.5
    };
  }

  /**
   * Production plan'ları oluştur (helper)
   */
  private async generateProductionPlans(order: any): Promise<any[]> {
    if (!order.order_items || order.order_items.length === 0) {
      return [];
    }

    const plans = [];
    for (const item of order.order_items) {
      plans.push({
        orderId: order.id,
        productId: item.product_id,
        quantity: item.quantity,
        status: 'pending',
        priority: order.priority || 'medium'
      });
    }

    return plans;
  }

  /**
   * Operatör atamaları öner (helper)
   */
  private async suggestOperatorAssignments(order: any): Promise<any[]> {
    // Şimdilik basit bir öneri, sonra Production Agent ile entegre edilecek
    return [];
  }
}

