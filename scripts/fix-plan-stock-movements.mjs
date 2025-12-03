import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env dosyasını yükle
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Supabase environment variables bulunamadı!');
  console.error('Lütfen .env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olduğundan emin olun.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Plan ID'sini command line argümanından al veya varsayılan kullan
const PLAN_ID = process.argv[2] || '621a05fa-fd4e-4ece-9794-950b297f50eb';

async function checkPlanStatus() {
  console.log('🔍 Plan durumu kontrol ediliyor...\n');

  // 1. Plan bilgileri
  const { data: plan, error: planError } = await supabase
    .from('production_plans')
    .select(`
      *,
      order:orders(order_number),
      product:finished_products(code, name)
    `)
    .eq('id', PLAN_ID)
    .single();

  if (planError || !plan) {
    console.error('❌ Plan bulunamadı:', planError?.message);
    return false;
  }

  console.log('📋 Plan Bilgileri:');
  console.log(`   Plan ID: ${plan.id}`);
  console.log(`   Sipariş: ${plan.order?.order_number}`);
  console.log(`   Ürün: ${plan.product?.name} (${plan.product?.code})`);
  console.log(`   Planlanan: ${plan.planned_quantity}`);
  console.log(`   Üretilen: ${plan.produced_quantity}`);
  console.log(`   Durum: ${plan.status}\n`);

  // 2. Production logs
  const { data: logs, error: logsError } = await supabase
    .from('production_logs')
    .select('*')
    .eq('plan_id', PLAN_ID)
    .order('timestamp', { ascending: true });

  if (logsError) {
    console.error('❌ Production logs alınamadı:', logsError.message);
    return false;
  }

  console.log(`📝 Production Logs: ${logs?.length || 0} adet`);
  if (logs && logs.length > 0) {
    logs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.quantity_produced} adet - ${new Date(log.timestamp).toLocaleString('tr-TR')}`);
    });
  }
  console.log();

  // 3. BOM Snapshot
  const { data: bomSnapshot, error: bomError } = await supabase
    .from('production_plan_bom_snapshot')
    .select('*')
    .eq('plan_id', PLAN_ID);

  if (bomError) {
    console.error('❌ BOM Snapshot alınamadı:', bomError.message);
    return false;
  }

  console.log(`📦 BOM Snapshot: ${bomSnapshot?.length || 0} adet malzeme`);
  if (bomSnapshot && bomSnapshot.length > 0) {
    bomSnapshot.forEach((item) => {
      console.log(`   - ${item.material_name} (${item.material_code}): ${item.quantity_needed}`);
    });
  }
  console.log();

  // 4. Stok hareketleri - Nihai ürün
  const { data: finishedMovements, error: finishedMovementsError } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('material_id', plan.product_id)
    .eq('material_type', 'finished')
    .eq('movement_type', 'uretim')
    .ilike('description', `%Plan #${PLAN_ID}%`);

  console.log(`✅ Nihai Ürün Stok Hareketleri: ${finishedMovements?.length || 0} adet`);
  if (finishedMovements && finishedMovements.length > 0) {
    finishedMovements.forEach((movement) => {
      console.log(`   - ${movement.quantity} adet - ${new Date(movement.created_at).toLocaleString('tr-TR')}`);
    });
  }
  console.log();

    // 5. Stok hareketleri - Malzeme tüketimleri
    let materialMovementsCount = 0;
    if (bomSnapshot && bomSnapshot.length > 0) {
      // Her BOM item için kontrol et - plan ID ile
      for (const bomItem of bomSnapshot) {
        const { count } = await supabase
          .from('stock_movements')
          .select('*', { count: 'exact', head: true })
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${PLAN_ID}%,description.ilike.%plan #${PLAN_ID}%,description.ilike.%${PLAN_ID}%`);
        
        if (count && count > 0) {
          materialMovementsCount += count;
          break; // En az bir tane bulduysak yeterli
        }
      }
    }

  console.log(`🔧 Malzeme Tüketim Stok Hareketleri: ${materialMovementsCount} adet\n`);

  // Özet
  const hasLogs = logs && logs.length > 0;
  const hasBomSnapshot = bomSnapshot && bomSnapshot.length > 0;
  const hasFinishedMovements = finishedMovements && finishedMovements.length > 0;
  const hasMaterialMovements = materialMovementsCount > 0;

  console.log('📊 ÖZET:');
  console.log(`   Production Logs: ${hasLogs ? '✅' : '❌'}`);
  console.log(`   BOM Snapshot: ${hasBomSnapshot ? '✅' : '❌'}`);
  console.log(`   Nihai Ürün Hareketleri: ${hasFinishedMovements ? '✅' : '❌ EKSİK!'}`);
  console.log(`   Malzeme Tüketim Hareketleri: ${hasMaterialMovements ? '✅' : '❌ EKSİK!'}\n`);

  return {
    plan,
    logs,
    bomSnapshot,
    finishedMovements,
    hasFinishedMovements,
    hasMaterialMovements
  };
}

async function fixMissingStockMovements(status) {
  const { plan, logs, bomSnapshot } = status;

  if (!logs || logs.length === 0) {
    console.log('⚠️  Production log bulunamadı, düzeltme yapılamıyor.');
    return;
  }

  console.log('🔧 Eksik stok hareketleri düzeltiliyor...\n');

  // BOM Snapshot yoksa oluştur
  if (!bomSnapshot || bomSnapshot.length === 0) {
    console.log('⚠️  BOM Snapshot bulunamadı, oluşturuluyor...');
    
    // BOM'u al
    const { data: bom, error: bomError } = await supabase
      .from('bom')
      .select(`
        *,
        raw_material:raw_materials!bom_material_id_fkey(code, name),
        semi_material:semi_finished_products!bom_material_id_fkey(code, name)
      `)
      .eq('finished_product_id', plan.product_id);

    if (bomError || !bom || bom.length === 0) {
      console.error('❌ BOM bulunamadı:', bomError?.message);
      return;
    }

    // BOM Snapshot oluştur
    const snapshotData = bom.map(item => ({
      plan_id: PLAN_ID,
      material_type: item.material_type,
      material_id: item.material_id,
      material_code: item.material_type === 'raw' 
        ? item.raw_material?.code 
        : item.semi_material?.code,
      material_name: item.material_type === 'raw'
        ? item.raw_material?.name
        : item.semi_material?.name,
      quantity_needed: item.quantity_needed * plan.planned_quantity
    }));

    const { error: snapshotError } = await supabase
      .from('production_plan_bom_snapshot')
      .insert(snapshotData);

    if (snapshotError) {
      console.error('❌ BOM Snapshot oluşturulamadı:', snapshotError.message);
      return;
    }

    console.log('✅ BOM Snapshot oluşturuldu\n');
  }

  // Her production log için stok hareketlerini oluştur
  for (const log of logs) {
    console.log(`📝 Log işleniyor: ${log.quantity_produced} adet (${log.id})`);

    // 1. Nihai ürün stok hareketi kontrolü
    const { data: existingFinished } = await supabase
      .from('stock_movements')
      .select('id')
      .eq('material_id', plan.product_id)
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim')
      .gte('created_at', new Date(new Date(log.timestamp).getTime() - 60000).toISOString())
      .lte('created_at', new Date(new Date(log.timestamp).getTime() + 60000).toISOString())
      .limit(1);

    if (!existingFinished || existingFinished.length === 0) {
          // Önceki stoku hesapla
          const { data: previousLogs } = await supabase
            .from('production_logs')
            .select('quantity_produced')
            .eq('plan_id', PLAN_ID)
            .lt('timestamp', log.timestamp);

          const beforeQty = parseFloat((previousLogs?.reduce((sum, l) => sum + parseFloat(l.quantity_produced || 0), 0) || 0).toFixed(2));
          const afterQty = parseFloat((beforeQty + parseFloat(log.quantity_produced || 0)).toFixed(2));

      // Stok hareketi oluştur
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          material_type: 'finished',
          material_id: plan.product_id,
          movement_type: 'uretim',
          quantity: log.quantity_produced,
          before_quantity: beforeQty,
          after_quantity: afterQty,
          user_id: log.operator_id,
          description: `Üretim kaydı: Plan #${PLAN_ID} (Retroaktif düzeltme)`,
          created_at: log.timestamp
        });

      if (movementError) {
        console.error(`   ❌ Nihai ürün hareketi oluşturulamadı:`, movementError.message);
      } else {
        console.log(`   ✅ Nihai ürün stok hareketi oluşturuldu`);
      }
    }

    // 2. Malzeme tüketim stok hareketleri
    const { data: currentBomSnapshot } = await supabase
      .from('production_plan_bom_snapshot')
      .select('*')
      .eq('plan_id', PLAN_ID);

    if (currentBomSnapshot && currentBomSnapshot.length > 0) {
      for (const bomItem of currentBomSnapshot) {
        const consumptionQty = parseFloat(((parseFloat(bomItem.quantity_needed) / parseFloat(plan.planned_quantity)) * parseFloat(log.quantity_produced)).toFixed(2));

        // Mevcut stok hareketi var mı kontrol et
        const { data: existingMaterial } = await supabase
          .from('stock_movements')
          .select('id')
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .gte('created_at', new Date(new Date(log.timestamp).getTime() - 60000).toISOString())
          .lte('created_at', new Date(new Date(log.timestamp).getTime() + 60000).toISOString())
          .ilike('description', `%Plan #${PLAN_ID}%`)
          .limit(1);

        if (!existingMaterial || existingMaterial.length === 0) {
          // Mevcut stoku al
          let currentQty = 0;
          if (bomItem.material_type === 'raw') {
            const { data: rawMat } = await supabase
              .from('raw_materials')
              .select('quantity')
              .eq('id', bomItem.material_id)
              .single();
            currentQty = parseFloat(rawMat?.quantity || 0);
          } else if (bomItem.material_type === 'semi') {
            const { data: semiMat } = await supabase
              .from('semi_finished_products')
              .select('quantity')
              .eq('id', bomItem.material_id)
              .single();
            currentQty = parseFloat(semiMat?.quantity || 0);
          }

          // Sonraki tüketimleri hesapla
          const { data: futureConsumptions } = await supabase
            .from('stock_movements')
            .select('quantity')
            .eq('material_id', bomItem.material_id)
            .eq('material_type', bomItem.material_type)
            .eq('movement_type', 'uretim')
            .gt('created_at', log.timestamp);

          const futureQty = futureConsumptions?.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0) || 0;
          // Geçici çözüm: INTEGER alan için yuvarla, ama önce veritabanı tipini kontrol et
          let beforeQty = parseFloat((currentQty + futureQty).toFixed(2));
          let afterQty = parseFloat((beforeQty - consumptionQty).toFixed(2));
          
          // Eğer alan INTEGER ise, yuvarla (geçici çözüm)
          // TODO: Veritabanı şemasını NUMERIC'e çevirmek daha iyi olur
          beforeQty = Math.round(beforeQty);
          afterQty = Math.round(afterQty);

          // Stok hareketi oluştur
          const { error: materialMovementError } = await supabase
            .from('stock_movements')
            .insert({
              material_type: bomItem.material_type,
              material_id: bomItem.material_id,
              movement_type: 'uretim',
              quantity: -consumptionQty,
              before_quantity: beforeQty,
              after_quantity: afterQty,
              user_id: log.operator_id,
              description: `Üretim tüketimi: ${log.quantity_produced} adet ${plan.product?.name || 'ürün'} için (Retroaktif düzeltme)`,
              created_at: log.timestamp
            });

          if (materialMovementError) {
            console.error(`   ❌ ${bomItem.material_name} hareketi oluşturulamadı:`, materialMovementError.message);
          } else {
            console.log(`   ✅ ${bomItem.material_name} tüketim hareketi oluşturuldu (${consumptionQty.toFixed(2)})`);
          }
        }
      }
    }

    console.log();
  }

  console.log('✅ Düzeltme işlemi tamamlandı!\n');
}

