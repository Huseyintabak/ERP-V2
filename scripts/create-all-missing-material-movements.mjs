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
  console.log('🔧 TÜM EKSİK MALZEME TÜKETİM HAREKETLERİNİ OLUŞTURUYOR\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Tüm production log'ları al
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced, timestamp, operator_id')
      .order('timestamp', { ascending: true });

    console.log(`📝 Toplam ${allLogs?.length || 0} production log bulundu\n`);
    console.log('🔍 Kontrol ediliyor ve eksik hareketler oluşturuluyor...\n');

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < (allLogs || []).length; i++) {
      const log = allLogs[i];

      try {
        // Plan bilgisini al
        const { data: planData } = await supabase
          .from('production_plans')
          .select('planned_quantity, product_id, product:finished_products(name)')
          .eq('id', log.plan_id)
          .single();

        if (!planData) {
          continue;
        }

        const plannedQty = parseFloat(planData.planned_quantity || 1);
        const producedQty = parseFloat(log.quantity_produced || 0);

        if (plannedQty <= 0 || producedQty <= 0) {
          continue;
        }

        // BOM snapshot'ı al
        const { data: bomSnapshot } = await supabase
          .from('production_plan_bom_snapshot')
          .select('material_type, material_id, quantity_needed, material_name, material_code')
          .eq('plan_id', log.plan_id);

        if (!bomSnapshot || bomSnapshot.length === 0) {
          continue; // BOM yoksa atla
        }

        let logCreated = 0;
        let logSkipped = 0;

        // Her malzeme için kontrol et
        for (const bomItem of bomSnapshot) {
          const consumptionQty = (bomItem.quantity_needed / plannedQty) * producedQty;

          if (consumptionQty <= 0) {
            continue;
          }

          // Bu malzeme için stok hareketi var mı?
          const { data: existingMovement } = await supabase
            .from('stock_movements')
            .select('id')
            .eq('production_log_id', log.id)
            .eq('material_type', bomItem.material_type)
            .eq('material_id', bomItem.material_id)
            .eq('movement_type', 'uretim')
            .limit(1)
            .single();

          if (existingMovement) {
            logSkipped++;
            continue; // Zaten var
          }

          // Malzeme bilgisini al
          const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
          
          const { data: materialData } = await supabase
            .from(tableName)
            .select('quantity, name')
            .eq('id', bomItem.material_id)
            .single();

          if (!materialData) {
            continue; // Malzeme bulunamadı
          }

          // Mevcut stoku al
          const currentQty = parseFloat(materialData.quantity || 0);
          
          // Before quantity hesapla (basit yaklaşım - mevcut stok + tüketim)
          // Not: Bu geriye gitme yöntemi, eğer başka hareketler varsa tam doğru olmayabilir
          // Ancak kullanıcı stokların doğru olmasını istiyor
          const beforeQty = currentQty + consumptionQty;
          const afterQty = currentQty;

          // Ürün adı
          const productName = planData.product?.name || 'Ürün';
          const materialName = bomItem.material_name || materialData.name || bomItem.material_code || 'Bilinmeyen';

          // Stok hareketi oluştur
          const { error: insertError } = await supabase
            .from('stock_movements')
            .insert({
              material_type: bomItem.material_type,
              material_id: bomItem.material_id,
              movement_type: 'uretim',
              quantity: -consumptionQty,
              before_quantity: Math.max(0, beforeQty),
              after_quantity: Math.max(0, afterQty),
              user_id: log.operator_id,
              description: `Üretim tüketimi: ${producedQty} adet ${productName} için ${consumptionQty.toFixed(2)} adet ${materialName}`,
              created_at: log.timestamp,
              production_log_id: log.id
            });

          if (insertError) {
            console.error(`   ❌ Log ${log.id.substring(0, 8)}...: ${materialName} - ${insertError.message}`);
            errorCount++;
          } else {
            logCreated++;
            createdCount++;
          }
        }

        if (logCreated > 0 || logSkipped > 0) {
          if ((createdCount + skippedCount) % 100 === 0) {
            console.log(`   ✅ ${createdCount + skippedCount} log işlendi (${createdCount} yeni, ${skippedCount} zaten var)...`);
          }
        }

        skippedCount += logSkipped;

      } catch (error) {
        console.error(`   ❌ Log ${log.id?.substring(0, 8) || 'unknown'}...: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Yeni oluşturulan hareket: ${createdCount}`);
    console.log(`   ⏭️  Zaten var: ${skippedCount}`);
    console.log(`   ❌ Hata: ${errorCount}\n`);

    // Doğrulama
    console.log('🔍 Doğrulama yapılıyor...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Tüm malzeme hareketleri
    const { data: allMaterialMovements } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished');

    const { data: withLogId } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .not('production_log_id', 'is', null);

    console.log(`   📦 Toplam malzeme tüketim hareketi: ${allMaterialMovements?.length || 0}`);
    console.log(`   🔗 production_log_id ile: ${withLogId?.length || 0}\n`);

    console.log('✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

