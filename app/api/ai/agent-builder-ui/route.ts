import { NextRequest, NextResponse } from 'next/server';
import { AgentBuilderUIFactory, AgentRole } from '@/lib/ai/agent-builder-ui-factory';
import { agentLogger } from '@/lib/ai/utils/logger';

/**
 * Run Agent Builder UI Workflow
 * 
 * POST /api/ai/agent-builder-ui
 * Body: {
 *   agentRole: "planning" | "production" | "warehouse" | "purchase" | "manager" | "developer",
 *   prompt: string,
 *   context?: any
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentRole, prompt, context } = body;

    if (!agentRole || !prompt) {
      return NextResponse.json(
        { error: 'agentRole and prompt are required' },
        { status: 400 }
      );
    }

    // Validate agent role
    const validRoles: AgentRole[] = ['planning', 'production', 'warehouse', 'purchase', 'manager', 'developer'];
    if (!validRoles.includes(agentRole)) {
      return NextResponse.json(
        { error: `Invalid agentRole. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if OPENAI_API_KEY is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: 'OPENAI_API_KEY not configured',
          message: 'Please set OPENAI_API_KEY in your environment variables',
        },
        { status: 500 }
      );
    }

    agentLogger.log(`🎨 Running Agent Builder UI workflow for ${agentRole} agent...`);

    const result = await AgentBuilderUIFactory.runAgent(agentRole, prompt, context);

    return NextResponse.json({
      success: true,
      threadId: result.threadId,
      runId: result.runId,
      response: result.response,
      assistantId: result.assistantId,
      status: result.status,
      tokens: result.tokens,
      cost: result.cost,
      duration: result.duration,
      dashboardLinks: {
        thread: `https://platform.openai.com/threads/${result.threadId}`,
        traces: 'https://platform.openai.com/traces',
        agentBuilder: 'https://platform.openai.com/agent-builder',
      },
      message: 'Agent Builder UI workflow completed successfully!',
    });
  } catch (error: any) {
    agentLogger.error(`❌ Agent Builder UI workflow failed:`, error);

    return NextResponse.json(
      {
        error: 'Agent Builder UI workflow failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Get Agent Builder UI Status
 * 
 * GET /api/ai/agent-builder-ui
 */
export async function GET() {
  try {
    const agentStatus = AgentBuilderUIFactory.getAgentStatus();
    const configuredAgents = AgentBuilderUIFactory.getConfiguredAgents();

    return NextResponse.json({
      success: true,
      agentStatus,
      configuredAgents,
      configuredCount: configuredAgents.length,
      totalAgents: 6,
      openaiApiKeyConfigured: !!process.env.OPENAI_API_KEY,
      dashboardLinks: {
        agentBuilder: 'https://platform.openai.com/agent-builder',
        threads: 'https://platform.openai.com/threads',
        traces: 'https://platform.openai.com/traces',
      },
      message: `${configuredAgents.length}/6 agents configured in Agent Builder UI`,
    });
  } catch (error: any) {
    agentLogger.error(`❌ Failed to get Agent Builder UI status:`, error);

    return NextResponse.json(
      {
        error: 'Failed to get Agent Builder UI status',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

