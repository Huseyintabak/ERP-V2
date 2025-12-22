import { NextRequest, NextResponse } from 'next/server';
import { getN8nMCPClient } from '@/lib/ai/n8n-mcp-client';
import { agentLogger } from '@/lib/ai/utils/logger';

/**
 * GET /api/ai/n8n-mcp
 * MCP Server bilgilerini ve mevcut tool'ları listele
 */
export async function GET(request: NextRequest) {
  try {
    // Debug: Environment variables kontrolü
    const debug = request.nextUrl.searchParams.get('debug') === 'true';
    if (debug) {
      return NextResponse.json({
        debug: true,
        env: {
          N8N_MCP_SERVER_URL: process.env.N8N_MCP_SERVER_URL || 'NOT SET',
          N8N_MCP_ACCESS_TOKEN: process.env.N8N_MCP_ACCESS_TOKEN ? 'SET (hidden)' : 'NOT SET',
          N8N_BASE_URL: process.env.N8N_BASE_URL || 'NOT SET',
          N8N_API_KEY: process.env.N8N_API_KEY ? 'SET (hidden)' : 'NOT SET',
        },
        processEnv: Object.keys(process.env).filter(key => key.startsWith('N8N_')),
      });
    }

    const mcpClient = getN8nMCPClient();

    // Health check
    const isHealthy = await mcpClient.healthCheck();
    if (!isHealthy) {
      return NextResponse.json(
        { 
          error: 'MCP Server is not accessible', 
          message: 'Check N8N_MCP_SERVER_URL and N8N_MCP_ACCESS_TOKEN',
          debug: {
            N8N_MCP_SERVER_URL: process.env.N8N_MCP_SERVER_URL || 'NOT SET',
            N8N_MCP_ACCESS_TOKEN: process.env.N8N_MCP_ACCESS_TOKEN ? 'SET' : 'NOT SET',
          }
        },
        { status: 503 }
      );
    }

    // Server info
    const serverInfo = await mcpClient.getServerInfo();

    // List tools
    const tools = await mcpClient.listTools();

    // List resources
    const resources = await mcpClient.listResources();

    // List prompts
    const prompts = await mcpClient.listPrompts();

    return NextResponse.json({
      success: true,
      serverInfo,
      tools,
      resources,
      prompts,
      message: 'MCP Server is accessible',
    });
  } catch (error: any) {
    agentLogger.error('❌ Failed to connect to MCP Server:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect to MCP Server',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/n8n-mcp
 * MCP Tool çağır
 * Body: { toolName: string, arguments: Record<string, any> }
 */
export async function POST(request: NextRequest) {
  try {
    const { toolName, arguments: toolArguments } = await request.json();

    if (!toolName) {
      return NextResponse.json(
        { error: 'toolName is required' },
        { status: 400 }
      );
    }

    const mcpClient = getN8nMCPClient();
    agentLogger.log(`🚀 Calling MCP tool: ${toolName}`, toolArguments);

    const result = await mcpClient.callTool(toolName, toolArguments || {});

    return NextResponse.json({
      success: true,
      toolName,
      result,
      message: `MCP tool "${toolName}" executed successfully`,
    });
  } catch (error: any) {
    agentLogger.error('❌ Failed to call MCP tool:', error);
    return NextResponse.json(
      {
        error: 'Failed to call MCP tool',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

