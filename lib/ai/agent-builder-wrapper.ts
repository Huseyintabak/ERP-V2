/**
 * OpenAI Agent Builder Wrapper
 * Mevcut AI Agent sistemini OpenAI Agent Builder ile entegre eder
 * Bu sayede Agent'ları OpenAI Dashboard'da izleyebiliriz
 */

import { Agent, AgentInputItem, Runner, withTrace } from "@openai/agents";
import { agentLogger } from './utils/logger';
import { costTracker } from './utils/cost-tracker';
import { AgentRequest, AgentResponse } from './types/agent.types';

/**
 * Thunder ERP Agent Configuration
 */
export interface ThunderAgentConfig {
  name: string;
  role: string;
  instructions: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  workflowId?: string;
}

/**
 * Agent Builder Wrapper
 * Mevcut agent sistemimizi OpenAI Agent Builder ile sarıp izlenebilir hale getirir
 */
export class AgentBuilderWrapper {
  private agent: Agent;
  private workflowId: string;
  private agentName: string;
  private agentRole: string;

  constructor(config: ThunderAgentConfig) {
    this.agentName = config.name;
    this.agentRole = config.role;
    this.workflowId = config.workflowId || `thunder_${config.role}_${Date.now()}`;

    // OpenAI Agent Builder Agent oluştur
    this.agent = new Agent({
      name: config.name,
      instructions: config.instructions,
      model: config.model || "gpt-4o",
      modelSettings: {
        temperature: config.temperature || 0.7,
        topP: 1,
        maxTokens: config.maxTokens || 2048,
        store: true // Agent conversation'larını sakla
      }
    });

    agentLogger.log(`🤖 Agent Builder Wrapper created: ${config.name} (${config.role})`);
  }

  /**
   * Agent'ı çalıştır - OpenAI Dashboard'da trace ile
   */
  async run(request: AgentRequest): Promise<AgentResponse> {
    const startTime = Date.now();
    const requestId = request.requestId || `req_${Date.now()}`;

    agentLogger.log(`🚀 [${this.agentName}] Starting traced execution: ${requestId}`);

    try {
      // OpenAI withTrace ile tüm agent activity'sini izle
      const result = await withTrace("ThunderERP", async () => {
        const conversationHistory: AgentInputItem[] = [
          { 
            role: "user", 
            content: [{ 
              type: "input_text", 
              text: this.formatRequest(request)
            }] 
          }
        ];

        // Runner ile agent'ı çalıştır
        const runner = new Runner({
          traceMetadata: {
            __trace_source__: "thunder-erp",
            workflow_id: this.workflowId,
            agent_role: this.agentRole,
            request_id: requestId,
            request_type: request.type,
            timestamp: new Date().toISOString()
          }
        });

        const agentResult = await runner.run(
          this.agent,
          conversationHistory
        );

        // Yeni mesajları conversation history'e ekle
        conversationHistory.push(...agentResult.newItems.map((item) => item.rawItem));

        if (!agentResult.finalOutput) {
          throw new Error("Agent result is undefined");
        }

        return {
          output: agentResult.finalOutput,
          conversationHistory
        };
      });

      // Response oluştur
      const duration = Date.now() - startTime;
      const response: AgentResponse = {
        agentName: this.agentName,
        decision: this.parseDecision(result.output),
        reasoning: result.output,
        confidence: 0.9, // Agent Builder'dan confidence alamadığımız için default
        suggestions: [],
        timestamp: new Date().toISOString(),
        requestId
      };

      // Cost tracking (approximation)
      const estimatedTokens = this.estimateTokens(request, result.output);
      const totalCost = this.calculateCost(estimatedTokens);
      await costTracker.trackUsage({
        agent: this.agentName,
        model: this.agent.model || 'gpt-4o',
        tokens: estimatedTokens.input + estimatedTokens.output,
        cost: totalCost,
        requestId,
        timestamp: new Date()
      });

      agentLogger.log(`✅ [${this.agentName}] Traced execution completed: ${requestId} (${duration}ms)`);
      agentLogger.log(`📊 OpenAI Dashboard: https://platform.openai.com/traces/${this.workflowId}`);

      return response;

    } catch (error: any) {
      const duration = Date.now() - startTime;
      agentLogger.error(`❌ [${this.agentName}] Traced execution failed: ${requestId}`, error);

      throw {
        message: error.message || 'Agent execution failed',
        agentName: this.agentName,
        requestId,
        duration,
        aiErrorType: 'AGENT_BUILDER_ERROR',
        gracefulDegradation: true
      };
    }
  }

