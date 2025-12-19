/**
 * Agent Builder UI Factory
 * Agent Builder UI'de oluşturulan assistant'ları Thunder ERP'den çağırmak için
 */

import { runAgentBuilderWorkflow, AgentBuilderRunResult } from './agent-builder-api-client';
import { agentLogger } from './utils/logger';

export type AgentRole = 'planning' | 'production' | 'warehouse' | 'purchase' | 'manager' | 'developer';

export class AgentBuilderUIFactory {
  private static assistantIds: Record<AgentRole, string | undefined> = {
    planning: process.env.OPENAI_PLANNING_AGENT_ID,
    production: process.env.OPENAI_PRODUCTION_AGENT_ID,
    warehouse: process.env.OPENAI_WAREHOUSE_AGENT_ID,
    purchase: process.env.OPENAI_PURCHASE_AGENT_ID,
    manager: process.env.OPENAI_MANAGER_AGENT_ID,
    developer: process.env.OPENAI_DEVELOPER_AGENT_ID,
  };

  /**
   * Agent Builder UI'den agent çalıştır
   */
  static async runAgent(
    role: AgentRole,
    prompt: string,
    context?: any
  ): Promise<AgentBuilderRunResult> {
    const assistantId = this.assistantIds[role];

    if (!assistantId) {
      agentLogger.warn(
        `⚠️ Assistant ID not configured for ${role} agent. Set OPENAI_${role.toUpperCase()}_AGENT_ID in .env.local`
      );
      throw new Error(
        `Assistant ID not configured for ${role} agent. Please create an agent in Agent Builder and set the ID in environment variables.`
      );
    }

    agentLogger.log(`🎨 Running ${role} agent from Agent Builder UI: ${assistantId}`);

    return await runAgentBuilderWorkflow(assistantId, prompt, {
      ...context,
      agent_role: role,
      agent_name: `Thunder ${role.charAt(0).toUpperCase() + role.slice(1)} Agent`,
    });
  }

  /**
   * Hangi agent'ların configure edildiğini kontrol et
   */
  static getConfiguredAgents(): { role: AgentRole; assistantId: string }[] {
    return (Object.entries(this.assistantIds) as [AgentRole, string | undefined][])
      .filter(([_, id]) => !!id)
      .map(([role, id]) => ({ role, assistantId: id! }));
  }

  /**
   * Tüm agent'ların configure durumunu al
   */
  static getAgentStatus(): Record<AgentRole, { configured: boolean; assistantId?: string }> {
    return {
      planning: {
        configured: !!this.assistantIds.planning,
        assistantId: this.assistantIds.planning,
      },
      production: {
        configured: !!this.assistantIds.production,
        assistantId: this.assistantIds.production,
      },
      warehouse: {
        configured: !!this.assistantIds.warehouse,
        assistantId: this.assistantIds.warehouse,
      },
      purchase: {
        configured: !!this.assistantIds.purchase,
        assistantId: this.assistantIds.purchase,
      },
      manager: {
        configured: !!this.assistantIds.manager,
        assistantId: this.assistantIds.manager,
      },
      developer: {
        configured: !!this.assistantIds.developer,
        assistantId: this.assistantIds.developer,
      },
    };
  }
}

