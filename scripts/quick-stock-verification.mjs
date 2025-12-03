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

async function quickVerification() {
  console.log('🔍 Hızlı Stok Doğrulama\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Production logs sayısı
    const { count: logsCount } = await supabase
      .from('production_logs')
      .select('*', { count: 'exact', head: true });

    // 2. Üretim stok hareketleri sayısı (finished)
    const { count: finishedMovementsCount } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim');

    // 3. Malzeme tüketim hareketleri sayısı (raw/semi)
    const { count: consumptionMovementsCount } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .in('material_type', ['raw', 'semi']);

    console.log('📊 GENEL İSTATİSTİKLER:\n');
    console.log(`   Production Logs: ${logsCount || 0} adet`);
    console.log(`   Nihai Ürün Stok Hareketleri: ${finishedMovementsCount || 0} adet`);
    console.log(`   Malzeme Tüketim Hareketleri: ${consumptionMovementsCount || 0} adet\n`);

    // 4. Production plans ile log karşılaştırması
    const { data: plansWithLogs } = await supabase
      .from('production_plans')
      .select(`
        id,
        produced_quantity,
        logs:production_logs(count)
      `)
      .gt('produced_quantity', 0)
      .limit(100);

    const plansCount = plansWithLogs?.length || 0;
    console.log(`📋 Üretim Yapılmış Plan Sayısı: ${plansCount} adet\n`);

    // 5. Örnek plan kontrolü - son 5 plan
    console.log('🔍 SON 5 PLAN KONTROLÜ:\n');

    const { data: recentPlans } = await supabase
      .from('production_plans')
      .select(`
        id,
        produced_quantity,
        status,
        order:orders(order_number),
        product:finished_products(name, code)
      `)
      .gt('produced_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentPlans && recentPlans.length > 0) {
      for (const plan of recentPlans) {
        const planId = plan.id;

        // Production log kontrol
        const { count: logCount } = await supabase
          .from('production_logs')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', planId);

        // Nihai ürün hareketi kontrol
        const { count: finishedCount } = await supabase
          .from('stock_movements')
          .select('*', { count: 'exact', head: true })
          .eq('material_id', plan.product_id)
          .eq('material_type', 'finished')
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${planId}%,description.ilike.%plan #${planId}%`);

        // BOM snapshot kontrol
        const { count: bomCount } = await supabase
          .from('production_plan_bom_snapshot')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', planId);

        // Malzeme hareketi kontrol (hızlı - sadece count)
        let materialMovementCount = 0;
        if (bomCount > 0) {
          const { data: bomItems } = await supabase
            .from('production_plan_bom_snapshot')
            .select('material_id, material_type')
            .eq('plan_id', planId)
            .limit(1);

          if (bomItems && bomItems.length > 0) {
            const bomItem = bomItems[0];
            const { count } = await supabase
              .from('stock_movements')
              .select('*', { count: 'exact', head: true })
              .eq('material_id', bomItem.material_id)
              .eq('material_type', bomItem.material_type)
              .eq('movement_type', 'uretim')
              .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Son 30 gün

            materialMovementCount = count || 0;
          }
        }

        const status = {
          logs: logCount > 0 ? '✅' : '❌',
          finished: finishedCount > 0 ? '✅' : '❌',
          bom: bomCount > 0 ? '✅' : '❌',
          materials: materialMovementCount > 0 ? '✅' : '❌'
        };

        console.log(`Plan #${planId.substring(0, 8)}...`);
        console.log(`   Ürün: ${plan.product?.name || 'N/A'} (${plan.order?.order_number || 'N/A'})`);
        console.log(`   Üretilen: ${plan.produced_quantity} adet`);
        console.log(`   Logs: ${status.logs} (${logCount})`);
        console.log(`   Nihai Ürün Hareketi: ${status.finished} (${finishedCount})`);
        console.log(`   BOM Snapshot: ${status.bom} (${bomCount} malzeme)`);
        console.log(`   Malzeme Hareketleri: ${status.materials}`);
        
        if (status.logs === '✅' && status.finished === '✅' && status.bom === '✅' && status.materials === '❌') {
          console.log(`   ⚠️  UYARI: Stok hareketleri eksik olabilir!`);
        }
        console.log();
      }
    }

    // 6. Stok tutarlılık kontrolü (örnek 10 malzeme)
    console.log('📊 STOK TUTARLILIK KONTROLÜ (Örnek 10 Malzeme):\n');

    const { data: sampleMaterials } = await supabase
      .from('raw_materials')
      .select('id, code, name, quantity')
      .limit(10);

    if (sampleMaterials && sampleMaterials.length > 0) {
      let allOk = true;
      for (const material of sampleMaterials) {
        // Son 10 hareketi al
        const { data: recentMovements } = await supabase
          .from('stock_movements')
          .select('quantity, movement_type, created_at')
          .eq('material_id', material.id)
          .eq('material_type', 'raw')
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentMovements && recentMovements.length > 0) {
          // Son hareketin after_quantity'sini kontrol et
          const lastMovement = recentMovements[0];
          const { data: lastMovementDetail } = await supabase
            .from('stock_movements')
            .select('after_quantity')
            .eq('id', lastMovement.id)
            .single();

          if (lastMovementDetail && lastMovementDetail.after_quantity !== null) {
            const calculatedStock = parseFloat(lastMovementDetail.after_quantity);
            const actualStock = parseFloat(material.quantity);
            const diff = Math.abs(calculatedStock - actualStock);

            if (diff > 0.1) {
              console.log(`   ⚠️  ${material.name}: Gerçek=${actualStock.toFixed(2)}, Son Hareket After=${calculatedStock.toFixed(2)} (Fark: ${diff.toFixed(2)})`);
              allOk = false;
            }
          }
        }
      }

      if (allOk) {
        console.log('   ✅ Kontrol edilen malzemeler tutarlı görünüyor.\n');
      }
    }

    console.log('='.repeat(70));
    console.log('\n💡 Detaylı kontrol için:');
    console.log('   node scripts/check-plan-stock-status.mjs [PLAN_ID]\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

quickVerification();