  /**
   * Request'i agent için formatlı text'e çevir
   */
  private formatRequest(request: AgentRequest): string {
    const parts: string[] = [
      `Request Type: ${request.type}`,
      `Request ID: ${request.requestId || 'N/A'}`,
      `\nData:`
    ];

    if (typeof request.data === 'string') {
      parts.push(request.data);
    } else {
      parts.push(JSON.stringify(request.data, null, 2));
    }

    if (request.context) {
      parts.push('\nContext:');
      parts.push(JSON.stringify(request.context, null, 2));
    }

    return parts.join('\n');
  }

  /**
   * Agent output'undan decision parse et
   */
  private parseDecision(output: string): 'approved' | 'rejected' | 'needs_review' {
    const lowerOutput = output.toLowerCase();
    
    if (lowerOutput.includes('approved') || lowerOutput.includes('onaylandı')) {
      return 'approved';
    } else if (lowerOutput.includes('rejected') || lowerOutput.includes('reddedildi')) {
      return 'rejected';
    } else {
      return 'needs_review';
    }
  }

  /**
   * Token sayısını tahmin et (approximation)
   */
  private estimateTokens(request: AgentRequest, output: string): { input: number; output: number } {
    const requestText = this.formatRequest(request);
    
    // Rough estimation: ~4 characters = 1 token
    const inputTokens = Math.ceil((requestText.length + this.agent.instructions.length) / 4);
    const outputTokens = Math.ceil(output.length / 4);

    return { input: inputTokens, output: outputTokens };
  }

  /**
   * Maliyeti hesapla (GPT-4o pricing)
   */
  private calculateCost(tokens: { input: number; output: number }): number {
    // GPT-4o pricing (as of Dec 2024)
    const inputCostPerToken = 0.0025 / 1000;  // $0.0025 per 1K tokens
    const outputCostPerToken = 0.01 / 1000;   // $0.01 per 1K tokens

    return (tokens.input * inputCostPerToken) + (tokens.output * outputCostPerToken);
  }

  /**
   * Workflow ID'yi al (OpenAI Dashboard'da trace için)
   */
  getWorkflowId(): string {
    return this.workflowId;
  }

  /**
   * Agent bilgilerini al
   */
  getInfo() {
    return {
      name: this.agentName,
      role: this.agentRole,
      model: this.agent.model,
      workflowId: this.workflowId
    };
  }
}

/**
 * Thunder ERP Agent Factory - OpenAI Agent Builder ile
 */
export class ThunderAgentFactory {
  /**
   * Yeni agent oluştur
   */
  static createAgent(config: ThunderAgentConfig): AgentBuilderWrapper {
    return new AgentBuilderWrapper(config);
  }

  /**
   * Planning Agent oluştur
   */
  static createPlanningAgent(): AgentBuilderWrapper {
    return this.createAgent({
      name: "Planning Agent",
      role: "planning",
      instructions: `Sen Thunder ERP sisteminin Planlama Agent'ısın.

Sorumluluklar:
- Üretim planlarını analiz et ve doğrula
- Malzeme gereksinimlerini kontrol et
- Üretim kapasitesini değerlendir
- Planlama hatalarını tespit et
- İyileştirme önerileri sun

Karar Kriterleri:
- Malzeme stoku yeterli mi?
- Üretim kapasitesi müsait mi?
- Üretim süresi gerçekçi mi?
- Risk faktörleri var mı?

Cevap Formatı:
- Decision: approved/rejected/needs_review
- Reasoning: Detaylı açıklama
- Suggestions: İyileştirme önerileri (varsa)`,
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 2048,
      workflowId: "planning_agent_workflow"
    });
  }

  /**
   * Production Agent oluştur
   */
  static createProductionAgent(): AgentBuilderWrapper {
    return this.createAgent({
      name: "Production Agent",
      role: "production",
      instructions: `Sen Thunder ERP sisteminin Üretim Agent'ısın.

Sorumluluklar:
- Üretim loglarını doğrula
- Operatör kayıtlarını kontrol et
- Kalite standartlarını değerlendir
- Üretim anomalilerini tespit et
- Verimlilik önerileri sun

Karar Kriterleri:
- Üretim miktarı gerçekçi mi?
- Operatör bilgileri doğru mu?
- Kalite standartlarına uygun mu?
- Süre tutarlı mı?

Cevap Formatı:
- Decision: approved/rejected/needs_review
- Reasoning: Detaylı açıklama
- Suggestions: İyileştirme önerileri (varsa)`,
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 2048,
      workflowId: "production_agent_workflow"
    });
  }

