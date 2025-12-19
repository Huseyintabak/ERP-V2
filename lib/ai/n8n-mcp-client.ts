/**
 * n8n MCP Server Client
 * n8n'in Model Context Protocol (MCP) server'ına bağlanmak için
 */

import { agentLogger } from './utils/logger';
import { env } from '@/lib/env';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
  };
}

export class N8nMCPClient {
  private serverUrl: string;
  private accessToken: string;

  constructor() {
    this.serverUrl = env.N8N_MCP_SERVER_URL || 'http://192.168.1.250:5678/mcp-server/http';
    this.accessToken = env.N8N_MCP_ACCESS_TOKEN || '';
    
    if (!this.accessToken) {
      agentLogger.warn('⚠️  N8N_MCP_ACCESS_TOKEN not set. MCP features will be disabled.');
    }
  }

  /**
   * MCP Server'a istek gönder
   */
  private async request(method: string, path: string, body?: any): Promise<any> {
    if (!this.accessToken) {
      throw new Error('N8N_MCP_ACCESS_TOKEN is not configured');
    }

    const url = `${this.serverUrl}${path}`;
    agentLogger.log(`🔧 MCP Request: ${method} ${path}`);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MCP Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      agentLogger.error(`❌ MCP Request failed:`, error);
      throw error;
    }
  }

  /**
   * Server bilgilerini al
   */
  async getServerInfo(): Promise<MCPServerInfo> {
    return await this.request('GET', '/server/info');
  }

  /**
   * Mevcut tool'ları listele
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await this.request('GET', '/tools/list');
    return response.tools || [];
  }

  /**
   * Tool'u çalıştır
   */
  async callTool(toolName: string, arguments_: Record<string, any>): Promise<any> {
    agentLogger.log(`🔧 Calling MCP tool: ${toolName}`, arguments_);
    
    const response = await this.request('POST', '/tools/call', {
      name: toolName,
      arguments: arguments_,
    });

    return response;
  }

  /**
   * Resource'ları listele
   */
  async listResources(): Promise<MCPResource[]> {
    const response = await this.request('GET', '/resources/list');
    return response.resources || [];
  }

  /**
   * Resource'u oku
   */
  async readResource(uri: string): Promise<any> {
    const response = await this.request('POST', '/resources/read', { uri });
    return response;
  }

  /**
   * Prompt'ları listele
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    const response = await this.request('GET', '/prompts/list');
    return response.prompts || [];
  }

  /**
   * Prompt'u çalıştır
   */
  async getPrompt(promptName: string, arguments_?: Record<string, any>): Promise<any> {
    const response = await this.request('POST', '/prompts/get', {
      name: promptName,
      arguments: arguments_ || {},
    });
    return response;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getServerInfo();
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance
 */
let n8nMCPClientInstance: N8nMCPClient | null = null;

export function getN8nMCPClient(): N8nMCPClient {
  if (!n8nMCPClientInstance) {
    n8nMCPClientInstance = new N8nMCPClient();
  }
  return n8nMCPClientInstance;
}

