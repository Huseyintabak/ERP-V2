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

async function comprehensiveCheck() {
  console.log('🔍 KAPSAMLI STOK DOĞRULAMA\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm production plans ile production logs eşleştirmesi
    const { data: plansWithProduction } = await supabase
      .from('production_plans')
      .select(`
        id,
        product_id,
        produced_quantity,
        status,
        order:orders(order_number),
        product:finished_products(code, name),
        logs:production_logs(id, quantity_produced, timestamp)
      `)
      .gt('produced_quantity', 0)
      .order('created_at', { ascending: false });

    if (!plansWithProduction || plansWithProduction.length === 0) {
      console.log('⚠️  Üretim yapılmış plan bulunamadı.\n');
      return;
    }

    console.log(`📋 Toplam Üretim Yapılmış Plan: ${plansWithProduction.length} adet\n`);

    let stats = {
      total: 0,
      withLogs: 0,
      withFinishedMovements: 0,
      withMaterialMovements: 0,
      missingFinished: [],
      missingMaterials: []
    };

    // 2. Her plan için detaylı kontrol
    for (const plan of plansWithProduction) {
      stats.total++;

      if (!plan.logs || plan.logs.length === 0) {
        continue;
      }

      stats.withLogs++;

      const totalProduced = plan.logs.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0);
      const firstLogTime = plan.logs[0].timestamp;

      // Nihai ürün stok hareketi - daha geniş arama
      const timeBefore = new Date(new Date(firstLogTime).getTime() - 60000).toISOString();
      const timeAfter = new Date(new Date(firstLogTime).getTime() + 60000).toISOString();

      const { data: finishedMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('material_id', plan.product_id)
        .eq('material_type', 'finished')
        .eq('movement_type', 'uretim')
        .gte('created_at', timeBefore)
        .lte('created_at', timeAfter);

      const hasFinishedMovement = finishedMovements && finishedMovements.length > 0;
      if (hasFinishedMovement) {
        stats.withFinishedMovements++;
      } else {
        // Description ile de dene
        const { data: descMovements } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('material_id', plan.product_id)
          .eq('material_type', 'finished')
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${plan.id}%,description.ilike.%plan #${plan.id}%`);

        if (!descMovements || descMovements.length === 0) {
          stats.missingFinished.push({
            plan_id: plan.id,
            order: plan.order?.order_number,
            product: plan.product?.name,
            produced: totalProduced
          });
        } else {
          stats.withFinishedMovements++;
        }
      }

      // BOM snapshot ve malzeme hareketleri
      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('material_id, material_type')
        .eq('plan_id', plan.id)
        .limit(1);

      if (bomSnapshot && bomSnapshot.length > 0) {
        const bomItem = bomSnapshot[0];
        
        // Bu malzeme için hareket kontrol
        const { data: materialMovements } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .gte('created_at', timeBefore)
          .lte('created_at', timeAfter);

        if (materialMovements && materialMovements.length > 0) {
          stats.withMaterialMovements++;
        } else {
          // Description ile de dene
          const { data: descMatMovements } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('material_id', bomItem.material_id)
            .eq('material_type', bomItem.material_type)
            .eq('movement_type', 'uretim')
            .or(`description.ilike.%Plan #${plan.id}%,description.ilike.%plan #${plan.id}%`);

          if (!descMatMovements || descMatMovements.length === 0) {
            stats.missingMaterials.push({
              plan_id: plan.id,
              order: plan.order?.order_number,
              product: plan.product?.name
            });
          } else {
            stats.withMaterialMovements++;
          }
        }
      }
    }

    // 3. Sonuçları göster
    console.log('📊 DETAYLI İSTATİSTİKLER:\n');
    console.log(`   Toplam Plan: ${stats.total}`);
    console.log(`   Production Log'u Olan: ${stats.withLogs}`);
    console.log(`   Nihai Ürün Hareketi Olan: ${stats.withFinishedMovements}/${stats.withLogs} (${((stats.withFinishedMovements/stats.withLogs)*100).toFixed(1)}%)`);
    console.log(`   Malzeme Tüketim Hareketi Olan: ${stats.withMaterialMovements}/${stats.withLogs} (${((stats.withMaterialMovements/stats.withLogs)*100).toFixed(1)}%)\n`);

    // 4. Eksik hareketleri göster
    if (stats.missingFinished.length > 0) {
      console.log('='.repeat(70));
      console.log(`\n⚠️  NİHAİ ÜRÜN STOK HAREKETİ EKSİK PLANLAR: ${stats.missingFinished.length} adet\n`);
      
      stats.missingFinished.slice(0, 10).forEach((plan, index) => {
        console.log(`${index + 1}. Plan #${plan.plan_id.substring(0, 8)}... - ${plan.product} (${plan.order})`);
      });

      if (stats.missingFinished.length > 10) {
        console.log(`   ... ve ${stats.missingFinished.length - 10} plan daha\n`);
      }
    }

    if (stats.missingMaterials.length > 0) {
      console.log('='.repeat(70));
      console.log(`\n⚠️  MALZEME TÜKETİM HAREKETİ EKSİK PLANLAR: ${stats.missingMaterials.length} adet\n`);
      
      stats.missingMaterials.slice(0, 10).forEach((plan, index) => {
        console.log(`${index + 1}. Plan #${plan.plan_id.substring(0, 8)}... - ${plan.product} (${plan.order})`);
      });

      if (stats.missingMaterials.length > 10) {
        console.log(`   ... ve ${stats.missingMaterials.length - 10} plan daha\n`);
      }
    }

    // 5. Mevcut stokların gerçekliği kontrolü
    console.log('='.repeat(70));
    console.log('\n🔍 MEVCUT STOKLARIN GERÇEK DEĞER KONTROLÜ\n');
    console.log('='.repeat(70) + '\n');

    // Örnek malzemeler için stok doğrulama
    const { data: sampleRawMaterials } = await supabase
      .from('raw_materials')
      .select('id, code, name, quantity')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (sampleRawMaterials && sampleRawMaterials.length > 0) {
      console.log(`📦 Örnek 20 Hammadde Kontrolü:\n`);

      let inconsistencies = 0;

      for (const material of sampleRawMaterials) {
        // Bu malzeme için son stok hareketini al
        const { data: lastMovement } = await supabase
          .from('stock_movements')
          .select('after_quantity, created_at')
          .eq('material_id', material.id)
          .eq('material_type', 'raw')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMovement && lastMovement.after_quantity !== null) {
          const lastRecordedStock = parseFloat(lastMovement.after_quantity);
          const currentStock = parseFloat(material.quantity);
          const diff = Math.abs(lastRecordedStock - currentStock);

          // Son hareketteki after_quantity ile mevcut stok karşılaştır
          // Eğer son hareketten sonra başka hareketler varsa fark olabilir
          
          // Son hareketten sonraki hareketleri kontrol et
          const { data: movementsAfter } = await supabase
            .from('stock_movements')
            .select('quantity, movement_type')
            .eq('material_id', material.id)
            .eq('material_type', 'raw')
            .gt('created_at', lastMovement.created_at);

          let calculatedCurrentStock = lastRecordedStock;
          if (movementsAfter && movementsAfter.length > 0) {
            movementsAfter.forEach(m => {
              const qty = parseFloat(m.quantity || 0);
              if (m.movement_type === 'giris' || (m.movement_type === 'uretim' && qty > 0)) {
                calculatedCurrentStock += qty;
              } else {
                calculatedCurrentStock += qty; // Çıkışlar zaten negatif
              }
            });
          }

          const calculatedDiff = Math.abs(calculatedCurrentStock - currentStock);

          if (calculatedDiff > 0.01) {
            inconsistencies++;
            const marker = calculatedDiff > 1 ? '❌' : '⚠️';
            console.log(`${marker} ${material.name} (${material.code}):`);
            console.log(`   Mevcut Stok: ${currentStock.toFixed(2)}`);
            console.log(`   Hesaplanan: ${calculatedCurrentStock.toFixed(2)}`);
            console.log(`   Fark: ${calculatedDiff.toFixed(2)}`);
            if (movementsAfter && movementsAfter.length > 0) {
              console.log(`   (Son hareketteki after_quantity'den sonra ${movementsAfter.length} hareket daha var)`);
            }
            console.log();
          }
        }
      }

      if (inconsistencies === 0) {
        console.log('✅ Kontrol edilen tüm malzemeler için stoklar tutarlı!\n');
      } else {
        console.log(`⚠️  ${inconsistencies} malzeme için tutarsızlık bulundu.\n`);
      }
    }

    // 6. Özet
    console.log('='.repeat(70));
    console.log('\n📊 GENEL DURUM ÖZETİ:\n');
    
    const finishedPercentage = stats.withLogs > 0 ? ((stats.withFinishedMovements / stats.withLogs) * 100).toFixed(1) : 0;
    const materialPercentage = stats.withLogs > 0 ? ((stats.withMaterialMovements / stats.withLogs) * 100).toFixed(1) : 0;

    console.log(`   ✅ Nihai Ürün Stok Hareketleri: ${finishedPercentage}%`);
    console.log(`   ✅ Malzeme Tüketim Stok Hareketleri: ${materialPercentage}%`);
    
    if (stats.missingFinished.length > 0 || stats.missingMaterials.length > 0) {
      console.log(`\n   ❌ Eksik Hareketler: ${stats.missingFinished.length + stats.missingMaterials.length} plan`);
      console.log(`\n   💡 Düzeltme için:`);
      console.log(`      node scripts/fix-plan-stock-movements.mjs [PLAN_ID]\n`);
    } else {
      console.log(`\n   🎉 Tüm planlar için stok hareketleri mevcut!\n`);
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

comprehensiveCheck();

