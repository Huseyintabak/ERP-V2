/**
 * Belirli Conversation'ları Tamamlandı Olarak İşaretle
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

// Tamamlanacak conversation ID'leri
const conversationIds = [
  'production_log_caf885ec-d4b7-40a2-a4c9-c4bed0c36d71_1764759075704',
  'production_log_caf885ec-d4b7-40a2-a4c9-c4bed0c36d71_1764759228994',
  'production_log_caf885ec-d4b7-40a2-a4c9-c4bed0c36d71_1764759621488',
  'production_log_caf885ec-d4b7-40a2-a4c9-c4bed0c36d71_1764759791412',
  'production_log_196d74de-9b00-4b28-8a25-09d590d10b60_1764759811321',
  'dev_report_1764761863381_6abjhc'
];

async function markConversationsCompleted() {
  console.log(`🔍 ${conversationIds.length} conversation işaretleniyor...\n`);

  let completed = 0;
  let skipped = 0;

  for (const conversationId of conversationIds) {
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
        console.log(`⏭️  Conversation ${conversationId.substring(0, 30)}... zaten tamamlanmış (${existingLog.action})`);
        skipped++;
        continue;
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

      // Final decision'a göre completed veya failed olarak işaretle
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
            reason: 'Manuel olarak tamamlandı olarak işaretlendi',
            finalDecision: finalDecision,
            autoFixed: true,
            fixedAt: new Date().toISOString(),
            originalStartTime: startLog?.created_at || null
          },
          conversation_id: conversationId,
          final_decision: finalDecision,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error(`❌ Conversation ${conversationId.substring(0, 30)}... işaretlenemedi:`, insertError.message);
      } else {
        completed++;
        console.log(`✅ Conversation ${conversationId.substring(0, 30)}... ${action} olarak işaretlendi`);
      }

    } catch (error) {
      console.error(`❌ Conversation ${conversationId.substring(0, 30)}... işaretlenirken hata:`, error.message);
    }
  }

  console.log(`\n✅ İşlem tamamlandı!`);
  console.log(`   - ${completed} conversation tamamlandı olarak işaretlendi`);
  console.log(`   - ${skipped} conversation zaten tamamlanmış (atlandı)`);
  console.log(`   - Toplam ${completed + skipped}/${conversationIds.length} conversation işlendi`);
}

// Script'i çalıştır
markConversationsCompleted()
  .then(() => {
    console.log('\n✨ Script başarıyla tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

