/**
 * n8n API Client
 * n8n REST API'sini kullanarak workflow oluşturma, güncelleme ve yönetme
 */

import { agentLogger } from './utils/logger';
import { env } from '@/lib/env';

export interface N8nWorkflow {
  name: string;
  nodes: any[];
  connections: Record<string, any>;
  settings?: Record<string, any>;
  staticData?: any;
  tags?: string[];
  active?: boolean;
}

export interface N8nWorkflowExecution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowData: N8nWorkflow;
}

export class N8nApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = env.N8N_BASE_URL || 'http://192.168.1.250:5678';
    this.apiKey = env.N8N_API_KEY || '';
    
    if (!this.apiKey) {
      agentLogger.warn('⚠️  N8N_API_KEY not set. Some API features will be disabled.');
    }
  }

  /**
   * API'ye istek gönder
   */
  private async request(method: string, path: string, body?: any): Promise<any> {
    const url = `${this.baseUrl}/api/v1${path}`;
    agentLogger.log(`🔧 n8n API Request: ${method} ${path}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`n8n API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      agentLogger.error(`❌ n8n API Request failed:`, error);
      throw error;
    }
  }

  /**
   * Workflow oluştur
   */
  async createWorkflow(workflow: N8nWorkflow): Promise<N8nWorkflow & { id: string }> {
    agentLogger.log(`🚀 Creating n8n workflow: ${workflow.name}`);
    
    const result = await this.request('POST', '/workflows', workflow);
    agentLogger.log(`✅ Workflow created: ${result.id}`);
    
    return result;
  }

  /**
   * Workflow'u güncelle
   */
  async updateWorkflow(workflowId: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow & { id: string }> {
    agentLogger.log(`🔄 Updating n8n workflow: ${workflowId}`);
    
    const result = await this.request('PUT', `/workflows/${workflowId}`, workflow);
    agentLogger.log(`✅ Workflow updated: ${workflowId}`);
    
    return result;
  }

  /**
   * Workflow'u sil
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    agentLogger.log(`🗑️  Deleting n8n workflow: ${workflowId}`);
    
    await this.request('DELETE', `/workflows/${workflowId}`);
    agentLogger.log(`✅ Workflow deleted: ${workflowId}`);
  }

  /**
   * Tüm workflow'ları listele
   */
  async listWorkflows(): Promise<(N8nWorkflow & { id: string })[]> {
    const result = await this.request('GET', '/workflows');
    return result.data || [];
  }

  /**
   * Workflow'u ID ile al
   */
  async getWorkflow(workflowId: string): Promise<N8nWorkflow & { id: string }> {
    return await this.request('GET', `/workflows/${workflowId}`);
  }

  /**
   * Workflow'u aktifleştir/deaktifleştir
   */
  async activateWorkflow(workflowId: string, active: boolean = true): Promise<void> {
    agentLogger.log(`${active ? '🟢 Activating' : '🔴 Deactivating'} workflow: ${workflowId}`);
    
    await this.request('POST', `/workflows/${workflowId}/activate`, { active });
    agentLogger.log(`✅ Workflow ${active ? 'activated' : 'deactivated'}: ${workflowId}`);
  }

  /**
   * Workflow'u çalıştır (manual trigger)
   */
  async executeWorkflow(workflowId: string, data?: any): Promise<N8nWorkflowExecution> {
    agentLogger.log(`▶️  Executing workflow: ${workflowId}`);
    
    const result = await this.request('POST', `/workflows/${workflowId}/execute`, { data });
    agentLogger.log(`✅ Workflow execution started: ${result.id}`);
    
    return result;
  }

  /**
   * Execution durumunu kontrol et
   */
  async getExecution(executionId: string): Promise<N8nWorkflowExecution> {
    return await this.request('GET', `/executions/${executionId}`);
  }

  /**
   * Workflow'u JSON'dan import et
   */
  async importWorkflow(workflowJson: string | object): Promise<N8nWorkflow & { id: string }> {
    agentLogger.log(`📥 Importing workflow from JSON`);
    
    const workflow = typeof workflowJson === 'string' ? JSON.parse(workflowJson) : workflowJson;
    return await this.createWorkflow(workflow as N8nWorkflow);
  }

  /**
   * Workflow'u JSON olarak export et
   */
  async exportWorkflow(workflowId: string): Promise<string> {
    const workflow = await this.getWorkflow(workflowId);
    return JSON.stringify(workflow, null, 2);
  }
}

/**
 * Singleton instance
 */
let n8nApiClientInstance: N8nApiClient | null = null;

export function getN8nApiClient(): N8nApiClient {
  if (!n8nApiClientInstance) {
    n8nApiClientInstance = new N8nApiClient();
  }
  return n8nApiClientInstance;
}

