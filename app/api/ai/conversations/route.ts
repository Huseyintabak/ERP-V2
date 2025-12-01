/**
 * AI Conversations API
 * Konuşma geçmişi
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
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

    // Only planlama and yonetici can view conversations
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
    let conversations: any[] = [];
    try {
      conversations = orchestrator.getAllConversations();
      logger.log(`📊 Conversations API: ${conversations.length} conversation bulundu`);
    } catch (error: any) {
      logger.error('❌ Failed to get conversations:', error);
      conversations = [];
    }

    // Sort by startedAt (newest first)
    const sortedConversations = conversations
      .sort((a, b) => {
        const timeA = a.startedAt instanceof Date ? a.startedAt.getTime() : new Date(a.startedAt).getTime();
        const timeB = b.startedAt instanceof Date ? b.startedAt.getTime() : new Date(b.startedAt).getTime();
        return timeB - timeA;
      })
      .map(conv => ({
        id: conv.id,
        prompt: conv.prompt,
        type: conv.type,
        status: conv.status,
        finalDecision: conv.protocolResult?.finalDecision || 'pending',
        startedAt: conv.startedAt instanceof Date ? conv.startedAt.toISOString() : (typeof conv.startedAt === 'string' ? conv.startedAt : new Date().toISOString()),
        completedAt: conv.completedAt ? (conv.completedAt instanceof Date ? conv.completedAt.toISOString() : (typeof conv.completedAt === 'string' ? conv.completedAt : new Date().toISOString())) : undefined,
        urgency: conv.urgency,
        severity: conv.severity,
        responses: conv.responses?.map((resp: any) => ({
          agent: resp.agent || 'Unknown',
          decision: resp.decision || 'pending',
          reasoning: resp.reasoning || 'No reasoning provided',
          confidence: resp.confidence || 0,
          timestamp: resp.timestamp || new Date().toISOString()
        })) || [],
        protocolResult: conv.protocolResult
      }));

    logger.log(`✅ Conversations API: ${sortedConversations.length} conversation hazırlandı`);

    return NextResponse.json({
      success: true,
      conversations: sortedConversations,
      count: sortedConversations.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

