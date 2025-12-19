/**
 * n8n Workflow Client
 * n8n'de oluşturulan AI agent workflow'larını Thunder ERP'den çağırmak için
 */

import { agentLogger } from './utils/logger';

export interface N8nWorkflowResult {
  success: boolean;
  data: any;
  error?: string;
}

export class N8nClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678';
  }

  /**
   * Planning Agent workflow'unu çalıştır
   */
  async runPlanningAgent(prompt: string, context?: {
    plan_id?: string;
    order_id?: string;
    product_id?: string;
  }): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n Planning Agent workflow`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/planning-agent-advanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          ...context
        })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned ${response.status}`);
      }

      const data = await response.json();
      agentLogger.log(`✅ n8n Planning Agent completed`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Planning Agent failed:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Production Agent workflow'unu çalıştır
   */
  async runProductionAgent(prompt: string, context?: {
    production_log_id?: string;
    operator_id?: string;
    product_id?: string;
  }): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n Production Agent workflow`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/production-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          ...context
        })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned ${response.status}`);
      }

      const data = await response.json();
      agentLogger.log(`✅ n8n Production Agent completed`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Production Agent failed:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Multi-Agent Consensus workflow'unu çalıştır
   */
  async runMultiAgentConsensus(prompt: string, agentRoles: string[], context?: any): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n Multi-Agent Consensus workflow with ${agentRoles.length} agents`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/multi-agent-consensus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agentRoles,
          ...context
        })
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned ${response.status}`);
      }

      const data = await response.json();
      agentLogger.log(`✅ n8n Multi-Agent Consensus completed: ${data.finalDecision}`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Multi-Agent Consensus failed:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Generic webhook çağrısı (custom workflow'lar için)
   */
  async runCustomWorkflow(webhookPath: string, payload: any): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n custom workflow: ${webhookPath}`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/${webhookPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`n8n webhook returned ${response.status}`);
      }

      const data = await response.json();
      agentLogger.log(`✅ n8n custom workflow completed`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n custom workflow failed:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * n8n health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let n8nClientInstance: N8nClient | null = null;

export function getN8nClient(): N8nClient {
  if (!n8nClientInstance) {
    n8nClientInstance = new N8nClient();
  }
  return n8nClientInstance;
}

