/**
 * AI Conversation API
 * Agent'larla konuşma başlatma endpoint'i
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { agentLogger } from '@/lib/ai/utils/logger';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only planlama and yonetici can start AI conversations
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if AI is enabled
    if (process.env.AGENT_ENABLED !== 'true') {
      return NextResponse.json(
        { error: 'AI agents are not enabled' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { agentRole, prompt, type, context, urgency, severity } = body;

    // Validation
    if (!agentRole || !prompt || !type) {
      return NextResponse.json(
        { error: 'agentRole, prompt, and type are required' },
        { status: 400 }
      );
    }

    if (!['request', 'query', 'analysis', 'validation'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be one of: request, query, analysis, validation' },
        { status: 400 }
      );
    }

    // Start conversation
    const orchestrator = AgentOrchestrator.getInstance();
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.log(`🤖 Starting AI conversation: ${agentRole} - ${type}`);

    const result = await orchestrator.startConversation(agentRole, {
      id: conversationId,
      prompt,
      type,
      context: context || {},
      urgency: urgency || 'medium',
      severity: severity || 'medium'
    });

    await agentLogger.log({
      action: 'conversation_started',
      conversationId,
      agentRole,
      userId: payload.userId,
      type,
      finalDecision: result.finalDecision
    });

    return NextResponse.json({
      success: true,
      conversation: {
        id: result.conversation.id,
        status: result.conversation.status,
        finalDecision: result.finalDecision,
        protocolResult: result.protocolResult,
        startedAt: result.conversation.startedAt,
        completedAt: result.conversation.completedAt
      }
    });
  } catch (error: any) {
    logger.error('AI conversation API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

