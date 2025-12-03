import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Environment variables bulunamadı!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const PLAN_ID = '5fcd32b2-ec7b-4717-901f-a05508e4ce21';

async function checkPlanStockStatus() {
  console.log('🔍 Plan Stok Durumu Kontrolü\n');
  console.log(`📋 Plan ID: ${PLAN_ID}\n`);
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Plan bilgileri
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(order_number),
        product:finished_products(code, name, quantity)
      `)
      .eq('id', PLAN_ID)
      .single();

    if (planError || !plan) {
      console.error('❌ Plan bulunamadı:', planError?.message);
      return;
    }

    console.log('📋 PLAN BİLGİLERİ:');
    console.log(`   Plan ID: ${plan.id}`);
    console.log(`   Sipariş: ${plan.order?.order_number || 'N/A'}`);
    console.log(`   Ürün: ${plan.product?.name} (${plan.product?.code})`);
    console.log(`   Planlanan: ${plan.planned_quantity} adet`);
    console.log(`   Üretilen: ${plan.produced_quantity} adet`);
    console.log(`   Durum: ${plan.status}`);
    console.log(`   Ürün Mevcut Stok: ${plan.product?.quantity || 0} adet\n`);

    // 2. Production logs
    const { data: logs, error: logsError } = await supabase
      .from('production_logs')
      .select(`
        *,
        operator:users(name)
      `)
      .eq('plan_id', PLAN_ID)
      .order('timestamp', { ascending: true });

    if (logsError) {
      console.error('❌ Production logs alınamadı:', logsError.message);
      return;
    }

    console.log(`📝 PRODUCTION LOGS: ${logs?.length || 0} adet`);
    if (logs && logs.length > 0) {
      logs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.quantity_produced} adet - ${new Date(log.timestamp).toLocaleString('tr-TR')} - Operatör: ${log.operator?.name || 'N/A'}`);
      });
      console.log();
    } else {
      console.log('   ⚠️  Production log bulunamadı!\n');
    }

    // 3. BOM Snapshot
    const { data: bomSnapshot, error: bomError } = await supabase
      .from('production_plan_bom_snapshot')
      .select('*')
      .eq('plan_id', PLAN_ID);

    if (bomError) {
      console.error('❌ BOM Snapshot alınamadı:', bomError.message);
      return;
    }

    console.log(`📦 BOM SNAPSHOT: ${bomSnapshot?.length || 0} adet malzeme`);
    if (bomSnapshot && bomSnapshot.length > 0) {
      bomSnapshot.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.material_name} (${item.material_code})`);
        console.log(`      Tip: ${item.material_type}, Gerekli: ${item.quantity_needed} (planlanan ${plan.planned_quantity} adet için)`);
      });
      console.log();
    } else {
      console.log('   ⚠️  BOM Snapshot bulunamadı!\n');
    }

    // 4. Stok hareketleri - Nihai ürün
    const { data: finishedMovements, error: finishedMovementsError } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('material_id', plan.product_id)
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim')
      .or(`description.ilike.%Plan #${PLAN_ID}%,description.ilike.%plan #${PLAN_ID}%`)
      .order('created_at', { ascending: true });

    console.log(`✅ NİHAİ ÜRÜN STOK HAREKETLERİ: ${finishedMovements?.length || 0} adet`);
    if (finishedMovements && finishedMovements.length > 0) {
      let totalProduced = 0;
      finishedMovements.forEach((movement, index) => {
        totalProduced += parseFloat(movement.quantity || 0);
        console.log(`   ${index + 1}. ${movement.quantity} adet`);
        console.log(`      Önceki Stok: ${movement.before_quantity ?? 'N/A'}, Sonraki Stok: ${movement.after_quantity ?? 'N/A'}`);
        console.log(`      Tarih: ${new Date(movement.created_at).toLocaleString('tr-TR')}`);
        console.log(`      Açıklama: ${movement.description || 'N/A'}\n`);
      });
      console.log(`   📊 Toplam Üretilen (Stok Hareketlerinden): ${totalProduced} adet`);
      console.log(`   📊 Plan Üretilen: ${plan.produced_quantity} adet\n`);
    } else {
      console.log('   ❌ Nihai ürün stok hareketi YOK! Stoklar artmamış olabilir!\n');
    }

    // 5. Stok hareketleri - Malzeme tüketimleri
    console.log(`🔧 MALZEME TÜKETİM STOK HAREKETLERİ:\n`);
    
    if (bomSnapshot && bomSnapshot.length > 0) {
      let hasAnyMovement = false;
      
      for (const bomItem of bomSnapshot) {
        // Bu malzeme için stok hareketi var mı?
        const { data: materialMovements } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${PLAN_ID}%,description.ilike.%plan #${PLAN_ID}%,description.ilike.%${PLAN_ID}%`)
          .order('created_at', { ascending: true });

        // Beklenen tüketim miktarı
        const expectedConsumption = (parseFloat(bomItem.quantity_needed) / parseFloat(plan.planned_quantity)) * parseFloat(plan.produced_quantity);

        // Mevcut stoku al
        let currentStock = 0;
        if (bomItem.material_type === 'raw') {
          const { data: rawMat } = await supabase
            .from('raw_materials')
            .select('quantity')
            .eq('id', bomItem.material_id)
            .single();
          currentStock = parseFloat(rawMat?.quantity || 0);
        } else if (bomItem.material_type === 'semi') {
          const { data: semiMat } = await supabase
            .from('semi_finished_products')
            .select('quantity')
            .eq('id', bomItem.material_id)
            .single();
          currentStock = parseFloat(semiMat?.quantity || 0);
        }

        if (materialMovements && materialMovements.length > 0) {
          hasAnyMovement = true;
          let totalConsumed = 0;
          
          console.log(`   ✅ ${bomItem.material_name} (${bomItem.material_code}):`);
          materialMovements.forEach((movement, index) => {
            const consumed = Math.abs(parseFloat(movement.quantity || 0));
            totalConsumed += consumed;
            console.log(`      ${index + 1}. ${consumed.toFixed(2)} ${bomItem.material_type === 'raw' ? 'kg' : 'adet'} tüketildi`);
            console.log(`         Önceki: ${movement.before_quantity ?? 'N/A'}, Sonraki: ${movement.after_quantity ?? 'N/A'}`);
            console.log(`         Tarih: ${new Date(movement.created_at).toLocaleString('tr-TR')}`);
          });
          console.log(`      📊 Toplam Tüketilen: ${totalConsumed.toFixed(2)} ${bomItem.material_type === 'raw' ? 'kg' : 'adet'}`);
          console.log(`      📊 Beklenen: ${expectedConsumption.toFixed(2)} ${bomItem.material_type === 'raw' ? 'kg' : 'adet'}`);
          console.log(`      📊 Mevcut Stok: ${currentStock.toFixed(2)} ${bomItem.material_type === 'raw' ? 'kg' : 'adet'}`);
          
          if (Math.abs(totalConsumed - expectedConsumption) > 0.01) {
            console.log(`      ⚠️  UYARI: Tüketim miktarı beklenenden farklı!`);
          }
          console.log();
        } else {
          console.log(`   ❌ ${bomItem.material_name} (${bomItem.material_code}):`);
          console.log(`      ⚠️  STOK HAREKETİ YOK! Stok düşmemiş olabilir!`);
          console.log(`      📊 Beklenen Tüketim: ${expectedConsumption.toFixed(2)} ${bomItem.material_type === 'raw' ? 'kg' : 'adet'}`);
          console.log(`      📊 Mevcut Stok: ${currentStock.toFixed(2)} ${bomItem.material_type === 'raw' ? 'kg' : 'adet'}`);
          console.log();
        }
      }

      if (!hasAnyMovement) {
        console.log('   ❌ HİÇBİR MALZEME İÇİN STOK HAREKETİ YOK!\n');
      }
    } else {
      console.log('   ⚠️  BOM Snapshot olmadığı için malzeme tüketim kontrolü yapılamadı.\n');
    }

    // Özet
    console.log('='.repeat(70));
    console.log('\n📊 ÖZET:\n');
    
    const hasProductionLogs = logs && logs.length > 0;
    const hasBomSnapshot = bomSnapshot && bomSnapshot.length > 0;
    const hasFinishedMovements = finishedMovements && finishedMovements.length > 0;
    
    // Malzeme hareketleri kontrolü
    let materialMovementsCount = 0;
    if (bomSnapshot) {
      for (const bomItem of bomSnapshot) {
        const { count } = await supabase
          .from('stock_movements')
          .select('*', { count: 'exact', head: true })
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${PLAN_ID}%,description.ilike.%plan #${PLAN_ID}%`);
        
        if (count && count > 0) {
          materialMovementsCount += count;
          break; // En az bir tane bulduysak yeterli
        }
      }
    }
    
    console.log(`   Production Logs: ${hasProductionLogs ? '✅ Var' : '❌ Yok'}`);
    console.log(`   BOM Snapshot: ${hasBomSnapshot ? '✅ Var' : '❌ Yok'}`);
    console.log(`   Nihai Ürün Hareketleri: ${hasFinishedMovements ? '✅ Var' : '❌ EKSİK!'}`);
    console.log(`   Malzeme Tüketim Hareketleri: ${materialMovementsCount > 0 ? '✅ Var' : '❌ EKSİK!'}\n`);

    if (!hasFinishedMovements || materialMovementsCount === 0) {
      console.log('⚠️  UYARI: Stok hareketleri eksik görünüyor!');
      console.log('💡 Düzeltme için: node scripts/fix-plan-stock-movements.mjs çalıştırabilirsiniz.\n');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

checkPlanStockStatus();

