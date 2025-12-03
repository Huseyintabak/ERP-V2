import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyTriggers() {
  console.log('🔍 PRODUCTION TRIGGER KONTROLÜ\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Trigger'ları kontrol et (SQL ile)
    const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          trigger_name,
          event_manipulation,
          action_timing,
          action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'production_logs'
          AND trigger_name IN (
            'trigger_update_stock_on_production',
            'trigger_consume_materials_on_production'
          )
        ORDER BY trigger_name;
      `
    });

    if (triggerError) {
      // RPC yoksa direkt SQL sorgusu yap
      console.log('⚠️  RPC kullanılamıyor, manuel kontrol gerekli.\n');
      console.log('📋 Lütfen aşağıdaki SQL sorgusunu Supabase Dashboard\'da çalıştırın:\n');
      console.log(`
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'production_logs'
  AND trigger_name IN (
    'trigger_update_stock_on_production',
    'trigger_consume_materials_on_production'
  );
      `);
    } else {
      console.log('📊 TRIGGER DURUMU:\n');
      if (triggers && triggers.length > 0) {
        triggers.forEach(trigger => {
          console.log(`✅ ${trigger.trigger_name}`);
          console.log(`   Event: ${trigger.event_manipulation}`);
          console.log(`   Timing: ${trigger.action_timing}\n`);
        });
      } else {
        console.log('❌ Trigger\'lar bulunamadı!\n');
      }
    }

    // Function'ları kontrol et
    console.log('📊 FUNCTION DURUMU:\n');

    const functions = ['update_stock_on_production', 'consume_materials_on_production'];
    
    for (const funcName of functions) {
      const { data: func, error: funcError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', funcName)
        .single();

      if (funcError) {
        // pg_proc direkt erişilemez, RPC kullan
        console.log(`   ⚠️  ${funcName}: Kontrol edilemedi (RPC gerekli)`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 ÖNERİLER:\n');
    console.log('   1. FIX-PRODUCTION-STOCK-TRIGGERS-ROBUST.sql dosyasını Supabase Dashboard\'da çalıştırın');
    console.log('   2. Trigger\'ların aktif olduğundan emin olun');
    console.log('   3. Test production log oluşturup stok hareketlerini kontrol edin\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

verifyTriggers();

