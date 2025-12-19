/**
 * n8n Workflow Generator
 * MCP ve API kullanarak n8n workflow'ları programatik olarak oluşturur
 */

import { getN8nMCPClient } from './n8n-mcp-client';
import { getN8nApiClient, N8nWorkflow } from './n8n-api-client';
import { agentLogger } from './utils/logger';

export interface WorkflowNode {
  type: string;
  name: string;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface WorkflowConnection {
  from: string;
  to: string;
  fromOutput?: number;
  toInput?: number;
}

export class N8nWorkflowGenerator {
  private mcpClient = getN8nMCPClient();
  private apiClient = getN8nApiClient();

  /**
   * Basit Planning Agent workflow'u oluştur
   */
  async createBasicPlanningWorkflow(): Promise<string> {
    agentLogger.log('🚀 Creating basic planning workflow via MCP/API');

    const workflow: N8nWorkflow = {
      name: 'Thunder Planning Agent (Auto-Generated)',
      nodes: [
        {
          id: 'webhook-trigger',
          name: 'Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [250, 300],
          parameters: {
            httpMethod: 'POST',
            path: 'planning-agent-auto',
            responseMode: 'responseNode',
            options: {},
          },
          webhookId: 'planning-agent-auto',
        },
        {
          id: 'openai-agent',
          name: 'Planning Agent (GPT-4o)',
          type: '@n8n/n8n-nodes-langchain.openAi',
          typeVersion: 1,
          position: [450, 300],
          parameters: {
            resource: 'text',
            operation: 'message',
            modelId: 'gpt-4o',
            prompt: '={{ $json.body.prompt }}',
            options: {
              systemMessage: `Sen Thunder ERP'nin üretim planlama agent'ısın.

Görevlerin:
1. Sipariş bilgilerini analiz et
2. BOM (Bill of Materials) kontrol et
3. Stok durumunu değerlendir
4. Üretim sürelerini hesapla
5. Optimum üretim planı oluştur

Yanıt formatı JSON:
{
  "decision": "approved" | "rejected" | "needs_review",
  "reasoning": "Karar gerekçesi",
  "production_plan": {
    "start_date": "2025-12-20",
    "end_date": "2025-12-27",
    "estimated_duration_hours": 168,
    "required_materials": [],
    "warnings": []
  },
  "confidence": 0.95
}`,
              temperature: 0.7,
              maxTokens: 2048,
            },
          },
          credentials: {
            openAiApi: {
              id: 'openai-credentials',
              name: 'OpenAI API',
            },
          },
        },
        {
          id: 'response',
          name: 'Respond to Webhook',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [650, 300],
          parameters: {
            respondWith: 'json',
            responseBody: `={{ {
  "success": true,
  "agent": "planning",
  "response": $json.message.content,
  "tokens": $json.usage.total_tokens,
  "cost": ($json.usage.prompt_tokens * 0.005 / 1000) + ($json.usage.completion_tokens * 0.015 / 1000)
} }}`,
          },
        },
      ],
      connections: {
        'Webhook Trigger': {
          main: [[{ node: 'Planning Agent (GPT-4o)', type: 'main', index: 0 }]],
        },
        'Planning Agent (GPT-4o)': {
          main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
        },
      },
      settings: {
        executionOrder: 'v1',
      },
      active: false, // İlk oluşturulduğunda inactive
    };

    try {
      // Önce MCP server'a bağlan ve tool'ları kontrol et
      const isHealthy = await this.mcpClient.healthCheck();
      if (!isHealthy) {
        agentLogger.warn('⚠️  MCP Server not accessible, using API directly');
      }

      // API ile workflow oluştur
      const result = await this.apiClient.createWorkflow(workflow);
      agentLogger.log(`✅ Workflow created: ${result.id}`);

      return result.id;
    } catch (error: any) {
      agentLogger.error('❌ Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * MCP tool kullanarak workflow oluştur (eğer tool varsa)
   */
  async createWorkflowViaMCP(workflowName: string, workflowDefinition: any): Promise<string | null> {
    try {
      // MCP tool'larını listele
      const tools = await this.mcpClient.listTools();
      
      // Workflow oluşturma tool'unu bul
      const createTool = tools.find(t => 
        t.name.includes('workflow') && 
        (t.name.includes('create') || t.name.includes('import'))
      );

      if (!createTool) {
        agentLogger.warn('⚠️  No workflow creation tool found in MCP, using API');
        return null;
      }

      agentLogger.log(`🔧 Using MCP tool: ${createTool.name}`);

      // Tool'u çağır
      const result = await this.mcpClient.callTool(createTool.name, {
        name: workflowName,
        workflow: workflowDefinition,
      });

      return result.workflowId || result.id || null;
    } catch (error: any) {
      agentLogger.error('❌ Failed to create workflow via MCP:', error);
      return null;
    }
  }

  /**
   * JSON dosyasından workflow import et
   */
  async importWorkflowFromFile(filePath: string): Promise<string> {
    agentLogger.log(`📥 Importing workflow from file: ${filePath}`);

    // Dosyayı oku (server-side)
    const fs = await import('fs/promises');
    const workflowJson = await fs.readFile(filePath, 'utf-8');

    const result = await this.apiClient.importWorkflow(workflowJson);
    agentLogger.log(`✅ Workflow imported: ${result.id}`);

    return result.id;
  }

  /**
   * Mevcut workflow'ları listele ve analiz et
   */
  async analyzeWorkflows(): Promise<{
    total: number;
    active: number;
    inactive: number;
    workflows: Array<{ id: string; name: string; active: boolean }>;
  }> {
    const workflows = await this.apiClient.listWorkflows();

    return {
      total: workflows.length,
      active: workflows.filter(w => w.active).length,
      inactive: workflows.filter(w => !w.active).length,
      workflows: workflows.map(w => ({
        id: w.id,
        name: w.name,
        active: w.active || false,
      })),
    };
  }
}

/**
 * Singleton instance
 */
let workflowGeneratorInstance: N8nWorkflowGenerator | null = null;

export function getN8nWorkflowGenerator(): N8nWorkflowGenerator {
  if (!workflowGeneratorInstance) {
    workflowGeneratorInstance = new N8nWorkflowGenerator();
  }
  return workflowGeneratorInstance;
}

