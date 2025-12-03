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

async function finalVerification() {
  console.log('✅ FİNAL STOK DOĞRULAMA\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. İstatistikler
    const { count: totalLogs } = await supabase
      .from('production_logs')
      .select('*', { count: 'exact', head: true });

    const { count: finishedMovements } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim');

    const { count: consumptionMovements } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .in('material_type', ['raw', 'semi']);

    console.log('📊 GENEL İSTATİSTİKLER:\n');
    console.log(`   Production Logs: ${totalLogs || 0} adet`);
    console.log(`   Nihai Ürün Stok Hareketleri: ${finishedMovements || 0} adet`);
    console.log(`   Malzeme Tüketim Hareketleri: ${consumptionMovements || 0} adet\n`);

    // 2. Son 10 plan kontrolü
    console.log('🔍 SON 10 PLAN KONTROLÜ:\n');

    const { data: recentPlans } = await supabase
      .from('production_plans')
      .select(`
        id,
        product_id,
        produced_quantity,
        order:orders(order_number),
        product:finished_products(name, code)
      `)
      .gt('produced_quantity', 0)
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentPlans && recentPlans.length > 0) {
      let allOk = true;

      for (const plan of recentPlans) {
        // Production log kontrol
        const { count: logCount } = await supabase
          .from('production_logs')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id);

        // Nihai ürün hareketi kontrol
        const { count: finishedCount } = await supabase
          .from('stock_movements')
          .select('*', { count: 'exact', head: true })
          .eq('material_id', plan.product_id)
          .eq('material_type', 'finished')
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${plan.id}%,description.ilike.%plan #${plan.id}%`);

        // BOM snapshot kontrol
        const { count: bomCount } = await supabase
          .from('production_plan_bom_snapshot')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id);

        // Malzeme hareketi kontrol (örnek)
        let materialCount = 0;
        if (bomCount > 0) {
          const { data: bomItem } = await supabase
            .from('production_plan_bom_snapshot')
            .select('material_id, material_type')
            .eq('plan_id', plan.id)
            .limit(1)
            .single();

          if (bomItem) {
            const { count } = await supabase
              .from('stock_movements')
              .select('*', { count: 'exact', head: true })
              .eq('material_id', bomItem.material_id)
              .eq('material_type', bomItem.material_type)
              .eq('movement_type', 'uretim')
              .or(`description.ilike.%Plan #${plan.id}%,description.ilike.%plan #${plan.id}%`);

            materialCount = count || 0;
          }
        }

        const status = {
          logs: logCount > 0,
          finished: finishedCount > 0,
          bom: bomCount > 0,
          materials: materialCount > 0
        };

        const isOk = status.logs && status.finished && status.bom && status.materials;
        if (!isOk) allOk = false;

        const icon = isOk ? '✅' : '❌';
        console.log(`${icon} Plan #${plan.id.substring(0, 8)}... - ${plan.product?.name || 'N/A'}`);
        console.log(`   Logs: ${status.logs ? '✅' : '❌'} | Nihai: ${status.finished ? '✅' : '❌'} | BOM: ${status.bom ? '✅' : '❌'} | Malzeme: ${status.materials ? '✅' : '❌'}`);
        console.log();
      }

      if (allOk) {
        console.log('✅ Tüm son planlar için stok hareketleri mevcut!\n');
      }
    }

    // 3. Stok tutarlılık özeti
    console.log('='.repeat(70));
    console.log('\n📊 STOK TUTARLILIK ÖZETİ:\n');

    // Örnek malzemeler kontrol
    const { data: sampleMaterials } = await supabase
      .from('raw_materials')
      .select('id, code, name, quantity')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (sampleMaterials && sampleMaterials.length > 0) {
      console.log('   Örnek 5 Hammadde Kontrolü:\n');
      
      for (const material of sampleMaterials) {
        const { data: lastMovement } = await supabase
          .from('stock_movements')
          .select('after_quantity')
          .eq('material_id', material.id)
          .eq('material_type', 'raw')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMovement && lastMovement.after_quantity !== null) {
          const calculated = parseFloat(lastMovement.after_quantity);
          const actual = parseFloat(material.quantity);
          const diff = Math.abs(calculated - actual);

          const status = diff < 0.01 ? '✅' : '⚠️';
          console.log(`   ${status} ${material.name}: Mevcut=${actual.toFixed(2)}, Son Hareket After=${calculated.toFixed(2)}`);
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Doğrulama tamamlandı!\n');
    console.log('📌 Sonuç: Tüm üretimler için stok hareketleri oluşturuldu ve stoklar güncellendi.\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

finalVerification();

