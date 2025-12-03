import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findMissingMovements() {
  console.log('🔍 EKSİK STOK HAREKETLERİ TESPİT EDİLİYOR...\n');
  console.log('='.repeat(70) + '\n');

  const missingPlans = [];

  try {
    // Tüm üretim yapılmış planları al
    const { data: allPlans, error } = await supabase
      .from('production_plans')
      .select(`
        id,
        product_id,
        planned_quantity,
        produced_quantity,
        status,
        order:orders(order_number),
        product:finished_products(code, name)
      `)
      .gt('produced_quantity', 0)
      .order('created_at', { ascending: false });

    if (error || !allPlans) {
      console.error('❌ Planlar alınamadı:', error?.message);
      return;
    }

    console.log(`📋 Toplam ${allPlans.length} plan kontrol edilecek...\n`);

    // Her planı tek tek kontrol et
    for (let i = 0; i < allPlans.length; i++) {
      const plan = allPlans[i];
      const planId = plan.id;

      process.stdout.write(`\r⏳ Kontrol ediliyor: ${i + 1}/${allPlans.length} - Plan #${planId.substring(0, 8)}...`);

      // 1. Production log var mı?
      const { data: logs } = await supabase
        .from('production_logs')
        .select('id, quantity_produced, timestamp, operator_id')
        .eq('plan_id', planId)
        .order('timestamp', { ascending: true });

      if (!logs || logs.length === 0) {
        continue; // Log yoksa atla
      }

      const totalProduced = logs.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0);
      const firstLogTime = logs[0].timestamp;
      const operatorId = logs[0].operator_id;

      // 2. Nihai ürün stok hareketi var mı?
      const timeBefore = new Date(new Date(firstLogTime).getTime() - 60000).toISOString();
      const timeAfter = new Date(new Date(firstLogTime).getTime() + 60000).toISOString();

      const { data: finishedMovements } = await supabase
        .from('stock_movements')
        .select('id')
        .eq('material_id', plan.product_id)
        .eq('material_type', 'finished')
        .eq('movement_type', 'uretim')
        .gte('created_at', timeBefore)
        .lte('created_at', timeAfter)
        .limit(1);

      // Description ile de kontrol et
      let hasFinishedMovement = finishedMovements && finishedMovements.length > 0;
      if (!hasFinishedMovement) {
        const { data: descMovements } = await supabase
          .from('stock_movements')
          .select('id')
          .eq('material_id', plan.product_id)
          .eq('material_type', 'finished')
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${planId}%,description.ilike.%plan #${planId}%`)
          .limit(1);

        hasFinishedMovement = descMovements && descMovements.length > 0;
      }

      // 3. BOM Snapshot var mı?
      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('*')
        .eq('plan_id', planId);

      if (!bomSnapshot || bomSnapshot.length === 0) {
        if (!hasFinishedMovement) {
          missingPlans.push({
            plan_id: planId,
            order: plan.order?.order_number,
            product: plan.product?.name,
            product_id: plan.product_id,
            produced: totalProduced,
            operator_id: operatorId,
            log_time: firstLogTime,
            issue: 'BOM Snapshot yok + Nihai ürün hareketi yok'
          });
        }
        continue;
      }

      // 4. Malzeme tüketim hareketleri var mı?
      let missingMaterials = [];
      let hasAllMaterialMovements = true;

      for (const bomItem of bomSnapshot) {
        const expectedConsumption = (parseFloat(bomItem.quantity_needed) / parseFloat(plan.planned_quantity)) * totalProduced;

        // Zaman bazlı kontrol
        const { data: timeMovements } = await supabase
          .from('stock_movements')
          .select('id, quantity, before_quantity, after_quantity')
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .gte('created_at', timeBefore)
          .lte('created_at', timeAfter);

        // Description bazlı kontrol
        let hasMovement = timeMovements && timeMovements.length > 0;
        if (!hasMovement) {
          const { data: descMovements } = await supabase
            .from('stock_movements')
            .select('id')
            .eq('material_id', bomItem.material_id)
            .eq('material_type', bomItem.material_type)
            .eq('movement_type', 'uretim')
            .or(`description.ilike.%Plan #${planId}%,description.ilike.%plan #${planId}%`)
            .limit(1);

          hasMovement = descMovements && descMovements.length > 0;
        }

        if (!hasMovement) {
          hasAllMaterialMovements = false;
          missingMaterials.push({
            material_id: bomItem.material_id,
            material_type: bomItem.material_type,
            material_code: bomItem.material_code,
            material_name: bomItem.material_name,
            quantity_needed: bomItem.quantity_needed,
            expected_consumption: expectedConsumption
          });
        }
      }

      // Eksik hareket varsa kaydet
      if (!hasFinishedMovement || !hasAllMaterialMovements) {
        missingPlans.push({
          plan_id: planId,
          order: plan.order?.order_number,
          product: plan.product?.name,
          product_id: plan.product_id,
          produced: totalProduced,
          operator_id: operatorId,
          log_time: firstLogTime,
          logs: logs,
          bom_snapshot: bomSnapshot,
          missing_finished: !hasFinishedMovement,
          missing_materials: missingMaterials,
          issue: !hasFinishedMovement && !hasAllMaterialMovements 
            ? 'Nihai ürün + Malzeme tüketim hareketleri eksik'
            : !hasFinishedMovement 
            ? 'Nihai ürün hareketi eksik'
            : 'Malzeme tüketim hareketleri eksik'
        });
      }
    }

    console.log(`\n\n✅ Kontrol tamamlandı!\n`);
    console.log('='.repeat(70));

    // Sonuçları göster
    console.log(`\n📊 SONUÇLAR:\n`);
    console.log(`   Toplam Plan: ${allPlans.length}`);
    console.log(`   Eksik Hareketi Olan Plan: ${missingPlans.length}\n`);

    if (missingPlans.length > 0) {
      console.log('='.repeat(70));
      console.log('\n❌ EKSİK STOK HAREKETİ OLAN PLANLAR:\n');

      missingPlans.forEach((plan, index) => {
        console.log(`${index + 1}. Plan #${plan.plan_id.substring(0, 8)}...`);
        console.log(`   Sipariş: ${plan.order || 'N/A'}`);
        console.log(`   Ürün: ${plan.product || 'N/A'}`);
        console.log(`   Üretilen: ${plan.produced} adet`);
        console.log(`   Sorun: ${plan.issue}`);
        
        if (plan.missing_finished) {
          console.log(`   ❌ Nihai ürün stok hareketi eksik`);
        }
        
        if (plan.missing_materials && plan.missing_materials.length > 0) {
          console.log(`   ❌ Eksik malzeme tüketim hareketleri: ${plan.missing_materials.length} adet`);
          plan.missing_materials.slice(0, 3).forEach(m => {
            console.log(`      - ${m.material_name} (${m.material_code}): ${m.expected_consumption.toFixed(2)} bekleniyor`);
          });
          if (plan.missing_materials.length > 3) {
            console.log(`      ... ve ${plan.missing_materials.length - 3} malzeme daha`);
          }
        }
        console.log();
      });

      // JSON dosyasına kaydet
      const outputFile = join(__dirname, '..', 'missing-stock-movements.json');
      writeFileSync(outputFile, JSON.stringify(missingPlans, null, 2));
      console.log(`\n💾 Detaylar kaydedildi: ${outputFile}\n`);
    } else {
      console.log('✅ Tüm planlar için stok hareketleri mevcut!\n');
    }

    return missingPlans;

  } catch (error) {
    console.error('\n❌ Hata:', error.message);
    console.error(error.stack);
    return [];
  }
}

findMissingMovements().then(plans => {
  if (plans && plans.length > 0) {
    console.log(`\n💡 Düzeltmek için:`);
    console.log(`   node scripts/fix-all-missing-stocks.mjs\n`);
  }
});

