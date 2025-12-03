/**
 * Çalışan Conversation'ı Sonlandır
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

// Sonlandırılacak conversation ID
const conversationId = 'dev_report_1764761863381_6abjhc';

async function stopConversation() {
  console.log(`🛑 Conversation ${conversationId} sonlandırılıyor...\n`);

  try {
    // Bu conversation'ın zaten completed/failed log'unu kontrol et
    const { data: existingLog } = await supabase
      .from('agent_logs')
      .select('id, action')
      .eq('conversation_id', conversationId)
      .in('action', ['conversation_completed', 'conversation_failed'])
      .limit(1)
      .single();

    if (existingLog) {
      console.log(`⏭️  Conversation ${conversationId} zaten tamamlanmış (${existingLog.action})`);
      console.log(`✅ İşlem gerekmiyor, conversation zaten sonlandırılmış.`);
      return;
    }

    // Protocol result'ı kontrol et
    const { data: protocolLog } = await supabase
      .from('agent_logs')
      .select('id, final_decision, data')
      .eq('conversation_id', conversationId)
      .not('final_decision', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Conversation başlangıç log'unu bul
    const { data: startLog } = await supabase
      .from('agent_logs')
      .select('id, created_at, data')
      .eq('conversation_id', conversationId)
      .eq('action', 'conversation_started')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!startLog) {
      console.error(`❌ Conversation ${conversationId} bulunamadı!`);
      return;
    }

    // Final decision'a göre completed veya failed olarak işaretle
    // Eğer protocol result yoksa, manuel olarak "completed" olarak işaretle
    const finalDecision = protocolLog?.final_decision || 'approved';
    const action = finalDecision === 'rejected' ? 'conversation_failed' : 'conversation_completed';
    const level = finalDecision === 'rejected' ? 'warn' : 'info';

    // conversation_completed veya conversation_failed log'u ekle
    const { error: insertError } = await supabase
      .from('agent_logs')
      .insert({
        agent: 'system',
        action: action,
        level: level,
        data: {
          conversationId: conversationId,
          reason: 'Manuel olarak sonlandırıldı - kullanıcı talebi üzerine',
          finalDecision: finalDecision,
          manualStop: true,
          stoppedAt: new Date().toISOString(),
          originalStartTime: startLog?.created_at || null
        },
        conversation_id: conversationId,
        final_decision: finalDecision,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error(`❌ Conversation ${conversationId} sonlandırılamadı:`, insertError.message);
      return;
    }

    console.log(`✅ Conversation ${conversationId} başarıyla ${action} olarak işaretlendi`);
    console.log(`   Final Decision: ${finalDecision}`);
    console.log(`   Durum: ${action}`);
    console.log(`   Sebep: Manuel olarak sonlandırıldı (kullanıcı talebi)`);

  } catch (error) {
    console.error(`❌ Conversation ${conversationId} sonlandırılırken hata:`, error.message);
  }
}

// Script'i çalıştır
stopConversation()
  .then(() => {
    console.log('\n✨ Script başarıyla tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

