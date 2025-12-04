/**
 * Agent Orchestrator
 * Tüm agent'ları yönetir, konuşmaları koordine eder, Zero Error Protocol'ü çalıştırır
 */

import { AgentEventBus } from './event-bus';
import { BaseAgent } from './agents/base-agent';
import { PlanningAgent } from './agents/planning-agent';
import { WarehouseAgent } from './agents/warehouse-agent';
import { ProductionAgent } from './agents/production-agent';
import { PurchaseAgent } from './agents/purchase-agent';
import { ManagerAgent } from './agents/manager-agent';
import { DeveloperAgent } from './agents/developer-agent';
import { AgentRequest, AgentResponse, AgentDecision } from './types/agent.types';
import { ProtocolResult, LayerResult } from './types/protocol.types';
import { ConsensusEngine } from './consensus-engine';
import { agentLogger } from './utils/logger';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export interface ConversationContext {
  id: string;
  prompt: string;
  type: 'request' | 'query' | 'analysis' | 'validation';
  context?: Record<string, any>;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  responses: AgentResponse[];
  protocolResult?: ProtocolResult;
}

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private eventBus: AgentEventBus;
  private agents: Map<string, BaseAgent> = new Map();
  private conversations: Map<string, ConversationContext> = new Map();

  private constructor() {
    this.eventBus = AgentEventBus.getInstance();
    this.initializeAgents();
  }

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  /**
   * Agent'ları başlat ve kaydet
   */
  initializeAgents(): void {
    // Planning Agent'ı oluştur ve kaydet
    const planningAgent = new PlanningAgent();
    this.agents.set('planning', planningAgent);
    this.eventBus.registerAgent(planningAgent);

    // Warehouse Agent'ı oluştur ve kaydet
    const warehouseAgent = new WarehouseAgent();
    this.agents.set('warehouse', warehouseAgent);
    this.eventBus.registerAgent(warehouseAgent);

    // Production Agent'ı oluştur ve kaydet
    const productionAgent = new ProductionAgent();
    this.agents.set('production', productionAgent);
    this.eventBus.registerAgent(productionAgent);

    // Purchase Agent'ı oluştur ve kaydet
    const purchaseAgent = new PurchaseAgent();
    this.agents.set('purchase', purchaseAgent);
    this.eventBus.registerAgent(purchaseAgent);

    // Manager Agent'ı oluştur ve kaydet
    const managerAgent = new ManagerAgent();
    this.agents.set('manager', managerAgent);
    this.eventBus.registerAgent(managerAgent);

    // Developer Agent'ı oluştur ve kaydet
    const developerAgent = new DeveloperAgent();
    this.agents.set('developer', developerAgent);
    this.eventBus.registerAgent(developerAgent);
  }

  /**
   * Konuşma başlat
   */
  async startConversation(
    agentRole: string,
    request: {
      id: string;
      prompt: string;
      type: 'request' | 'query' | 'analysis' | 'validation';
      context?: Record<string, any>;
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      severity?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<{ finalDecision: string; protocolResult: ProtocolResult; conversation: ConversationContext }> {
    const conversationId = request.id || `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Eğer aynı ID ile bir conversation zaten varsa ve in_progress durumundaysa, yeni conversation başlatma
    const existingConversation = this.conversations.get(conversationId);
    if (existingConversation && existingConversation.status === 'in_progress') {
      await agentLogger.warn({
        action: 'conversation_already_in_progress',
        conversationId,
        agentRole,
        message: `Conversation ${conversationId} is already in progress, returning existing conversation`
      });
      
      // Mevcut conversation'ı döndür
      if (existingConversation.protocolResult) {
        return {
          finalDecision: existingConversation.protocolResult.finalDecision,
          protocolResult: existingConversation.protocolResult,
          conversation: existingConversation
        };
      } else {
        // Protocol henüz tamamlanmamışsa, bekle (ama bu normalde olmamalı)
        throw new Error(`Conversation ${conversationId} is in progress but protocol result is not available yet`);
      }
    }

    // Database'de de kontrol et (in-memory'de olmasa bile)
    try {
      const adminSupabase = createAdminClient();
      const { data: dbConversation } = await adminSupabase
        .from('agent_logs')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('action', 'conversation_started')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dbConversation) {
        // Conversation'ın tamamlanıp tamamlanmadığını kontrol et
        const { data: completedLog } = await adminSupabase
          .from('agent_logs')
          .select('action')
          .eq('conversation_id', conversationId)
          .in('action', ['conversation_completed', 'conversation_failed'])
          .limit(1)
          .single();

        if (!completedLog) {
          // Conversation henüz tamamlanmamış, yeni conversation başlatma
          await agentLogger.warn({
            action: 'conversation_already_exists_in_db',
            conversationId,
            agentRole,
            message: `Conversation ${conversationId} already exists in database and is not completed, rejecting new request`
          });
          
          throw new Error(`Conversation ${conversationId} is already in progress. Please wait for it to complete.`);
        }
      }
    } catch (error: any) {
      // Database kontrolü hatası olursa devam et (normal bir hata değilse)
      if (error.message && error.message.includes('already in progress')) {
        throw error;
      }
      // Diğer hatalar (örn: conversation bulunamadı) normal, devam et
    }
    
    const conversation: ConversationContext = {
      id: conversationId,
      prompt: request.prompt,
      type: request.type,
      context: request.context,
      urgency: request.urgency || 'medium',
      severity: request.severity || 'medium',
      startedAt: new Date(),
      status: 'in_progress',
      responses: []
    };

    this.conversations.set(conversationId, conversation);

    await agentLogger.log({
      action: 'conversation_started',
      conversationId,
      agentRole,
      type: request.type,
      urgency: request.urgency,
      severity: request.severity
    });

    try {
      // İlgili agent'ı bul
      const agent = this.agents.get(agentRole.toLowerCase());
      if (!agent) {
        throw new Error(`Agent not found: ${agentRole}`);
      }

      // Agent'a istek gönder
      const agentRequest: AgentRequest = {
        id: conversationId,
        prompt: request.prompt,
        type: request.type,
        context: request.context,
        urgency: request.urgency,
        severity: request.severity
      };

      const agentResponse = await agent.processRequest(agentRequest);
      conversation.responses.push(agentResponse);

      // Zero Error Protocol'ü çalıştır
      const protocolResult = await this.executeZeroErrorProtocol(
        {
          agent: agent.name,
          decision: agentResponse.decision,
          action: agentResponse.action,
          data: agentResponse.data,
          reasoning: agentResponse.reasoning,
          confidence: agentResponse.confidence
        },
        request.severity || 'medium'
      );

      conversation.protocolResult = protocolResult;
      
      // OpenAI 429 (quota exceeded) hatası kontrolü
      // Protocol result'ta quota hatası varsa, graceful degradation uygula
      const hasQuotaError = protocolResult.errors?.some((e: string) => 
        e.includes('429') || e.includes('quota') || e.includes('exceeded') || e.includes('billing')
      ) || protocolResult.layers?.layer1?.errors?.some((e: any) => 
        e?.message?.includes('429') || e?.message?.includes('quota') || e?.message?.includes('exceeded')
      );
      
      if (hasQuotaError && protocolResult.finalDecision === 'rejected') {
        // Quota hatası durumunda rejected olsa bile approved olarak işaretle (graceful degradation)
        protocolResult.finalDecision = 'approved';
        protocolResult.warnings = protocolResult.warnings || [];
        protocolResult.warnings.push('OpenAI API quota exceeded. Agent validation skipped, manual approval continues.');
        conversation.status = 'completed';
      } else {
        conversation.status = protocolResult.finalDecision === 'rejected' ? 'failed' : 'completed';
      }
      
      conversation.completedAt = new Date();

      // Conversation completion log'unu kaydet
      await agentLogger.log({
        action: conversation.status === 'completed' ? 'conversation_completed' : 'conversation_failed',
        conversationId,
        agent: agent.name,
        finalDecision: protocolResult.finalDecision,
        data: {
          conversationId,
          status: conversation.status,
          finalDecision: protocolResult.finalDecision,
          protocolResult
        }
      });

      return {
        finalDecision: protocolResult.finalDecision,
        protocolResult,
        conversation
      };
    } catch (error: any) {
      conversation.completedAt = new Date();
      
      // OpenAI 429 (quota exceeded) hatası durumunda graceful degradation
      // Agent validation yapılamıyor ama işlem devam etmeli
      const isQuotaError = error?.message?.includes('429') || 
                          error?.message?.includes('quota') || 
                          error?.message?.includes('exceeded') ||
                          error?.message?.includes('billing');
      
      if (isQuotaError) {
        // Quota hatası durumunda conversation'ı "completed" olarak işaretle
        // Final decision "approved" olarak ayarla (graceful degradation)
        conversation.status = 'completed';
        
        // Default protocol result oluştur (approved)
        conversation.protocolResult = {
          decision: {
            agent: agentRole.toLowerCase(),
            decision: 'approved',
            action: 'continue',
            data: {},
            reasoning: 'OpenAI API quota exceeded, graceful degradation: manual approval continues',
            confidence: 0.5
          },
          layers: {},
          finalDecision: 'approved',
          errors: [`OpenAI API quota exceeded: ${error.message}`],
          warnings: ['Agent validation skipped due to API quota limit. Manual approval continues.']
        };
        
        await agentLogger.warn({
          action: 'conversation_completed_with_quota_error',
          conversationId,
          agent: agentRole.toLowerCase(),
          error: error.message,
          message: 'OpenAI quota exceeded, graceful degradation: conversation marked as completed with approved decision'
        });
        
        return {
          finalDecision: 'approved',
          protocolResult: conversation.protocolResult,
          conversation
        };
      }
      
      // Diğer hatalar için normal failed handling
      conversation.status = 'failed';

      await agentLogger.error({
        action: 'conversation_failed',
        conversationId,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Zero Error Protocol'ü çalıştır
   */
  private async executeZeroErrorProtocol(
    decision: AgentDecision,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<ProtocolResult> {
    const result: ProtocolResult = {
      decision,
      layers: {},
      finalDecision: 'rejected',
      errors: [],
      warnings: []
    };

    // KATMAN 1: Self-Validation
    try {
      const layer1 = await this.layer1_SelfValidation(decision);
      result.layers.layer1 = layer1;

      if (!layer1.isValid) {
        result.errors.push('Layer 1 (Self-Validation) failed');
        result.finalDecision = 'rejected';
        return result;
      }
    } catch (error: any) {
      result.errors.push(`Layer 1 error: ${error.message}`);
      result.finalDecision = 'rejected';
      return result;
    }

    // KATMAN 2: Cross-Agent Validation
    try {
      const layer2 = await this.layer2_CrossValidation(decision);
      result.layers.layer2 = layer2;

      if (!layer2.isValid) {
        result.errors.push('Layer 2 (Cross-Validation) failed');
        result.finalDecision = 'rejected';
        return result;
      }
    } catch (error: any) {
      result.warnings.push(`Layer 2 warning: ${error.message} (continuing)`);
      // Cross-validation hatası kritik değilse devam et
    }

    // KATMAN 3: Consensus Building
    // Production log validation için consensus daha esnek (operatör gerçek üretim yapıyor)
    const isProductionLogValidation = decision.action === 'validate_production' || 
                                     (decision.action?.includes('production') && decision.data?.planId);
    
    try {
      const layer3 = await this.layer3_Consensus(decision);
      result.layers.layer3 = layer3;

      if (!layer3.isValid) {
        if (isProductionLogValidation) {
          // Production log validation için consensus başarısız olsa bile sadece warning ver
          // Çünkü operatör gerçek üretim yapıyor, validation çok katı olmamalı
          result.warnings.push(`Layer 3 (Consensus) warning: ${layer3.errors?.join('; ') || 'Consensus not achieved but production log will be recorded'}`);
          // Final decision'ı değiştirme, sadece warning ekle
        } else {
          // Diğer validation'lar için consensus zorunlu
          result.errors.push('Layer 3 (Consensus) failed');
          result.finalDecision = 'rejected';
          return result;
        }
      }
    } catch (error: any) {
      if (isProductionLogValidation) {
        result.warnings.push(`Layer 3 warning: ${error.message} (production log validation - continuing)`);
      } else {
        result.warnings.push(`Layer 3 warning: ${error.message} (continuing)`);
      }
      // Consensus hatası kritik değilse devam et
    }

    // KATMAN 4: Database Integrity Check
    try {
      const layer4 = await this.layer4_DatabaseValidation(decision);
      result.layers.layer4 = layer4;

      if (!layer4.isValid) {
        result.errors.push(`Layer 4 (Database Validation) failed: ${layer4.errors.join('; ')}`);
        result.finalDecision = 'rejected';
        return result;
      }
    } catch (error: any) {
      result.errors.push(`Layer 4 error: ${error.message}`);
      result.finalDecision = 'rejected';
      return result;
    }

    // KATMAN 5: Human-in-the-Loop
    try {
      const layer5 = await this.layer5_HumanApproval(decision, severity);
      result.layers.layer5 = layer5;

      if (layer5.requiresApproval) {
        if (layer5.status === 'pending') {
          result.finalDecision = 'pending_approval';
          return result;
        } else if (layer5.status === 'rejected') {
          result.finalDecision = 'rejected';
          return result;
        }
      }
    } catch (error: any) {
      result.warnings.push(`Layer 5 warning: ${error.message}`);
    }

    // Tüm katmanlar geçti
    result.finalDecision = 'approved';
    return result;
  }

  /**
   * KATMAN 1: Self-Validation
   */
  private async layer1_SelfValidation(decision: AgentDecision): Promise<LayerResult> {
    const agent = this.agents.get(decision.agent.toLowerCase().replace(' agent', ''));
    
    if (!agent) {
      return {
        isValid: false,
        errors: [`Agent not found: ${decision.agent}`],
        warnings: []
      };
    }

    // Agent kendi kararını doğrular
    const validation = await agent.validateWithOtherAgents(decision.data);

    return {
      isValid: validation.isValid,
      errors: validation.issues,
      warnings: []
    };
  }

  /**
   * KATMAN 2: Cross-Agent Validation
   */
  private async layer2_CrossValidation(decision: AgentDecision): Promise<LayerResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // İlgili agent'lara sor
    const relatedAgents = this.getRelatedAgents(decision.agent);

    for (const agentName of relatedAgents) {
      try {
        const agent = this.agents.get(agentName);
        if (!agent) {
          warnings.push(`Agent not available: ${agentName}`);
          continue;
        }

        const validation = await agent.validateWithOtherAgents(decision.data);
        if (!validation.isValid) {
          errors.push(`${agentName}: ${validation.issues.join(', ')}`);
        }
      } catch (error: any) {
        warnings.push(`${agentName} validation failed: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * KATMAN 3: Consensus Building
   */
  private async layer3_Consensus(decision: AgentDecision): Promise<LayerResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Production log validation için daha esnek kurallar
      // Çünkü operatörler gerçek üretim yapıyor ve validation çok katı olmamalı
      const isProductionLogValidation = decision.action === 'validate_production' || 
                                       (decision.data?.planId && decision.action?.includes('production'));
      
      // Consensus Engine kullan
      const consensusOptions = isProductionLogValidation
        ? {
            minApprovalRate: 0.5, // Production log için %50 yeterli (operatör gerçek üretim yapıyor)
            allowConditional: true,
            minConfidence: 0.6, // Confidence threshold düşürüldü
            requireUnanimous: false
          }
        : {
            minApprovalRate: 0.75, // Diğer validation'lar için %75 onay yeterli (5/6 = 0.833 geçer)
            allowConditional: true,
            minConfidence: 0.7
          };
      
      const consensusResult = await ConsensusEngine.buildConsensus(
        decision,
        Array.from(this.agents.values()),
        consensusOptions
      );

      if (!consensusResult.isConsensus) {
        const analysis = ConsensusEngine.analyzeConsensus(consensusResult);
        errors.push(analysis.message);
        if (analysis.recommendations.length > 0) {
          warnings.push(...analysis.recommendations);
        }
      } else {
        // Consensus başarılı, conditional oylar varsa uyar
        if (consensusResult.conditionalVotes > 0) {
          warnings.push(`Consensus achieved with ${consensusResult.conditionalVotes} conditional vote(s). Conditions: ${consensusResult.conditions.join(', ')}`);
        }
      }

      return {
        isValid: consensusResult.isConsensus,
        errors,
        warnings,
        // Consensus detaylarını ekle (conversation detaylarında gösterilecek)
        approvalRate: consensusResult.approvalRate,
        totalVotes: consensusResult.totalVotes,
        approveVotes: consensusResult.approveVotes,
        rejectVotes: consensusResult.rejectVotes,
        conditionalVotes: consensusResult.conditionalVotes,
        agentOpinions: consensusResult.agentOpinions,
        conditions: consensusResult.conditions
      };
    } catch (error: any) {
      errors.push(`Consensus error: ${error.message}`);
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * KATMAN 4: Database Integrity Check
   */
  private async layer4_DatabaseValidation(decision: AgentDecision): Promise<LayerResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const supabase = await createClient();

      // Order approval için stok kontrolü
      if (decision.action === 'approve_order' && decision.data?.orderId) {
        const orderId = decision.data.orderId;
        
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*, product:finished_products(*)')
          .eq('order_id', orderId);

        if (itemsError) {
          errors.push(`Failed to fetch order items: ${itemsError.message}`);
          return {
            isValid: false,
            errors,
            warnings
          };
        }

        if (!orderItems || orderItems.length === 0) {
          warnings.push('No order items found for validation');
          return {
            isValid: true, // Order items yoksa validation geçerli (order zaten boş)
            errors,
            warnings
          };
        }

        for (const item of orderItems) {
          if (!item.product_id) {
            errors.push(`Order item ${item.id} has no product_id`);
            continue;
          }

          // BOM kontrolü
          const { data: bomItems, error: bomError } = await supabase
            .from('bom')
            .select('*')
            .eq('finished_product_id', item.product_id);

          if (bomError) {
            warnings.push(`BOM fetch error for product ${item.product_id}: ${bomError.message}`);
            continue;
          }

          if (!bomItems || bomItems.length === 0) {
            warnings.push(`No BOM found for product ${item.product_id}`);
            continue;
          }

          for (const bomItem of bomItems) {
            const needed = bomItem.quantity_needed * item.quantity;
            const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
            
            const { data: material, error: materialError } = await supabase
              .from(tableName)
              .select('id, code, name, quantity, reserved_quantity')
              .eq('id', bomItem.material_id)
              .single();

            if (materialError) {
              warnings.push(`Material fetch error: ${materialError.message}`);
              continue;
            }

            if (material) {
              const available = material.quantity - material.reserved_quantity;
              if (available < needed) {
                errors.push(`Insufficient stock for ${material.code || material.id}: ${needed} needed, ${available} available`);
              }
            } else {
              errors.push(`Material not found: ${bomItem.material_id}`);
            }
          }
        }
      } else {
        // Order approval değilse, validation geçerli
        return {
          isValid: true,
          errors,
          warnings
        };
      }
    } catch (error: any) {
      errors.push(`Database validation error: ${error.message}`);
      await agentLogger.error({
        action: 'layer4_database_validation_error',
        error: error.message,
        stack: error.stack
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * KATMAN 5: Human-in-the-Loop
   */
  private async layer5_HumanApproval(
    decision: AgentDecision,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<LayerResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Severity'ye göre onay gereksinimi
    const requiresApproval = severity === 'critical' || severity === 'high';

    if (requiresApproval) {
      try {
        // Human approval kaydı oluştur
        await this.createHumanApprovalRequest(decision, severity);
        warnings.push(`Human approval required for ${severity} severity decision`);
      } catch (error: any) {
        errors.push(`Failed to create human approval request: ${error.message}`);
      }
    }

    return {
      isValid: true, // Human approval bekleniyor, hata değil
      errors,
      warnings
    };
  }

  /**
   * Human approval kaydı oluştur
   */
  private async createHumanApprovalRequest(
    decision: AgentDecision,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    try {
      // AI agent'lar için her zaman admin client kullan (RLS bypass)
      // AI agent'lar service role ile çalışmalı, authenticated user değil
      const supabase = createAdminClient();
      
      // 24 saat sonra expire
      const expiryAt = new Date();
      expiryAt.setHours(expiryAt.getHours() + 24);

      const { error } = await supabase
        .from('human_approvals')
        .insert({
          decision_id: `${decision.agent}_${Date.now()}`,
          agent: decision.agent,
          action: decision.action || 'unknown',
          data: decision.data || {},
          reasoning: decision.reasoning || '',
          severity,
          status: 'pending',
          expiry_at: expiryAt.toISOString()
        });

      if (error) {
        // Duplicate key hatası olabilir, ignore et
        if (error.code !== '23505') {
          throw error;
        }
      }

      await agentLogger.log({
        action: 'human_approval_created',
        decisionId: decision.agent,
        severity
      });
    } catch (error: any) {
      await agentLogger.error({
        action: 'human_approval_create_failed',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * İlgili agent'ları bul
   */
  private getRelatedAgents(agentName: string): string[] {
    const agentMap: Record<string, string[]> = {
      'planning': ['warehouse', 'production', 'purchase'],
      'warehouse': ['planning', 'production', 'purchase'],
      'production': ['planning', 'warehouse'],
      'purchase': ['planning', 'warehouse'],
      'manager': ['planning', 'warehouse', 'production', 'purchase', 'developer'], // Manager tüm agent'larla iletişim kurar
      'developer': []
    };

    const role = agentName.toLowerCase().replace(' agent', '');
    return agentMap[role] || [];
  }

  /**
   * Konuşma geçmişini al
   */
  getConversation(id: string): ConversationContext | undefined {
    return this.conversations.get(id);
  }

  /**
   * Tüm konuşmaları al
   */
  getAllConversations(): ConversationContext[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Belirli bir konuşmanın geçmişini al
   */
  getConversationHistory(conversationId: string): ConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Tüm agent'ları al
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
}

