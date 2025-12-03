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

async function findMissingOptimized() {
  console.log('🔍 EKSİK STOK HAREKETLERİ TESPİT EDİLİYOR (Optimize)\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm production logs ile planları birleştir (daha hızlı)
    const { data: logsWithPlans, error: logsError } = await supabase
      .from('production_logs')
      .select(`
        plan_id,
        quantity_produced,
        timestamp,
        operator_id,
        plan:production_plans!inner(
          id,
          product_id,
          planned_quantity,
          produced_quantity,
          order:orders(order_number),
          product:finished_products(code, name)
        )
      `)
      .order('timestamp', { ascending: false });

    if (logsError) {
      console.error('❌ Production logs alınamadı:', logsError.message);
      return;
    }

    // Plan ID'lerine göre grupla
    const planMap = new Map();
    logsWithPlans?.forEach(log => {
      if (!log.plan) return;
      const planId = log.plan.id;
      
      if (!planMap.has(planId)) {
        planMap.set(planId, {
          plan_id: planId,
          product_id: log.plan.product_id,
          planned_quantity: log.plan.planned_quantity,
          produced_quantity: log.plan.produced_quantity,
          order: log.plan.order?.order_number,
          product: log.plan.product?.name,
          logs: [],
          operator_id: log.operator_id
        });
      }
      
      planMap.get(planId).logs.push({
        quantity_produced: log.quantity_produced,
        timestamp: log.timestamp,
        operator_id: log.operator_id
      });
    });

    const plans = Array.from(planMap.values());
    console.log(`📋 ${plans.length} plan bulundu (production log'larına göre)\n`);

    // 2. Tüm stok hareketlerini önceden al (batch)
    const { data: allStockMovements } = await supabase
      .from('stock_movements')
      .select('id, material_id, material_type, movement_type, quantity, description, created_at')
      .eq('movement_type', 'uretim')
      .order('created_at', { ascending: false });

    console.log(`📦 ${allStockMovements?.length || 0} üretim stok hareketi yüklendi\n`);

    // 3. BOM snapshot'ları toplu al
    const { data: allBomSnapshots } = await supabase
      .from('production_plan_bom_snapshot')
      .select('*');

    // Plan ID'ye göre grupla
    const bomMap = new Map();
    allBomSnapshots?.forEach(item => {
      if (!bomMap.has(item.plan_id)) {
        bomMap.set(item.plan_id, []);
      }
      bomMap.get(item.plan_id).push(item);
    });

    console.log(`📦 ${bomMap.size} plan için BOM snapshot yüklendi\n`);

    const missingPlans = [];

    // 4. Her planı kontrol et (artık çok daha hızlı - veriler memory'de)
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      const planId = plan.plan_id;

      if (i % 10 === 0) {
        process.stdout.write(`\r⏳ Kontrol ediliyor: ${i + 1}/${plans.length}`);
      }

      const totalProduced = plan.logs.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0);
      const firstLogTime = plan.logs[0].timestamp;

      // Memory'deki stok hareketlerinden ara
      const timeBefore = new Date(new Date(firstLogTime).getTime() - 60000);
      const timeAfter = new Date(new Date(firstLogTime).getTime() + 60000);

      // Nihai ürün hareketi kontrol
      const finishedMovements = allStockMovements?.filter(m => 
        m.material_id === plan.product_id &&
        m.material_type === 'finished' &&
        new Date(m.created_at) >= timeBefore &&
        new Date(m.created_at) <= timeAfter
      ) || [];

      let hasFinishedMovement = finishedMovements.length > 0;
      
      if (!hasFinishedMovement) {
        // Description kontrol
        hasFinishedMovement = allStockMovements?.some(m =>
          m.material_id === plan.product_id &&
          m.material_type === 'finished' &&
          m.description?.toLowerCase().includes(planId.toLowerCase())
        ) || false;
      }

      // BOM snapshot
      const bomSnapshot = bomMap.get(planId) || [];

      // Malzeme tüketim kontrolü
      let missingMaterials = [];
      if (bomSnapshot.length > 0) {
        for (const bomItem of bomSnapshot) {
          const expectedConsumption = (parseFloat(bomItem.quantity_needed) / parseFloat(plan.planned_quantity)) * totalProduced;

          // Memory'deki hareketlerden ara
          const materialMovements = allStockMovements?.filter(m =>
            m.material_id === bomItem.material_id &&
            m.material_type === bomItem.material_type &&
            new Date(m.created_at) >= timeBefore &&
            new Date(m.created_at) <= timeAfter
          ) || [];

          let hasMovement = materialMovements.length > 0;

          if (!hasMovement) {
            // Description kontrol
            hasMovement = allStockMovements?.some(m =>
              m.material_id === bomItem.material_id &&
              m.material_type === bomItem.material_type &&
              m.description?.toLowerCase().includes(planId.toLowerCase())
            ) || false;
          }

          if (!hasMovement) {
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
      }

      // Eksik varsa kaydet
      if (!hasFinishedMovement || missingMaterials.length > 0) {
        missingPlans.push({
          plan_id: planId,
          order: plan.order,
          product: plan.product,
          product_id: plan.product_id,
          produced: totalProduced,
          operator_id: plan.operator_id,
          log_time: firstLogTime,
          logs: plan.logs,
          bom_snapshot: bomSnapshot,
          missing_finished: !hasFinishedMovement,
          missing_materials: missingMaterials,
          issue: !hasFinishedMovement && missingMaterials.length > 0
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
    console.log(`   Toplam Plan: ${plans.length}`);
    console.log(`   Eksik Hareketi Olan Plan: ${missingPlans.length}\n`);

    if (missingPlans.length > 0) {
      console.log('='.repeat(70));
      console.log('\n❌ EKSİK STOK HAREKETİ OLAN PLANLAR:\n');

      missingPlans.slice(0, 20).forEach((plan, index) => {
        console.log(`${index + 1}. Plan #${plan.plan_id.substring(0, 8)}...`);
        console.log(`   Sipariş: ${plan.order || 'N/A'}`);
        console.log(`   Ürün: ${plan.product || 'N/A'}`);
        console.log(`   Üretilen: ${plan.produced} adet`);
        console.log(`   Sorun: ${plan.issue}`);
        
        if (plan.missing_finished) {
          console.log(`   ❌ Nihai ürün stok hareketi eksik`);
        }
        
        if (plan.missing_materials && plan.missing_materials.length > 0) {
          console.log(`   ❌ Eksik malzeme tüketim: ${plan.missing_materials.length} adet`);
        }
        console.log();
      });

      if (missingPlans.length > 20) {
        console.log(`   ... ve ${missingPlans.length - 20} plan daha\n`);
      }

      // JSON dosyasına kaydet
      const outputFile = join(__dirname, '..', 'missing-stock-movements.json');
      writeFileSync(outputFile, JSON.stringify(missingPlans, null, 2));
      console.log(`💾 Tüm detaylar kaydedildi: ${outputFile}\n`);
      console.log(`   Toplam ${missingPlans.length} plan için düzeltme gerekiyor.\n`);
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

findMissingOptimized().then(plans => {
  if (plans && plans.length > 0) {
    console.log('💡 Düzeltmek için:');
    console.log('   node scripts/fix-all-missing-stocks.mjs\n');
  }
});

