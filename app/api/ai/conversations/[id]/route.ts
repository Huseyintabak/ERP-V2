/**
 * AI Conversation Detail API
 * Belirli bir konuşmanın detayları
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { logger } from '@/lib/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only planlama and yonetici can view conversation details
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    let orchestrator: AgentOrchestrator;
    try {
      orchestrator = AgentOrchestrator.getInstance();
    } catch (error: any) {
      logger.error('Failed to initialize orchestrator:', error);
      return NextResponse.json(
        { 
          error: 'Failed to initialize AI system',
          details: error.message 
        },
        { status: 500 }
      );
    }
    
    const conversation = orchestrator.getConversationHistory(id);

    if (!conversation) {
      logger.warn(`⚠️ Conversation not found: ${id}`);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    logger.log(`✅ Conversation detail API: Conversation ${id} bulundu, ${conversation.responses?.length || 0} response`);

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        prompt: conversation.prompt,
        type: conversation.type,
        context: conversation.context,
        urgency: conversation.urgency,
        severity: conversation.severity,
        status: conversation.status,
        startedAt: conversation.startedAt instanceof Date ? conversation.startedAt.toISOString() : (typeof conversation.startedAt === 'string' ? conversation.startedAt : new Date().toISOString()),
        completedAt: conversation.completedAt ? (conversation.completedAt instanceof Date ? conversation.completedAt.toISOString() : (typeof conversation.completedAt === 'string' ? conversation.completedAt : new Date().toISOString())) : undefined,
        responses: conversation.responses?.map((resp: any) => ({
          agent: resp.agent || 'Unknown',
          decision: resp.decision || 'pending',
          reasoning: resp.reasoning || 'No reasoning provided',
          confidence: resp.confidence || 0,
          timestamp: resp.timestamp || new Date().toISOString()
        })) || [],
        protocolResult: conversation.protocolResult
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

