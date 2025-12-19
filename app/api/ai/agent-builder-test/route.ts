import { NextRequest, NextResponse } from 'next/server';
import { getAgentBuilderOrchestrator } from '@/lib/ai/agent-builder-orchestrator';

/**
 * Test OpenAI Agent Builder Integration
 * 
 * POST /api/ai/agent-builder-test
 * Body: {
 *   agentRole: "planning" | "production" | "warehouse" | "purchase" | "manager" | "developer",
 *   prompt: string,
 *   type?: "request" | "query" | "analysis" | "validation",
 *   context?: any
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentRole, prompt, type = 'query', context } = body;

    if (!agentRole || !prompt) {
      return NextResponse.json(
        { error: 'agentRole and prompt are required' },
        { status: 400 }
      );
    }

    // Check if OPENAI_API_KEY is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OPENAI_API_KEY not configured',
          message: 'Please set OPENAI_API_KEY in your environment variables'
        },
        { status: 500 }
      );
    }

    console.log(`🧪 Testing Agent Builder with ${agentRole} agent...`);

    const orchestrator = getAgentBuilderOrchestrator();

    const result = await orchestrator.startConversation(agentRole, {
      id: `test_${Date.now()}`,
      prompt,
      type,
      context,
      urgency: 'medium'
    });

    // Get dashboard links
    const dashboardLinks = orchestrator.getDashboardLinks();

    return NextResponse.json({
      success: true,
      conversationId: result.conversation.id,
      finalDecision: result.finalDecision,
      agentResponse: result.conversation.responses[0],
      protocolResult: result.protocolResult,
      workflowIds: result.conversation.workflowIds,
      dashboardLinks,
      message: 'Agent Builder test successful! Check OpenAI Dashboard for traces.'
    });

  } catch (error: any) {
    console.error('❌ Agent Builder test failed:', error);

    return NextResponse.json(
      { 
        error: 'Agent Builder test failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Test Multi-Agent Conversation
 * 
 * POST /api/ai/agent-builder-test/multi
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentRoles, prompt, type = 'validation', context } = body;

    if (!agentRoles || !Array.isArray(agentRoles) || agentRoles.length === 0) {
      return NextResponse.json(
        { error: 'agentRoles array is required' },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    // Check if OPENAI_API_KEY is set
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OPENAI_API_KEY not configured',
          message: 'Please set OPENAI_API_KEY in your environment variables'
        },
        { status: 500 }
      );
    }

    console.log(`🧪 Testing Multi-Agent Builder with ${agentRoles.join(', ')} agents...`);

    const orchestrator = getAgentBuilderOrchestrator();

    const result = await orchestrator.startMultiAgentConversation(agentRoles, {
      id: `multi_test_${Date.now()}`,
      prompt,
      type,
      context,
      urgency: 'high'
    });

    // Get dashboard links
    const dashboardLinks = orchestrator.getDashboardLinks();

    return NextResponse.json({
      success: true,
      conversationId: result.conversation.id,
      finalDecision: result.finalDecision,
      agentResponses: result.conversation.responses,
      consensus: result.protocolResult.consensus,
      protocolResult: result.protocolResult,
      workflowIds: result.conversation.workflowIds,
      dashboardLinks,
      message: 'Multi-Agent test successful! Check OpenAI Dashboard for traces.'
    });

  } catch (error: any) {
    console.error('❌ Multi-Agent Builder test failed:', error);

    return NextResponse.json(
      { 
        error: 'Multi-Agent Builder test failed',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Get Agent Info and Dashboard Links
 * 
 * GET /api/ai/agent-builder-test
 */
export async function GET() {
  try {
    const orchestrator = getAgentBuilderOrchestrator();
    const agentsInfo = orchestrator.getAgentsInfo();
    const dashboardLinks = orchestrator.getDashboardLinks();

    return NextResponse.json({
      success: true,
      agents: agentsInfo,
      dashboardLinks,
      openaiApiKeyConfigured: !!process.env.OPENAI_API_KEY,
      message: 'Agent Builder is ready. Use POST to test single agent, PUT to test multi-agent.'
    });

  } catch (error: any) {
    console.error('❌ Failed to get agent info:', error);

    return NextResponse.json(
      { 
        error: 'Failed to get agent info',
        message: error.message
      },
      { status: 500 }
    );
  }
}

