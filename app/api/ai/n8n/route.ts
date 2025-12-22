import { NextRequest, NextResponse } from 'next/server';
import { getN8nClient } from '@/lib/ai/n8n-client';
import { agentLogger } from '@/lib/ai/utils/logger';

/**
 * n8n AI Agent Workflows
 * 
 * POST /api/ai/n8n
 * Body: {
 *   workflow: "planning" | "production" | "warehouse" | "purchase" | "manager" | "developer" | "multi-agent" | "custom",
 *   prompt: string,
 *   context?: any
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflow, prompt, context, agentRoles, customWebhookPath } = body;

    if (!workflow || !prompt) {
      return NextResponse.json(
        { error: 'workflow and prompt are required' },
        { status: 400 }
      );
    }

    // Check if n8n is configured
    if (!process.env.N8N_WEBHOOK_URL) {
      return NextResponse.json(
        {
          error: 'N8N_WEBHOOK_URL not configured',
          message: 'Please set N8N_WEBHOOK_URL in your environment variables (e.g., http://localhost:5678)',
        },
        { status: 500 }
      );
    }

    agentLogger.log(`🔧 Running n8n workflow: ${workflow}`);

    const client = getN8nClient();
    let result;

    switch (workflow) {
      case 'planning':
        result = await client.runPlanningAgent(prompt, context);
        break;

      case 'production':
        result = await client.runProductionAgent(prompt, context);
        break;

      case 'warehouse':
        result = await client.runWarehouseAgent(prompt, context);
        break;

      case 'purchase':
        result = await client.runPurchaseAgent(prompt, context);
        break;

      case 'manager':
        result = await client.runManagerAgent(prompt, context);
        break;

      case 'developer':
        result = await client.runDeveloperAgent(prompt, context);
        break;

      case 'multi-agent':
        if (!agentRoles || !Array.isArray(agentRoles)) {
          return NextResponse.json(
            { error: 'agentRoles array is required for multi-agent workflow' },
            { status: 400 }
          );
        }
        result = await client.runMultiAgentConsensus(prompt, agentRoles, context);
        break;

      case 'custom':
        if (!customWebhookPath) {
          return NextResponse.json(
            { error: 'customWebhookPath is required for custom workflow' },
            { status: 400 }
          );
        }
        result = await client.runCustomWorkflow(customWebhookPath, { prompt, ...context });
        break;

      default:
        return NextResponse.json(
          { error: `Unknown workflow: ${workflow}. Must be one of: planning, production, warehouse, purchase, manager, developer, multi-agent, custom` },
          { status: 400 }
        );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'n8n workflow failed',
          message: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workflow,
      result: result.data,
      n8nDashboard: `${process.env.N8N_WEBHOOK_URL?.replace('/webhook', '')}/workflow`,
      message: 'n8n workflow completed successfully!',
    });
  } catch (error: any) {
    agentLogger.error(`❌ n8n API failed:`, error);

    return NextResponse.json(
      {
        error: 'n8n API failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Get n8n status
 * 
 * GET /api/ai/n8n
 */
export async function GET() {
  try {
    const client = getN8nClient();
    const isHealthy = await client.healthCheck();

    return NextResponse.json({
      success: true,
      n8nConfigured: !!process.env.N8N_WEBHOOK_URL,
      n8nUrl: process.env.N8N_WEBHOOK_URL || 'Not configured',
      n8nHealthy: isHealthy,
      availableWorkflows: [
        'planning',
        'production',
        'warehouse',
        'purchase',
        'manager',
        'developer',
        'multi-agent',
        'custom'
      ],
      message: isHealthy
        ? 'n8n is running and healthy'
        : 'n8n is not responding (check if n8n is running on ' + (process.env.N8N_WEBHOOK_URL || 'http://localhost:5678') + ')',
    });
  } catch (error: any) {
    agentLogger.error(`❌ n8n status check failed:`, error);

    return NextResponse.json(
      {
        error: 'n8n status check failed',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