async function main() {
  console.log('🚀 Plan Stok Hareketleri Düzeltme Script\'i\n');
  console.log(`📋 Plan ID: ${PLAN_ID}\n`);
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Durum kontrolü
    const status = await checkPlanStatus();
    
    if (!status) {
      console.error('❌ Plan durumu kontrol edilemedi.');
      process.exit(1);
    }

    // 2. Düzeltme gerekli mi?
    // Malzeme tüketim hareketlerini daha detaylı kontrol et
    let hasMaterialMovementsDetailed = false;
    if (status.bomSnapshot && status.bomSnapshot.length > 0) {
      for (const bomItem of status.bomSnapshot) {
        const { count } = await supabase
          .from('stock_movements')
          .select('*', { count: 'exact', head: true })
          .eq('material_id', bomItem.material_id)
          .eq('material_type', bomItem.material_type)
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${PLAN_ID}%,description.ilike.%plan #${PLAN_ID}%,description.ilike.%${PLAN_ID}%`);
        
        if (count && count > 0) {
          hasMaterialMovementsDetailed = true;
          break;
        }
      }
    }

    if (!status.hasFinishedMovements || !hasMaterialMovementsDetailed) {
      console.log('⚠️  Eksik stok hareketleri tespit edildi!\n');
      console.log('='.repeat(60) + '\n');
      
      await fixMissingStockMovements(status);
      
      // 3. Tekrar kontrol et
      console.log('='.repeat(60) + '\n');
      console.log('🔍 Düzeltme sonrası kontrol ediliyor...\n');
      await checkPlanStatus();
    } else {
      console.log('✅ Tüm stok hareketleri mevcut, düzeltme gerekmiyor.');
    }

    console.log('\n✅ İşlem tamamlandı!');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

