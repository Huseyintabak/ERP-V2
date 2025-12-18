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
  { params }: { params: { id: string } }
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

    const { id } = params;
    let conversation: any = null;

    // 1. Önce in-memory'den kontrol et
    try {
      const orchestrator = AgentOrchestrator.getInstance();
      conversation = orchestrator.getConversationHistory(id);
      if (conversation) {
        logger.log(`✅ Conversation detail API: Conversation ${id} bulundu (in-memory), ${conversation.responses?.length || 0} response`);
      }
    } catch (error: any) {
      logger.warn('⚠️ Orchestrator not available, trying database:', error.message);
    }

    // 2. Eğer in-memory'de yoksa database'den çek
    if (!conversation) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/server');
        const adminSupabase = createAdminClient();

        // Conversation başlangıç log'unu bul
        const { data: conversationLog, error: logError } = await adminSupabase
          .from('agent_logs')
          .select('*')
          .eq('conversation_id', id)
          .eq('action', 'conversation_started')
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (logError || !conversationLog) {
          logger.warn(`⚠️ Conversation not found in database: ${id}`);
          return NextResponse.json(
            { error: 'Conversation not found' },
            { status: 404 }
          );
        }

        // Conversation'ın tamamlanma durumunu kontrol et
        const { data: completedLogs } = await adminSupabase
          .from('agent_logs')
          .select('*')
          .eq('conversation_id', id)
          .in('action', ['conversation_completed', 'conversation_failed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Tüm response'ları al
        const { data: responseLogs } = await adminSupabase
          .from('agent_logs')
          .select('*')
          .eq('conversation_id', id)
          .in('action', ['agent_response', 'production_log_validation', 'order_validation', 'conversation_started'])
          .order('created_at', { ascending: true });

        // Protocol result'ı bul
        const { data: protocolLog } = await adminSupabase
          .from('agent_logs')
          .select('*')
          .eq('conversation_id', id)
          .not('final_decision', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const status = completedLogs 
          ? (completedLogs.action === 'conversation_completed' ? 'completed' : 'failed')
          : 'in_progress';

        conversation = {
          id: id,
          prompt: conversationLog.data?.prompt || conversationLog.data?.request?.prompt || 'Conversation',
          type: conversationLog.data?.type || conversationLog.data?.request?.type || 'validation',
          context: conversationLog.data?.context || conversationLog.data?.request?.context || {},
          urgency: conversationLog.data?.urgency || 'medium',
          severity: conversationLog.data?.severity || 'medium',
          status: status,
          startedAt: conversationLog.created_at,
          completedAt: completedLogs?.created_at || undefined,
          responses: responseLogs?.map((resp: any) => ({
            agent: resp.agent || 'Unknown',
            decision: resp.data?.decision || resp.final_decision || 'pending',
            reasoning: resp.data?.reasoning || 'No reasoning provided',
            confidence: resp.data?.confidence || 0,
            timestamp: resp.created_at
          })) || [],
          protocolResult: protocolLog?.data?.protocolResult || protocolLog?.data || undefined
        };

        logger.log(`✅ Conversation detail API: Conversation ${id} bulundu (database), ${conversation.responses?.length || 0} response`);
      } catch (error: any) {
        logger.error('❌ Failed to get conversation from database:', error);
        return NextResponse.json(
          { error: 'Failed to fetch conversation details', details: error.message },
          { status: 500 }
        );
      }
    }

    // 3. Conversation'ı formatla ve döndür
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

