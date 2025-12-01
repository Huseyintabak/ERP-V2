/**
 * Agent Event Bus
 * Agent'lar arası mesajlaşma sistemi
 */

import { EventEmitter } from 'events';
import { AgentMessage, AgentResponse } from './types/message.types';
import { BaseAgent } from './agents/base-agent';
import { agentLogger } from './utils/logger';

export class AgentEventBus extends EventEmitter {
  private static instance: AgentEventBus;
  private agents: Map<string, BaseAgent> = new Map();
  
  private constructor() {
    super();
    this.setupEventHandlers();
  }
  
  static getInstance(): AgentEventBus {
    if (!AgentEventBus.instance) {
      AgentEventBus.instance = new AgentEventBus();
    }
    return AgentEventBus.instance;
  }
  
  /**
   * Agent kaydet
   */
  registerAgent(agent: BaseAgent): void {
    const key = agent.name.toLowerCase();
    this.agents.set(key, agent);
    this.emit('agent:registered', agent.name);
    
    agentLogger.log({
      agent: agent.name,
      action: 'agent_registered',
      totalAgents: this.agents.size
    });
  }
  
  /**
   * Agent mesajı gönder
   */
  async sendMessage(
    from: string,
    to: string,
    message: AgentMessage
  ): Promise<AgentResponse> {
    this.emit('agent:message', { from, to, message });
    
    const targetAgent = this.agents.get(to.toLowerCase());
    if (!targetAgent) {
      const error = new Error(`Agent not found: ${to}`);
      await agentLogger.error({
        agent: from,
        action: 'message_sent',
        target: to,
        error: error.message,
        success: false
      });
      throw error;
    }
    
    try {
      const response = await targetAgent.processRequest({
        id: message.id,
        prompt: message.content,
        type: message.type === 'query' ? 'query' : 'request',
        context: message.data,
        urgency: message.context?.urgency || 'medium',
        severity: message.context?.urgency === 'critical' ? 'critical' : 'medium'
      });
      
      this.emit('agent:response', { from: to, to: from, response });
      
      await agentLogger.log({
        agent: from,
        action: 'message_sent',
        target: to,
        messageId: message.id,
        success: true
      });
      
      return response;
    } catch (error: any) {
      await agentLogger.error({
        agent: from,
        action: 'message_sent',
        target: to,
        messageId: message.id,
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }
  
  /**
   * Broadcast (tüm agent'lara)
   */
  async broadcast(from: string, message: AgentMessage): Promise<AgentResponse[]> {
    const agents = Array.from(this.agents.values())
      .filter(a => a.name.toLowerCase() !== from.toLowerCase());
    
    const responses = await Promise.allSettled(
      agents.map(agent => 
        this.sendMessage(from, agent.name, message)
      )
    );
    
    const successfulResponses: AgentResponse[] = [];
    const failedResponses: any[] = [];
    
    responses.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResponses.push(result.value);
      } else {
        failedResponses.push({
          agent: agents[index].name,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    if (failedResponses.length > 0) {
      await agentLogger.warn({
        agent: from,
        action: 'broadcast',
        failedCount: failedResponses.length,
        failedAgents: failedResponses
      });
    }
    
    return successfulResponses;
  }
  
  /**
   * Event handler'ları kur
   */
  private setupEventHandlers(): void {
    this.on('agent:message', (data: { from: string; to: string; message: AgentMessage }) => {
      agentLogger.log({
        action: 'event:message',
        from: data.from,
        to: data.to,
        messageId: data.message.id
      });
    });
    
    this.on('agent:response', (data: { from: string; to: string; response: AgentResponse }) => {
      agentLogger.log({
        action: 'event:response',
        from: data.from,
        to: data.to,
        decision: data.response.decision
      });
    });
    
    this.on('agent:registered', (agentName: string) => {
      agentLogger.log({
        action: 'event:agent_registered',
        agent: agentName
      });
    });
  }
  
  /**
   * Tüm agent'ları al
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Agent al
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name.toLowerCase());
  }
  
  /**
   * Agent var mı kontrol et
   */
  hasAgent(name: string): boolean {
    return this.agents.has(name.toLowerCase());
  }
  
  /**
   * Tüm agent'ları temizle (test için)
   */
  clear(): void {
    this.agents.clear();
    this.removeAllListeners();
  }
}


