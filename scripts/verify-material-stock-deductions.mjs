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
  console.log('🔍 MALZEME STOK DÜŞÜŞLERİ DOĞRULAMA\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm production log'ları al
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced')
      .order('timestamp', { ascending: false })
      .limit(50);

    console.log(`📝 Son ${allLogs?.length || 0} production log kontrol ediliyor...\n`);

    let logsWithMaterials = 0;
    let logsWithoutMaterials = 0;
    let totalMaterialMovements = 0;
    let logsWithoutLogId = 0;

    // 2. Her log için malzeme tüketim hareketlerini kontrol et
    for (const log of allLogs || []) {
      const { data: materialMovements } = await supabase
        .from('stock_movements')
        .select('id, material_type, quantity, production_log_id')
        .eq('production_log_id', log.id)
        .eq('movement_type', 'uretim')
        .neq('material_type', 'finished');

      if (materialMovements && materialMovements.length > 0) {
        logsWithMaterials++;
        totalMaterialMovements += materialMovements.length;

        // production_log_id kontrolü
        const withoutLogId = materialMovements.filter(m => !m.production_log_id);
        if (withoutLogId.length > 0) {
          logsWithoutLogId++;
        }
      } else {
        logsWithoutMaterials++;
        
        // BOM snapshot var mı kontrol et
        const { data: bomSnapshot } = await supabase
          .from('production_plan_bom_snapshot')
          .select('id')
          .eq('plan_id', log.plan_id)
          .limit(1);

        if (bomSnapshot && bomSnapshot.length > 0) {
          console.log(`   ⚠️  Log ${log.id.substring(0, 8)}...: BOM var ama malzeme hareketi yok!`);
        }
      }
    }

    console.log('📊 SONUÇLAR:\n');
    console.log(`   ✅ Malzeme hareketi olan log: ${logsWithMaterials}`);
    console.log(`   ❌ Malzeme hareketi olmayan log: ${logsWithoutMaterials}`);
    console.log(`   📦 Toplam malzeme hareketi: ${totalMaterialMovements}`);
    console.log(`   ⚠️  production_log_id olmayan hareket: ${logsWithoutLogId}\n`);

    // 3. Tüm malzeme tüketim hareketlerini say
    const { data: allMaterialMovements } = await supabase
      .from('stock_movements')
      .select('id, material_type, production_log_id')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished');

    const withLogId = allMaterialMovements?.filter(m => m.production_log_id).length || 0;
    const withoutLogIdTotal = allMaterialMovements?.filter(m => !m.production_log_id).length || 0;

    console.log('📦 TÜM MALZEME TÜKETİM HAREKETLERİ:\n');
    console.log(`   Toplam: ${allMaterialMovements?.length || 0}`);
    console.log(`   production_log_id ile: ${withLogId}`);
    console.log(`   production_log_id olmadan: ${withoutLogIdTotal}\n`);

    // 4. Örnek plan için detaylı kontrol
    if (allLogs && allLogs.length > 0) {
      const sampleLog = allLogs.find(l => {
        // Malzeme hareketi olan bir log bul
        return true; // İlk log'u al
      });

      if (sampleLog) {
        console.log(`🔍 ÖRNEK LOG DETAYLI KONTROL: ${sampleLog.id.substring(0, 8)}...\n`);

        // Plan bilgisi
        const { data: planData } = await supabase
          .from('production_plans')
          .select('planned_quantity, product:finished_products(name)')
          .eq('id', sampleLog.plan_id)
          .single();

        if (planData) {
          console.log(`   Planlanan miktar: ${planData.planned_quantity}`);
          console.log(`   Üretilen miktar: ${sampleLog.quantity_produced}`);
          console.log(`   Ürün: ${planData.product?.name || 'Bilinmeyen'}\n`);

          // BOM snapshot
          const { data: bomSnapshot } = await supabase
            .from('production_plan_bom_snapshot')
            .select('material_type, material_id, quantity_needed, material_name')
            .eq('plan_id', sampleLog.plan_id);

          console.log(`   BOM malzeme sayısı: ${bomSnapshot?.length || 0}\n`);

          if (bomSnapshot && bomSnapshot.length > 0) {
            // Stok hareketleri
            const { data: movements } = await supabase
              .from('stock_movements')
              .select('material_type, material_id, quantity, material_name')
              .eq('production_log_id', sampleLog.id)
              .eq('movement_type', 'uretim')
              .neq('material_type', 'finished');

            console.log(`   Stok hareketi sayısı: ${movements?.length || 0}\n`);

            if (movements && movements.length > 0) {
              console.log('   Malzeme tüketimleri:\n');
              movements.forEach((m, i) => {
                console.log(`      ${i + 1}. ${m.material_name || 'Bilinmeyen'}: ${Math.abs(parseFloat(m.quantity || 0)).toFixed(2)} adet`);
              });
            } else {
              console.log('   ⚠️  Hiç malzeme tüketim hareketi yok!\n');
            }
          }
        }
      }
    }

    // 5. Sonuç ve öneriler
    console.log('='.repeat(70));
    console.log('\n✅ ÖZET:\n');

    if (logsWithoutMaterials > 0) {
      console.log(`   ⚠️  ${logsWithoutMaterials} log için malzeme tüketim hareketi eksik!\n`);
      console.log('   💡 Bu log\'lar için BOM snapshot kontrol edilmeli ve malzeme hareketleri oluşturulmalı.\n');
    } else {
      console.log('   ✅ Tüm log\'lar için malzeme hareketleri mevcut!\n');
    }

    if (withoutLogIdTotal > 0) {
      console.log(`   ⚠️  ${withoutLogIdTotal} eski malzeme hareketi production_log_id olmadan!\n`);
    } else {
      console.log('   ✅ Tüm malzeme hareketleri production_log_id ile bağlantılı!\n');
    }

    console.log('✅ Doğrulama tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

