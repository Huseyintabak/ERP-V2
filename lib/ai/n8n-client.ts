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
    // N8N_WEBHOOK_URL veya N8N_BASE_URL kullan
    this.baseUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_BASE_URL || 'http://localhost:5678';
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
      const response = await fetch(`${this.baseUrl}/webhook/planning-agent`, {
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
   * Warehouse Agent workflow'unu çalıştır
   */
  async runWarehouseAgent(prompt: string, context?: {
    zone_id?: string;
    material_id?: string;
    stock_movement_id?: string;
  }): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n Warehouse Agent workflow`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/warehouse-agent`, {
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
      agentLogger.log(`✅ n8n Warehouse Agent completed`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Warehouse Agent failed:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Purchase Agent workflow'unu çalıştır
   */
  async runPurchaseAgent(prompt: string, context?: {
    purchase_order_id?: string;
    supplier_id?: string;
    material_id?: string;
  }): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n Purchase Agent workflow`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/purchase-agent`, {
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
      agentLogger.log(`✅ n8n Purchase Agent completed`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Purchase Agent failed:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Manager Agent workflow'unu çalıştır
   */
  async runManagerAgent(prompt: string, context?: {
    approval_id?: string;
    decision_type?: string;
    priority?: string;
  }): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n Manager Agent workflow`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/manager-agent`, {
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
      agentLogger.log(`✅ n8n Manager Agent completed`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Manager Agent failed:`, error);
      return {
        success: false,
        data: null,
        error: error.message
      };
    }
  }

  /**
   * Developer Agent workflow'unu çalıştır
   */
  async runDeveloperAgent(prompt: string, context?: {
    system_metric?: string;
    error_id?: string;
    optimization_area?: string;
  }): Promise<N8nWorkflowResult> {
    agentLogger.log(`🔧 Running n8n Developer Agent workflow`);

    try {
      const response = await fetch(`${this.baseUrl}/webhook/developer-agent`, {
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
      agentLogger.log(`✅ n8n Developer Agent completed`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Developer Agent failed:`, error);
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
    agentLogger.log(`🔧 n8n Base URL: ${this.baseUrl}`);
    agentLogger.log(`🔧 Webhook URL: ${this.baseUrl}/webhook/multi-agent-consensus`);

    try {
      const webhookUrl = `${this.baseUrl}/webhook/multi-agent-consensus`;
      const payload = {
        prompt,
        agentRoles,
        ...context
      };

      agentLogger.log(`🔧 Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // Timeout için signal ekle
        signal: AbortSignal.timeout(120000), // 2 dakika timeout
      }).catch((fetchError: any) => {
        agentLogger.error(`❌ Fetch error details:`, {
          message: fetchError.message,
          name: fetchError.name,
          cause: fetchError.cause,
          webhookUrl,
          baseUrl: this.baseUrl,
        });
        
        // Daha açıklayıcı hata mesajı
        if (fetchError.name === 'AbortError' || fetchError.name === 'TimeoutError') {
          throw new Error('n8n webhook timeout: İstek 2 dakikadan uzun sürdü. Lütfen n8n servisinin çalıştığından ve erişilebilir olduğundan emin olun.');
        } else if (fetchError.message?.includes('ECONNREFUSED') || fetchError.message?.includes('Failed to fetch')) {
          throw new Error(`n8n webhook'una erişilemedi: ${this.baseUrl}. Lütfen n8n servisinin çalıştığından ve N8N_WEBHOOK_URL environment variable'ının doğru ayarlandığından emin olun.`);
        } else {
          throw new Error(`Network hatası: ${fetchError.message || 'Bilinmeyen hata'}`);
        }
      });

      if (!response.ok) {
        let errorMessage = `n8n webhook returned ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // JSON parse edilemezse status text kullan
          errorMessage = `${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      agentLogger.log(`✅ n8n Multi-Agent Consensus completed: ${data.finalDecision || 'N/A'}`);

      return {
        success: true,
        data
      };
    } catch (error: any) {
      agentLogger.error(`❌ n8n Multi-Agent Consensus failed:`, {
        error: error.message,
        stack: error.stack,
        baseUrl: this.baseUrl,
        webhookUrl: `${this.baseUrl}/webhook/multi-agent-consensus`,
      });
      return {
        success: false,
        data: null,
        error: error.message || 'Bilinmeyen hata'
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

