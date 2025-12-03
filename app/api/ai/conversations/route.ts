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
    
    // 1. In-memory conversations'dan al (mevcut session)
    try {
      const inMemoryConversations = orchestrator.getAllConversations();
      logger.log(`📊 In-memory conversations: ${inMemoryConversations.length} conversation bulundu`);
      conversations = inMemoryConversations;
    } catch (error: any) {
      logger.error('❌ Failed to get in-memory conversations:', error);
    }

    // 2. Database'den conversation'ları al (agent_logs'tan conversation_started ve conversation_completed action'larından)
    try {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const adminSupabase = createAdminClient();
      
      // conversation_started action'larından conversation'ları bul
      const { data: conversationLogs, error: logError } = await adminSupabase
        .from('agent_logs')
        .select('*')
        .eq('action', 'conversation_started')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logError) {
        logger.warn('⚠️ Failed to get conversations from database:', logError.message);
      } else if (conversationLogs && conversationLogs.length > 0) {
        logger.log(`📊 Database conversations: ${conversationLogs.length} conversation bulundu`);
        
        // Her conversation için tam detayları al
        const dbConversations = await Promise.all(
          conversationLogs.map(async (log: any) => {
            // conversation_id'yi çeşitli yerlerden al (field'dan, data'dan, veya generate et)
            const conversationId = log.conversation_id || 
                                 log.data?.conversationId || 
                                 log.data?.conversation_id || 
                                 log.data?.id || 
                                 `conv_${log.id}`;
            
            // Bu conversation'ın tamamlanma durumunu kontrol et
            const { data: completedLogs } = await adminSupabase
              .from('agent_logs')
              .select('*')
              .eq('conversation_id', conversationId)
              .in('action', ['conversation_completed', 'conversation_failed'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            // Bu conversation'ın tüm response'larını al
            const { data: responseLogs } = await adminSupabase
              .from('agent_logs')
              .select('*')
              .eq('conversation_id', conversationId)
              .in('action', ['agent_response', 'production_log_validation', 'order_validation'])
              .order('created_at', { ascending: true });

            // Protocol result'ı bul (final_decision ve data içeren log)
            const { data: protocolLog } = await adminSupabase
              .from('agent_logs')
              .select('*')
              .eq('conversation_id', conversationId)
              .not('final_decision', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const status = completedLogs 
              ? (completedLogs.action === 'conversation_completed' ? 'completed' : 'failed')
              : 'in_progress';

            return {
              id: conversationId,
              prompt: log.data?.prompt || log.data?.request?.prompt || 'Conversation',
              type: log.data?.type || log.data?.request?.type || 'validation',
              status: status,
              finalDecision: protocolLog?.final_decision || 'pending',
              startedAt: log.created_at,
              completedAt: completedLogs?.created_at || undefined,
              urgency: log.data?.urgency || 'medium',
              severity: log.data?.severity || 'medium',
              responses: responseLogs?.map((resp: any) => ({
                agent: resp.agent || 'Unknown',
                decision: resp.data?.decision || resp.final_decision || 'pending',
                reasoning: resp.data?.reasoning || 'No reasoning provided',
                confidence: resp.data?.confidence || 0,
                timestamp: resp.created_at
              })) || [],
              protocolResult: protocolLog?.data?.protocolResult || protocolLog?.data || undefined
            };
          })
        );

        // In-memory ve database conversations'ları birleştir (duplicate'leri kaldır)
        const conversationMap = new Map<string, any>();
        
        // Önce in-memory conversations'ları ekle (daha güncel)
        conversations.forEach(conv => {
          conversationMap.set(conv.id, conv);
        });
        
        // Sonra database conversations'ları ekle (sadece yeni olanlar)
        dbConversations.forEach(conv => {
          if (!conversationMap.has(conv.id)) {
            conversationMap.set(conv.id, conv);
          }
        });
        
        conversations = Array.from(conversationMap.values());
        logger.log(`📊 Total conversations (merged): ${conversations.length}`);
      }
    } catch (error: any) {
      logger.error('❌ Failed to get conversations from database:', error);
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

