/**
 * In-Progress Conversation'ları Tamamla
 * Açık kalan conversation'ları otomatik olarak completed/failed durumuna geçir
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixInProgressConversations() {
  console.log('🔍 Açık conversation\'lar kontrol ediliyor...\n');

  try {
    // 1. conversation_started action'larından tüm conversation ID'leri bul
    const { data: startedConversations, error: startedError } = await supabase
      .from('agent_logs')
      .select('conversation_id, created_at, data')
      .eq('action', 'conversation_started')
      .order('created_at', { ascending: false });

    if (startedError) {
      throw new Error(`Failed to fetch started conversations: ${startedError.message}`);
    }

    console.log(`📊 Toplam ${startedConversations.length} conversation_started log'u bulundu\n`);

    // 2. Her conversation için tamamlanma durumunu kontrol et
    const inProgressConversations = [];
    
    for (const startedLog of startedConversations) {
      const conversationId = startedLog.conversation_id || startedLog.data?.conversationId || startedLog.data?.id;
      
      if (!conversationId) {
        continue;
      }

      // Bu conversation'ın completed/failed log'unu kontrol et
      const { data: completedLogs } = await supabase
        .from('agent_logs')
        .select('id, action, created_at')
        .eq('conversation_id', conversationId)
        .in('action', ['conversation_completed', 'conversation_failed'])
        .limit(1)
        .single();

      if (!completedLogs) {
        // Tamamlanma log'u yok - in_progress
        const startedAt = new Date(startedLog.created_at);
        const now = new Date();
        const hoursAgo = (now - startedAt) / (1000 * 60 * 60);

        // Eğer 1 saatten eski ise ve protocol result varsa, tamamlanmış say
        const { data: protocolLog } = await supabase
          .from('agent_logs')
          .select('id, final_decision, data')
          .eq('conversation_id', conversationId)
          .not('final_decision', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (protocolLog) {
          // Protocol result var - conversation tamamlanmış ama log eksik
          inProgressConversations.push({
            conversationId,
            startedAt: startedLog.created_at,
            hoursAgo: hoursAgo.toFixed(2),
            finalDecision: protocolLog.final_decision,
            hasProtocolResult: true
          });
        } else if (hoursAgo > 1) {
          // 1 saatten eski ve protocol result yok - failed olarak işaretle
          inProgressConversations.push({
            conversationId,
            startedAt: startedLog.created_at,
            hoursAgo: hoursAgo.toFixed(2),
            finalDecision: null,
            hasProtocolResult: false
          });
        }
      }
    }

    console.log(`⚠️  ${inProgressConversations.length} açık conversation bulundu:\n`);

    if (inProgressConversations.length === 0) {
      console.log('✅ Tüm conversation\'lar tamamlanmış görünüyor!');
      return;
    }

    // 3. Açık conversation'ları tamamla
    let completed = 0;
    let failed = 0;

    for (const conv of inProgressConversations) {
      const action = conv.finalDecision === 'rejected' || !conv.hasProtocolResult
        ? 'conversation_failed'
        : 'conversation_completed';

      // conversation_completed veya conversation_failed log'u ekle
      const { error: insertError } = await supabase
        .from('agent_logs')
        .insert({
          agent: 'system',
          action: action,
          level: action === 'conversation_failed' ? 'warn' : 'info',
          data: {
            conversationId: conv.conversationId,
            reason: conv.hasProtocolResult 
              ? 'Protocol result var ama completion log eksikti - otomatik tamamlandı'
              : '1 saatten eski ve protocol result yok - otomatik failed olarak işaretlendi',
            autoFixed: true,
            fixedAt: new Date().toISOString()
          },
          conversation_id: conv.conversationId,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`❌ Conversation ${conv.conversationId} tamamlanamadı:`, insertError.message);
      } else {
        if (action === 'conversation_completed') {
          completed++;
          console.log(`✅ Conversation ${conv.conversationId.substring(0, 20)}... completed olarak işaretlendi`);
        } else {
          failed++;
          console.log(`⚠️  Conversation ${conv.conversationId.substring(0, 20)}... failed olarak işaretlendi`);
        }
      }
    }

    console.log(`\n✅ İşlem tamamlandı!`);
    console.log(`   - ${completed} conversation completed olarak işaretlendi`);
    console.log(`   - ${failed} conversation failed olarak işaretlendi`);
    console.log(`   - Toplam ${completed + failed} conversation düzeltildi`);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

// Script'i çalıştır
fixInProgressConversations()
  .then(() => {
    console.log('\n✨ Script başarıyla tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

