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

(async () => {
  console.log('🔗 ESKİ HAREKETLERİ PRODUCTION LOG\'LARA BAĞLIYOR\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Tüm production log'ları al (tarih sırasına göre)
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced, timestamp, operator_id')
      .order('timestamp', { ascending: true });

    console.log(`📝 Toplam ${allLogs?.length || 0} production log bulundu\n`);

    // production_log_id olmayan eski hareketleri al
    const { data: oldMovements } = await supabase
      .from('stock_movements')
      .select('id, material_type, material_id, quantity, created_at, user_id')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .is('production_log_id', null)
      .order('created_at', { ascending: true });

    console.log(`📦 production_log_id olmayan eski hareket: ${oldMovements?.length || 0}\n`);
    console.log('🔍 Eşleştirme yapılıyor...\n');

    let linkedCount = 0;
    let unmatchedCount = 0;

    // Her log için, o zaman dilimindeki ve plan'a uygun hareketleri bul
    for (const log of allLogs || []) {
      // Plan bilgisini al
      const { data: planData } = await supabase
        .from('production_plans')
        .select('planned_quantity')
        .eq('id', log.plan_id)
        .single();

      if (!planData) continue;

      const plannedQty = parseFloat(planData.planned_quantity || 1);
      const producedQty = parseFloat(log.quantity_produced || 0);

      // BOM snapshot'ı al
      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('material_type, material_id, quantity_needed')
        .eq('plan_id', log.plan_id);

      if (!bomSnapshot || bomSnapshot.length === 0) continue;

      // Bu log için beklenen tüketim miktarları
      const expectedConsumptions = new Map();
      bomSnapshot.forEach(bom => {
        const consumption = (bom.quantity_needed / plannedQty) * producedQty;
        const key = `${bom.material_type}_${bom.material_id}`;
        expectedConsumptions.set(key, consumption);
      });

      // Bu log'un timestamp'ine yakın ve uygun hareketleri bul
      const logTime = new Date(log.timestamp);
      const timeWindow = 60 * 60 * 1000; // 1 saat penceresi

      const matchingMovements = oldMovements?.filter(movement => {
        const movementTime = new Date(movement.created_at);
        const timeDiff = Math.abs(movementTime.getTime() - logTime.getTime());
        
        if (timeDiff > timeWindow) return false;
        if (movement.user_id !== log.operator_id) return false; // Aynı operatör olmalı

        const key = `${movement.material_type}_${movement.material_id}`;
        const expectedQty = expectedConsumptions.get(key);
        
        if (!expectedQty) return false;

        const movementQty = Math.abs(parseFloat(movement.quantity || 0));
        const tolerance = 0.1; // %10 tolerans

        return Math.abs(movementQty - expectedQty) <= (expectedQty * tolerance);
      }) || [];

      // Eşleşen hareketleri production_log_id ile güncelle
      for (const movement of matchingMovements) {
        // Bu hareket için zaten production_log_id var mı kontrol et
        const { data: existing } = await supabase
          .from('stock_movements')
          .select('production_log_id')
          .eq('id', movement.id)
          .single();

        if (existing?.production_log_id) {
          continue; // Zaten bağlantılı
        }

        // Güncelle
        const { error: updateError } = await supabase
          .from('stock_movements')
          .update({ production_log_id: log.id })
          .eq('id', movement.id)
          .is('production_log_id', null);

        if (!updateError) {
          linkedCount++;
        }
      }

      if (linkedCount > 0 && linkedCount % 50 === 0) {
        console.log(`   ✅ ${linkedCount} hareket bağlantılandırıldı...`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Bağlantılandırılan: ${linkedCount}`);
    console.log(`   ⚠️  Eşleşmeyen: ${oldMovements?.length - linkedCount || 0}\n`);

    // Doğrulama
    console.log('🔍 Doğrulama yapılıyor...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: remainingOld } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .is('production_log_id', null);

    console.log(`   📦 Kalan production_log_id olmayan hareket: ${remainingOld?.length || 0}\n`);

    if (linkedCount > 0) {
      console.log('   💡 Bazı eski hareketler production log\'lara bağlantılandırıldı!\n');
    }

    console.log('✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

