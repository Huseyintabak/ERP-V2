import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Environment variables bulunamadı!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyAllProductions() {
  console.log('🔍 TÜM ÜRETİMLERİN STOK DÜŞÜŞ KONTROLÜ\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm production plans al
    const { data: allPlans, error: plansError } = await supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(order_number),
        product:finished_products(code, name)
      `)
      .in('status', ['tamamlandi', 'devam_ediyor', 'iptal_edildi'])
      .order('created_at', { ascending: false });

    if (plansError) {
      console.error('❌ Production plans alınamadı:', plansError.message);
      return;
    }

    console.log(`📋 Toplam Üretim Planı: ${allPlans?.length || 0} adet\n`);

    if (!allPlans || allPlans.length === 0) {
      console.log('⚠️  Üretim planı bulunamadı.\n');
      return;
    }

    let totalPlans = 0;
    let plansWithLogs = 0;
    let plansWithFinishedMovements = 0;
    let plansWithMaterialMovements = 0;
    let plansWithIssues = [];

    // 2. Her plan için kontrol
    for (const plan of allPlans) {
      totalPlans++;

      // Production logs kontrol
      const { data: logs } = await supabase
        .from('production_logs')
        .select('id, quantity_produced, timestamp')
        .eq('plan_id', plan.id)
        .order('timestamp', { ascending: true });

      if (!logs || logs.length === 0) {
        continue; // Log yoksa atla
      }

      plansWithLogs++;
      const totalProduced = logs.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0);

      // Nihai ürün stok hareketi kontrol
      const { data: finishedMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('material_id', plan.product_id)
        .eq('material_type', 'finished')
        .eq('movement_type', 'uretim')
        .or(`description.ilike.%Plan #${plan.id}%,description.ilike.%plan #${plan.id}%`);

      const hasFinishedMovement = finishedMovements && finishedMovements.length > 0;
      if (hasFinishedMovement) {
        plansWithFinishedMovements++;
      }

      // BOM Snapshot kontrol
      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('*')
        .eq('plan_id', plan.id);

      if (!bomSnapshot || bomSnapshot.length === 0) {
        if (hasFinishedMovement) {
          plansWithIssues.push({
            plan_id: plan.id,
            order: plan.order?.order_number,
            product: plan.product?.name,
            issue: 'BOM Snapshot yok ama üretim var'
          });
        }
        continue;
      }

      // Malzeme tüketim hareketleri kontrol
      let hasAllMaterialMovements = true;
      let missingMaterials = [];

      for (const bomItem of bomSnapshot) {
        const expectedConsumption = (parseFloat(bomItem.quantity_needed) / parseFloat(plan.planned_quantity)) * totalProduced;

        // Bu malzeme için stok hareketi var mı?
        const { data: materialMovements } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${plan.id}%,description.ilike.%plan #${plan.id}%,description.ilike.%${plan.id}%`);

        // Eğer description'da plan ID yoksa, zaman bazlı kontrol yap
        let hasMovement = materialMovements && materialMovements.length > 0;

        if (!hasMovement && logs.length > 0) {
          const productionTime = new Date(logs[0].timestamp);
          const timeBefore = new Date(productionTime.getTime() - 300000).toISOString(); // 5 dk önce
          const timeAfter = new Date(productionTime.getTime() + 300000).toISOString(); // 5 dk sonra

          const { data: timeBasedMovements } = await supabase
            .from('stock_movements')
            .select('*')
            .eq('material_id', bomItem.material_id)
            .eq('material_type', bomItem.material_type)
            .eq('movement_type', 'uretim')
            .gte('created_at', timeBefore)
            .lte('created_at', timeAfter);

          if (timeBasedMovements && timeBasedMovements.length > 0) {
            // Bu planın üretim miktarına göre beklenen tüketimle karşılaştır
            const totalConsumed = timeBasedMovements.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
            // Yaklaşık eşleşme kontrolü (%10 tolerans)
            if (Math.abs(totalConsumed - expectedConsumption) <= (expectedConsumption * 0.1)) {
              hasMovement = true;
            }
          }
        }

        if (!hasMovement) {
          hasAllMaterialMovements = false;
          missingMaterials.push({
            name: bomItem.material_name,
            code: bomItem.material_code,
            expected: expectedConsumption
          });
        }
      }

      if (hasAllMaterialMovements) {
        plansWithMaterialMovements++;
      } else {
        plansWithIssues.push({
          plan_id: plan.id,
          order: plan.order?.order_number,
          product: plan.product?.name,
          produced: totalProduced,
          issue: 'Malzeme tüketim hareketleri eksik',
          missing_materials: missingMaterials
        });
      }

      // Progress göster
      if (totalPlans % 10 === 0) {
        process.stdout.write(`\r⏳ Kontrol ediliyor... ${totalPlans}/${allPlans.length}`);
      }
    }

    console.log(`\n\n📊 GENEL DURUM:\n`);
    console.log(`   Toplam Plan: ${totalPlans}`);
    console.log(`   Production Log'u Olan: ${plansWithLogs}`);
    console.log(`   Nihai Ürün Hareketi Olan: ${plansWithFinishedMovements}`);
    console.log(`   Malzeme Tüketim Hareketi Olan: ${plansWithMaterialMovements}`);
    console.log(`   Sorunlu Plan: ${plansWithIssues.length}\n`);

    // 3. Sorunlu planları göster
    if (plansWithIssues.length > 0) {
      console.log('='.repeat(70));
      console.log('\n⚠️  SORUNLU PLANLAR:\n');

      plansWithIssues.forEach((issue, index) => {
        console.log(`${index + 1}. Plan #${issue.plan_id.substring(0, 8)}...`);
        console.log(`   Sipariş: ${issue.order || 'N/A'}`);
        console.log(`   Ürün: ${issue.product || 'N/A'}`);
        console.log(`   Üretilen: ${issue.produced || 0} adet`);
        console.log(`   Sorun: ${issue.issue}`);
        if (issue.missing_materials && issue.missing_materials.length > 0) {
          console.log(`   Eksik Malzemeler:`);
          issue.missing_materials.forEach(m => {
            console.log(`      - ${m.name} (${m.code}): ${m.expected.toFixed(2)} bekleniyor`);
          });
        }
        console.log();
      });

      console.log('='.repeat(70));
    }

    // 4. Mevcut stokların tutarlılığını kontrol et
    console.log('\n🔍 MEVCUT STOK TUTARLILIK KONTROLÜ\n');
    console.log('='.repeat(70) + '\n');

    // Tüm malzemeleri al ve stok hareketlerinden hesaplanan stoku kontrol et
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, code, name, quantity')
      .limit(100); // İlk 100 hammadde

    if (rawMaterials && rawMaterials.length > 0) {
      let inconsistentCount = 0;
      const inconsistencies = [];

      for (const material of rawMaterials) {
        // Bu malzeme için tüm stok hareketlerini topla
        const { data: allMovements } = await supabase
          .from('stock_movements')
          .select('quantity, movement_type')
          .eq('material_id', material.id)
          .eq('material_type', 'raw')
          .order('created_at', { ascending: true });

        if (!allMovements || allMovements.length === 0) {
          continue; // Hareket yoksa atla
        }

        // İlk stoku bulmak için geriye git (ya da başlangıç stoku varsa onu kullan)
        // Basit kontrol: Son hareketlerin toplamını kontrol et
        const calculatedStock = allMovements.reduce((sum, m) => {
          const qty = parseFloat(m.quantity || 0);
          if (m.movement_type === 'giris' || (m.movement_type === 'uretim' && qty > 0)) {
            return sum + qty;
          } else {
            return sum + qty; // Çıkışlar zaten negatif
          }
        }, 0);

        const actualStock = parseFloat(material.quantity || 0);
        const difference = Math.abs(calculatedStock - actualStock);

        // %1'den fazla fark varsa sorun olabilir (ancak başlangıç stoku olabilir)
        // Bu yüzden sadece büyük farkları raporla
        if (difference > 10 && Math.abs((calculatedStock - actualStock) / actualStock) > 0.1) {
          inconsistentCount++;
          inconsistencies.push({
            material: material.name,
            code: material.code,
            actual: actualStock,
            calculated: calculatedStock,
            difference: difference
          });
        }
      }

      if (inconsistencies.length > 0) {
        console.log(`⚠️  ${inconsistencies.length} malzeme için tutarsızlık bulundu:\n`);
        inconsistencies.slice(0, 10).forEach(inc => {
          console.log(`   - ${inc.material} (${inc.code}):`);
          console.log(`     Gerçek Stok: ${inc.actual.toFixed(2)}`);
          console.log(`     Hesaplanan: ${inc.calculated.toFixed(2)}`);
          console.log(`     Fark: ${inc.difference.toFixed(2)}\n`);
        });
      } else {
        console.log('✅ Kontrol edilen malzemeler için stok tutarlı görünüyor.\n');
        console.log('   (Not: Başlangıç stokları nedeniyle küçük farklar normal olabilir)\n');
      }
    }

    // 5. Özet
    console.log('='.repeat(70));
    console.log('\n📊 ÖZET RAPOR:\n');
    console.log(`✅ Doğru Çalışan Planlar: ${plansWithMaterialMovements}/${plansWithLogs}`);
    console.log(`❌ Sorunlu Planlar: ${plansWithIssues.length}`);
    
    if (plansWithIssues.length > 0) {
      console.log(`\n💡 Öneriler:`);
      console.log(`   1. Sorunlu planlar için fix-plan-stock-movements.mjs script'ini çalıştırın`);
      console.log(`   2. Her plan ID için: node scripts/fix-plan-stock-movements.mjs [PLAN_ID]\n`);
    } else {
      console.log(`\n🎉 Tüm üretimler için stok hareketleri mevcut!\n`);
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

verifyAllProductions();

