/**
 * Agent Builder Orchestrator
 * OpenAI Agent Builder ile entegre agent orkestratörü
 * Mevcut orchestrator'un Agent Builder versiyonu
 */

import { ThunderAgentFactory, AgentBuilderWrapper } from './agent-builder-wrapper';
import { AgentRequest, AgentResponse, AgentDecision } from './types/agent.types';
import { ProtocolResult, LayerResult } from './types/protocol.types';
import { agentLogger } from './utils/logger';
import { createAdminClient } from '@/lib/supabase/server';

export interface BuilderConversationContext {
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
  workflowIds: string[]; // OpenAI Dashboard trace link'leri için
}

/**
 * Agent Builder Orchestrator
 * OpenAI Agent Builder kullanarak agent'ları yönetir
 */
export class AgentBuilderOrchestrator {
  private static instance: AgentBuilderOrchestrator;
  private agents: Map<string, AgentBuilderWrapper> = new Map();
  private conversations: Map<string, BuilderConversationContext> = new Map();

  private constructor() {
    this.initializeAgents();
  }

  static getInstance(): AgentBuilderOrchestrator {
    if (!AgentBuilderOrchestrator.instance) {
      AgentBuilderOrchestrator.instance = new AgentBuilderOrchestrator();
    }
    return AgentBuilderOrchestrator.instance;
  }

  /**
   * Agent Builder agent'larını başlat
   */
  private initializeAgents(): void {
    agentLogger.log('🤖 Initializing Agent Builder agents...');

    // Planning Agent
    const planningAgent = ThunderAgentFactory.createPlanningAgent();
    this.agents.set('planning', planningAgent);
    agentLogger.log(`✅ Planning Agent initialized (Workflow: ${planningAgent.getWorkflowId()})`);

    // Production Agent
    const productionAgent = ThunderAgentFactory.createProductionAgent();
    this.agents.set('production', productionAgent);
    agentLogger.log(`✅ Production Agent initialized (Workflow: ${productionAgent.getWorkflowId()})`);

    // Warehouse Agent
    const warehouseAgent = ThunderAgentFactory.createWarehouseAgent();
    this.agents.set('warehouse', warehouseAgent);
    agentLogger.log(`✅ Warehouse Agent initialized (Workflow: ${warehouseAgent.getWorkflowId()})`);

    // Purchase Agent
    const purchaseAgent = ThunderAgentFactory.createPurchaseAgent();
    this.agents.set('purchase', purchaseAgent);
    agentLogger.log(`✅ Purchase Agent initialized (Workflow: ${purchaseAgent.getWorkflowId()})`);

    // Manager Agent
    const managerAgent = ThunderAgentFactory.createManagerAgent();
    this.agents.set('manager', managerAgent);
    agentLogger.log(`✅ Manager Agent initialized (Workflow: ${managerAgent.getWorkflowId()})`);

    // Developer Agent
    const developerAgent = ThunderAgentFactory.createDeveloperAgent();
    this.agents.set('developer', developerAgent);
    agentLogger.log(`✅ Developer Agent initialized (Workflow: ${developerAgent.getWorkflowId()})`);

    agentLogger.log('🎉 All Agent Builder agents initialized successfully!');
  }

