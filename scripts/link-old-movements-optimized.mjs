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
  console.log('🔗 ESKİ HAREKETLERİ PRODUCTION LOG\'LARA BAĞLIYOR (Optimize)\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm production log'ları al (timestamp'e göre)
    console.log('📝 Production log\'lar yükleniyor...\n');
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced, timestamp, operator_id')
      .order('timestamp', { ascending: true });

    console.log(`   ${allLogs?.length || 0} log bulundu\n`);

    // 2. Her log için beklenen tüketim miktarlarını hesapla ve cache'le
    console.log('🔍 Log\'lar için beklenen tüketimler hesaplanıyor...\n');
    const logExpectedConsumptions = new Map();

    for (const log of allLogs || []) {
      const { data: planData } = await supabase
        .from('production_plans')
        .select('planned_quantity')
        .eq('id', log.plan_id)
        .single();

      if (!planData) continue;

      const plannedQty = parseFloat(planData.planned_quantity || 1);
      const producedQty = parseFloat(log.quantity_produced || 0);

      if (plannedQty <= 0 || producedQty <= 0) continue;

      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('material_type, material_id, quantity_needed')
        .eq('plan_id', log.plan_id);

      if (!bomSnapshot || bomSnapshot.length === 0) continue;

      const expected = new Map();
      bomSnapshot.forEach(bom => {
        const consumption = (bom.quantity_needed / plannedQty) * producedQty;
        const key = `${bom.material_type}_${bom.material_id}`;
        expected.set(key, consumption);
      });

      logExpectedConsumptions.set(log.id, {
        log,
        expected,
        timestamp: new Date(log.timestamp).getTime()
      });
    }

    console.log(`   ${logExpectedConsumptions.size} log için tüketim hesaplandı\n`);

    // 3. production_log_id olmayan eski hareketleri al
    console.log('📦 Eski hareketler yükleniyor...\n');
    const { data: oldMovements } = await supabase
      .from('stock_movements')
      .select('id, material_type, material_id, quantity, created_at, user_id')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .is('production_log_id', null)
      .order('created_at', { ascending: true });

    console.log(`   ${oldMovements?.length || 0} eski hareket bulundu\n`);
    console.log('🔍 Eşleştirme yapılıyor...\n');

    let linkedCount = 0;
    let processedCount = 0;
    const processedMovementIds = new Set();

    // 4. Her log için, o zaman dilimindeki uygun hareketleri bul ve eşleştir
    for (const [logId, logData] of logExpectedConsumptions) {
      const { log, expected, timestamp } = logData;
      const timeWindow = 2 * 60 * 60 * 1000; // 2 saat penceresi

      // Bu log'un zaman penceresindeki hareketleri bul
      const candidateMovements = oldMovements?.filter(movement => {
        if (processedMovementIds.has(movement.id)) return false;

        const movementTime = new Date(movement.created_at).getTime();
        const timeDiff = Math.abs(movementTime - timestamp);
        
        if (timeDiff > timeWindow) return false;
        if (movement.user_id !== log.operator_id) return false;

        const key = `${movement.material_type}_${movement.material_id}`;
        const expectedQty = expected.get(key);
        
        if (!expectedQty) return false;

        const movementQty = Math.abs(parseFloat(movement.quantity || 0));
        const tolerance = 0.05; // %5 tolerans

        return Math.abs(movementQty - expectedQty) <= (expectedQty * tolerance);
      }) || [];

      // Eğer bu log için beklenen tüm malzemeler eşleşiyorsa, bağla
      if (candidateMovements.length >= expected.size * 0.8) { // En az %80 eşleşme
        for (const movement of candidateMovements) {
          const key = `${movement.material_type}_${movement.material_id}`;
          if (expected.has(key)) {
            // Güncelle
            const { error: updateError } = await supabase
              .from('stock_movements')
              .update({ production_log_id: logId })
              .eq('id', movement.id)
              .is('production_log_id', null);

            if (!updateError) {
              linkedCount++;
              processedMovementIds.add(movement.id);
            }
          }
        }

        if (linkedCount % 50 === 0) {
          console.log(`   ✅ ${linkedCount} hareket bağlantılandırıldı...`);
        }
      }

      processedCount++;
      if (processedCount % 50 === 0) {
        console.log(`   📊 ${processedCount}/${logExpectedConsumptions.size} log işlendi...`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Bağlantılandırılan: ${linkedCount}`);
    console.log(`   ⚠️  Kalan eşleşmeyen: ${(oldMovements?.length || 0) - linkedCount}\n`);

    // Doğrulama
    console.log('🔍 Doğrulama yapılıyor...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: remainingOld } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .is('production_log_id', null);

    const { data: withLogId } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .not('production_log_id', 'is', null);

    console.log(`   📦 production_log_id ile hareket: ${withLogId?.length || 0}`);
    console.log(`   📦 Kalan production_log_id olmayan: ${remainingOld?.length || 0}\n`);

    if (linkedCount > 0) {
      console.log('   🎉 Eski hareketler production log\'lara bağlantılandırıldı!\n');
    }

    console.log('✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

