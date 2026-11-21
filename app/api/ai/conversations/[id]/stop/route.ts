/**
 * Çalışan Conversation'ı Manuel Olarak Sonlandır
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { agentLogger } from '@/lib/ai/utils/logger';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id: conversationId } = params;

    logger.log(`🛑 Manuel conversation sonlandırma isteği: ${conversationId}`);

    const orchestrator = AgentOrchestrator.getInstance();
    
    // In-memory conversation'ı kontrol et
    const inMemoryConversation = orchestrator.getConversationHistory(conversationId);
    
    if (inMemoryConversation) {
      if (inMemoryConversation.status === 'in_progress') {
        // In-memory conversation'ı sonlandır
        inMemoryConversation.status = 'completed';
        inMemoryConversation.completedAt = new Date();
        
        logger.log(`✅ In-memory conversation ${conversationId} sonlandırıldı`);
        
        await agentLogger.log({
          action: 'conversation_manually_stopped',
          conversationId,
          agent: 'system',
          data: {
            reason: 'Manuel olarak sonlandırıldı - kullanıcı talebi',
            stoppedBy: payload.userId,
            stoppedAt: new Date().toISOString()
          }
        });
      } else {
        logger.log(`ℹ️ In-memory conversation ${conversationId} zaten ${inMemoryConversation.status} durumunda`);
      }
    } else {
      logger.log(`ℹ️ In-memory conversation ${conversationId} bulunamadı (muhtemelen zaten temizlenmiş)`);
    }

    // Database'de de kontrol et ve gerekirse sonlandır
    const adminSupabase = createAdminClient();
    
    // Zaten completed/failed log'u var mı?
    const { data: existingLog } = await adminSupabase
      .from('agent_logs')
      .select('id, action')
      .eq('conversation_id', conversationId)
      .in('action', ['conversation_completed', 'conversation_failed'])
      .limit(1)
      .single();

    if (!existingLog) {
      // Database'de sonlandırma log'u ekle
      const { error: insertError } = await adminSupabase
        .from('agent_logs')
        .insert({
          agent: 'system',
          action: 'conversation_completed',
          level: 'info',
          data: {
            conversationId: conversationId,
            reason: 'Manuel olarak sonlandırıldı - kullanıcı talebi',
            manualStop: true,
            stoppedBy: payload.userId,
            stoppedAt: new Date().toISOString()
          },
          conversation_id: conversationId,
          final_decision: 'approved',
          created_at: new Date().toISOString()
        });

      if (insertError) {
        logger.warn(`⚠️ Database'de conversation sonlandırma log'u eklenemedi: ${insertError.message}`);
      } else {
        logger.log(`✅ Database'de conversation ${conversationId} sonlandırıldı`);
      }
    } else {
      logger.log(`ℹ️ Database'de conversation ${conversationId} zaten ${existingLog.action} olarak işaretli`);
    }

    return NextResponse.json({
      success: true,
      message: `Conversation ${conversationId} sonlandırıldı`,
      conversationId,
      status: 'completed'
    });

  } catch (error: any) {
    logger.error('Conversation sonlandırma hatası:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