  /**
   * Konuşma başlat - OpenAI Dashboard'da izlenebilir
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
  ): Promise<{ finalDecision: string; protocolResult: ProtocolResult; conversation: BuilderConversationContext }> {
    const conversationId = request.id || `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    agentLogger.log(`\n${'='.repeat(80)}`);
    agentLogger.log(`🚀 Starting Agent Builder Conversation: ${conversationId}`);
    agentLogger.log(`   Agent: ${agentRole}`);
    agentLogger.log(`   Type: ${request.type}`);
    agentLogger.log(`   Urgency: ${request.urgency || 'medium'}`);
    agentLogger.log(`${'='.repeat(80)}\n`);

    // Conversation context oluştur
    const conversation: BuilderConversationContext = {
      id: conversationId,
      prompt: request.prompt,
      type: request.type,
      context: request.context,
      urgency: request.urgency || 'medium',
      severity: request.severity || 'medium',
      startedAt: new Date(),
      status: 'in_progress',
      responses: [],
      workflowIds: []
    };

    this.conversations.set(conversationId, conversation);

    try {
      // Agent'ı al
      const agent = this.agents.get(agentRole);
      if (!agent) {
        throw new Error(`Agent not found: ${agentRole}`);
      }

      // Agent'ı çalıştır (OpenAI Dashboard'da trace edilir)
      const agentRequest: AgentRequest = {
        type: request.type,
        data: request.prompt,
        context: request.context,
        requestId: conversationId
      };

      const response = await agent.run(agentRequest);
      
      conversation.responses.push(response);
      conversation.workflowIds.push(agent.getWorkflowId());

      // Protocol result oluştur
      const protocolResult: ProtocolResult = {
        finalDecision: response.decision,
        layers: [
          {
            name: 'Agent Builder Layer',
            passed: response.decision === 'approved',
            errors: response.decision === 'rejected' ? ['Agent rejected the request'] : [],
            warnings: response.decision === 'needs_review' ? ['Agent needs review'] : [],
            metrics: {
              responseTime: Date.now() - conversation.startedAt.getTime(),
              agentCount: 1
            }
          }
        ],
        errors: response.decision === 'rejected' ? ['Agent rejected the request'] : [],
        warnings: response.decision === 'needs_review' ? ['Agent needs review'] : [],
        consensus: {
          approve: response.decision === 'approved' ? 1 : 0,
          reject: response.decision === 'rejected' ? 1 : 0,
          needs_review: response.decision === 'needs_review' ? 1 : 0,
          total: 1
        },
        metrics: {
          totalDuration: Date.now() - conversation.startedAt.getTime(),
          aiCalls: 1,
          averageConfidence: response.confidence
        }
      };

      conversation.protocolResult = protocolResult;
      conversation.status = 'completed';
      conversation.completedAt = new Date();

      // Database'e log kaydet
      await this.logConversation(conversation);

      agentLogger.log(`\n${'='.repeat(80)}`);
      agentLogger.log(`✅ Conversation Completed: ${conversationId}`);
      agentLogger.log(`   Final Decision: ${protocolResult.finalDecision}`);
      agentLogger.log(`   Duration: ${protocolResult.metrics.totalDuration}ms`);
      agentLogger.log(`   OpenAI Dashboard: https://platform.openai.com/traces`);
      agentLogger.log(`   Workflow IDs: ${conversation.workflowIds.join(', ')}`);
      agentLogger.log(`${'='.repeat(80)}\n`);

      return {
        finalDecision: protocolResult.finalDecision,
        protocolResult,
        conversation
      };

    } catch (error: any) {
      agentLogger.error(`❌ Conversation failed: ${conversationId}`, error);

      conversation.status = 'failed';
      conversation.completedAt = new Date();

      const protocolResult: ProtocolResult = {
        finalDecision: 'rejected',
        layers: [],
        errors: [error.message || 'Unknown error'],
        warnings: ['Conversation failed due to error'],
        consensus: {
          approve: 0,
          reject: 1,
          needs_review: 0,
          total: 1
        },
        metrics: {
          totalDuration: Date.now() - conversation.startedAt.getTime(),
          aiCalls: 0,
          averageConfidence: 0
        }
      };

      conversation.protocolResult = protocolResult;

      // Database'e error log kaydet
      await this.logConversation(conversation);

      throw error;
    }
  }

  /**
   * Multi-agent konuşma - Birden fazla agent'ı sırayla çalıştır
   */
  async startMultiAgentConversation(
    agentRoles: string[],
    request: {
      id: string;
      prompt: string;
      type: 'request' | 'query' | 'analysis' | 'validation';
      context?: Record<string, any>;
      urgency?: 'low' | 'medium' | 'high' | 'critical';
      severity?: 'low' | 'medium' | 'high' | 'critical';
    }
  ): Promise<{ finalDecision: string; protocolResult: ProtocolResult; conversation: BuilderConversationContext }> {
    const conversationId = request.id || `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    agentLogger.log(`\n${'='.repeat(80)}`);
    agentLogger.log(`🚀 Starting Multi-Agent Conversation: ${conversationId}`);
    agentLogger.log(`   Agents: ${agentRoles.join(', ')}`);
    agentLogger.log(`   Type: ${request.type}`);
    agentLogger.log(`${'='.repeat(80)}\n`);

    const conversation: BuilderConversationContext = {
      id: conversationId,
      prompt: request.prompt,
      type: request.type,
      context: request.context,
      urgency: request.urgency || 'medium',
      severity: request.severity || 'medium',
      startedAt: new Date(),
      status: 'in_progress',
      responses: [],
      workflowIds: []
    };

    this.conversations.set(conversationId, conversation);

    try {
      // Her agent'ı sırayla çalıştır
      for (const agentRole of agentRoles) {
        const agent = this.agents.get(agentRole);
        if (!agent) {
          agentLogger.warn(`⚠️ Agent not found: ${agentRole}, skipping...`);
          continue;
        }

        agentLogger.log(`🤖 Running ${agentRole} agent...`);

        const agentRequest: AgentRequest = {
          type: request.type,
          data: request.prompt,
          context: {
            ...request.context,
            previousResponses: conversation.responses.map(r => ({
              agent: r.agentName,
              decision: r.decision,
              reasoning: r.reasoning
            }))
          },
          requestId: conversationId
        };

        const response = await agent.run(agentRequest);
        conversation.responses.push(response);
        conversation.workflowIds.push(agent.getWorkflowId());

        agentLogger.log(`   ✓ ${agentRole}: ${response.decision} (confidence: ${response.confidence})`);
      }

      // Consensus hesapla
      const approveCount = conversation.responses.filter(r => r.decision === 'approved').length;
      const rejectCount = conversation.responses.filter(r => r.decision === 'rejected').length;
      const reviewCount = conversation.responses.filter(r => r.decision === 'needs_review').length;
      const totalCount = conversation.responses.length;

      // Final decision (majority vote)
      let finalDecision: AgentDecision = 'needs_review';
      if (approveCount > totalCount / 2) {
        finalDecision = 'approved';
      } else if (rejectCount > 0) {
        finalDecision = 'rejected';
      }

      const protocolResult: ProtocolResult = {
        finalDecision,
        layers: [
          {
            name: 'Multi-Agent Consensus Layer',
            passed: finalDecision === 'approved',
            errors: finalDecision === 'rejected' ? ['One or more agents rejected'] : [],
            warnings: finalDecision === 'needs_review' ? ['Needs manual review'] : [],
            metrics: {
              responseTime: Date.now() - conversation.startedAt.getTime(),
              agentCount: totalCount
            }
          }
        ],
        errors: [],
        warnings: [],
        consensus: {
          approve: approveCount,
          reject: rejectCount,
          needs_review: reviewCount,
          total: totalCount
        },
        metrics: {
          totalDuration: Date.now() - conversation.startedAt.getTime(),
          aiCalls: totalCount,
          averageConfidence: conversation.responses.reduce((sum, r) => sum + r.confidence, 0) / totalCount
        }
      };

      conversation.protocolResult = protocolResult;
      conversation.status = 'completed';
      conversation.completedAt = new Date();

      await this.logConversation(conversation);

      agentLogger.log(`\n${'='.repeat(80)}`);
      agentLogger.log(`✅ Multi-Agent Conversation Completed: ${conversationId}`);
      agentLogger.log(`   Final Decision: ${finalDecision}`);
      agentLogger.log(`   Consensus: ${approveCount} approve, ${rejectCount} reject, ${reviewCount} review`);
      agentLogger.log(`   Duration: ${protocolResult.metrics.totalDuration}ms`);
      agentLogger.log(`   Workflow IDs: ${conversation.workflowIds.join(', ')}`);
      agentLogger.log(`${'='.repeat(80)}\n`);

      return {
        finalDecision,
        protocolResult,
        conversation
      };

    } catch (error: any) {
      agentLogger.error(`❌ Multi-agent conversation failed: ${conversationId}`, error);
      
      conversation.status = 'failed';
      conversation.completedAt = new Date();

      throw error;
    }
  }

  /**
   * Conversation'ı database'e kaydet
   */
  private async logConversation(conversation: BuilderConversationContext): Promise<void> {
    try {
      const supabase = await createAdminClient();

      // Agent logs tablosuna kaydet
      for (const response of conversation.responses) {
        await supabase.from('agent_logs').insert({
          conversation_id: conversation.id,
          agent_name: response.agentName,
          action: 'agent_builder_response',
          request_data: {
            prompt: conversation.prompt,
            type: conversation.type,
            context: conversation.context
          },
          response_data: {
            decision: response.decision,
            reasoning: response.reasoning,
            confidence: response.confidence,
            suggestions: response.suggestions
          },
          metadata: {
            workflowIds: conversation.workflowIds,
            urgency: conversation.urgency,
            severity: conversation.severity,
            duration: conversation.completedAt 
              ? conversation.completedAt.getTime() - conversation.startedAt.getTime()
              : null
          }
        });
      }

      agentLogger.log(`📝 Conversation logged to database: ${conversation.id}`);
    } catch (error) {
      agentLogger.error('Failed to log conversation to database', error);
    }
  }

  /**
   * Conversation'ı al
   */
  getConversation(conversationId: string): BuilderConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Tüm agent'ların bilgilerini al
   */
  getAgentsInfo() {
    return Array.from(this.agents.entries()).map(([role, agent]) => ({
      role,
      ...agent.getInfo()
    }));
  }

  /**
   * Dashboard link'leri al
   */
  getDashboardLinks() {
    return {
      traces: 'https://platform.openai.com/traces',
      agents: this.getAgentsInfo().map(agent => ({
        name: agent.name,
        role: agent.role,
        traceUrl: `https://platform.openai.com/traces/${agent.workflowId}`
      }))
    };
  }
}

/**
 * Singleton instance getter
 */
export function getAgentBuilderOrchestrator(): AgentBuilderOrchestrator {
  return AgentBuilderOrchestrator.getInstance();
}

