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
  console.log('🔍 SON DOĞRULAMA - TÜM HAREKETLER BAĞLANTILI MI?\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Tüm malzeme tüketim hareketleri
    const { data: allMovements } = await supabase
      .from('stock_movements')
      .select('id, production_log_id, material_type')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished');

    const withLogId = allMovements?.filter(m => m.production_log_id).length || 0;
    const withoutLogId = allMovements?.filter(m => !m.production_log_id).length || 0;
    const total = allMovements?.length || 0;

    console.log('📊 MALZEME TÜKETİM HAREKETLERİ:\n');
    console.log(`   Toplam: ${total}`);
    console.log(`   ✅ production_log_id ile: ${withLogId} (${((withLogId/total)*100).toFixed(1)}%)`);
    console.log(`   ⚠️  production_log_id olmadan: ${withoutLogId} (${((withoutLogId/total)*100).toFixed(1)}%)\n`);

    // Production log'lar için malzeme hareketi durumu
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id');

    console.log(`📝 PRODUCTION LOG'LAR:\n`);
    console.log(`   Toplam log: ${allLogs?.length || 0}\n`);

    let logsWithMaterials = 0;
    let logsWithoutMaterials = 0;

    for (const log of allLogs || []) {
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('id')
        .eq('production_log_id', log.id)
        .eq('movement_type', 'uretim')
        .neq('material_type', 'finished')
        .limit(1);

      if (movements && movements.length > 0) {
        logsWithMaterials++;
      } else {
        // BOM var mı kontrol et
        const { data: bom } = await supabase
          .from('production_plan_bom_snapshot')
          .select('id')
          .eq('plan_id', log.plan_id)
          .limit(1);

        if (bom && bom.length > 0) {
          logsWithoutMaterials++;
        }
      }
    }

    console.log(`   ✅ Malzeme hareketi olan: ${logsWithMaterials}`);
    console.log(`   ⚠️  Malzeme hareketi olmayan: ${logsWithoutMaterials}\n`);

    // Tüketim toplamları
    const { data: consumptionWithLogId } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .not('production_log_id', 'is', null);

    const { data: consumptionWithoutLogId } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .is('production_log_id', null);

    const totalWithLogId = consumptionWithLogId?.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0) || 0;
    const totalWithoutLogId = consumptionWithoutLogId?.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0) || 0;

    console.log('📦 TÜKETİM TOPLAMLARI:\n');
    console.log(`   production_log_id ile: ${totalWithLogId.toFixed(2)} adet`);
    console.log(`   production_log_id olmadan: ${totalWithoutLogId.toFixed(2)} adet`);
    console.log(`   Toplam: ${(totalWithLogId + totalWithoutLogId).toFixed(2)} adet\n`);

    // Sonuç
    console.log('='.repeat(70));
    console.log('\n✅ SONUÇ:\n');

    const successRate = ((withLogId / total) * 100).toFixed(1);
    
    if (successRate >= 95) {
      console.log(`   🎉 ${successRate}% başarı oranı! Neredeyse tüm hareketler bağlantılı!\n`);
      console.log(`   ✅ Sistem tam tutarlı ve traceable!\n`);
    } else if (successRate >= 80) {
      console.log(`   ✅ ${successRate}% başarı oranı. İyi durumda!\n`);
      console.log(`   ⚠️  ${withoutLogId} hareket hala bağlantısız (muhtemelen çok eski veya farklı kaynaklı).\n`);
    } else {
      console.log(`   ⚠️  ${successRate}% başarı oranı. Daha fazla eşleştirme gerekebilir.\n`);
    }

    if (logsWithoutMaterials === 0) {
      console.log('   ✅ Tüm production log\'lar için malzeme hareketleri mevcut!\n');
    } else {
      console.log(`   ⚠️  ${logsWithoutMaterials} log için malzeme hareketi eksik!\n`);
    }

    console.log('✅ Doğrulama tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