  /**
   * Warehouse Agent oluştur
   */
  static createWarehouseAgent(): AgentBuilderWrapper {
    return this.createAgent({
      name: "Warehouse Agent",
      role: "warehouse",
      instructions: `Sen Thunder ERP sisteminin Depo Agent'ısın.

Sorumluluklar:
- Stok hareketlerini doğrula
- Depo kapasitesini kontrol et
- Stok seviyelerini değerlendir
- Kritik stok durumlarını tespit et
- Depo optimizasyon önerileri sun

Karar Kriterleri:
- Stok miktarları doğru mu?
- Depo kapasitesi yeterli mi?
- Stok rotasyonu uygun mu?
- Minimum stok seviyesi korunuyor mu?

Cevap Formatı:
- Decision: approved/rejected/needs_review
- Reasoning: Detaylı açıklama
- Suggestions: İyileştirme önerileri (varsa)`,
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 2048,
      workflowId: "warehouse_agent_workflow"
    });
  }

  /**
   * Purchase Agent oluştur
   */
  static createPurchaseAgent(): AgentBuilderWrapper {
    return this.createAgent({
      name: "Purchase Agent",
      role: "purchase",
      instructions: `Sen Thunder ERP sisteminin Satın Alma Agent'ısın.

Sorumluluklar:
- Satın alma taleplerini değerlendir
- Fiyat analizleri yap
- Tedarikçi performansını kontrol et
- Kritik malzeme ihtiyaçlarını tespit et
- Maliyet optimizasyon önerileri sun

Karar Kriterleri:
- Fiyatlandırma uygun mu?
- Tedarikçi güvenilir mi?
- Teslimat süresi kabul edilebilir mi?
- Bütçe limitlerine uygun mu?

Cevap Formatı:
- Decision: approved/rejected/needs_review
- Reasoning: Detaylı açıklama
- Suggestions: İyileştirme önerileri (varsa)`,
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 2048,
      workflowId: "purchase_agent_workflow"
    });
  }

  /**
   * Manager Agent oluştur
   */
  static createManagerAgent(): AgentBuilderWrapper {
    return this.createAgent({
      name: "Manager Agent",
      role: "manager",
      instructions: `Sen Thunder ERP sisteminin Yönetici Agent'ısın.

Sorumluluklar:
- Tüm agent kararlarını koordine et
- Çelişkileri çöz
- Final kararları ver
- Sistem geneli performansı değerlendir
- Stratejik öneriler sun

Karar Kriterleri:
- Agent konsensüsü var mı?
- Risk seviyeleri kabul edilebilir mi?
- İş hedeflerine uygun mu?
- Compliance gereksinimleri karşılanıyor mu?

Cevap Formatı:
- Decision: approved/rejected/needs_review
- Reasoning: Detaylı açıklama
- Suggestions: İyileştirme önerileri (varsa)`,
      model: "gpt-4o",
      temperature: 0.5,
      maxTokens: 2048,
      workflowId: "manager_agent_workflow"
    });
  }

  /**
   * Developer Agent oluştur
   */
  static createDeveloperAgent(): AgentBuilderWrapper {
    return this.createAgent({
      name: "Developer Agent",
      role: "developer",
      instructions: `Sen Thunder ERP sisteminin Geliştirici Agent'ısın.

Sorumluluklar:
- Sistem performansını analiz et
- Hata pattern'lerini tespit et
- Kod kalitesini değerlendir
- Optimizasyon fırsatlarını bul
- Teknik iyileştirme önerileri sun

Analiz Alanları:
- API response times
- Database query performance
- Error rates ve pattern'ler
- Resource utilization
- Scalability issues

Cevap Formatı:
- Analysis: Detaylı teknik analiz
- Issues: Tespit edilen sorunlar
- Recommendations: Önceliklendirilmiş öneriler
- Impact: Beklenen etki analizi`,
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 4096,
      workflowId: "developer_agent_workflow"
    });
  }
}

/**
 * Convenience exports
 */
export { Agent, Runner, withTrace } from "@openai/agents";

