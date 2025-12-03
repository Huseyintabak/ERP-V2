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

async function fixAllMissingMovements() {
  console.log('🔧 TÜM EKSİK STOK HAREKETLERİNİ DÜZELTİYOR\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Tüm production log'ları al
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced, timestamp, operator_id')
      .order('timestamp', { ascending: true })
      .limit(500);

    if (!allLogs || allLogs.length === 0) {
      console.log('⚠️  Production log bulunamadı!\n');
      return;
    }

    console.log(`📝 Toplam ${allLogs.length} production log bulundu\n`);
    console.log('🔍 Kontrol ediliyor...\n');

    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const log of allLogs) {
      try {
        // Bu log için nihai ürün stok hareketi var mı kontrol et
        const { data: existingFinished } = await supabase
          .from('stock_movements')
          .select('id')
          .eq('production_log_id', log.id)
          .eq('material_type', 'finished')
          .limit(1)
          .single();

        // Plan bilgisini al
        const { data: planData } = await supabase
          .from('production_plans')
          .select('product_id, planned_quantity')
          .eq('id', log.plan_id)
          .single();

        if (!planData) {
          console.log(`   ⚠️  Log ${log.id.substring(0, 8)}...: Plan bulunamadı, atlanıyor`);
          skippedCount++;
          continue;
        }

        // Nihai ürün stok hareketi yoksa oluştur
        if (!existingFinished) {
          // Mevcut stoku al
          const { data: productData } = await supabase
            .from('finished_products')
            .select('quantity, name')
            .eq('id', planData.product_id)
            .single();

          if (!productData) {
            console.log(`   ⚠️  Log ${log.id.substring(0, 8)}...: Ürün bulunamadı`);
            skippedCount++;
            continue;
          }

          // Stok hesaplama (basit yaklaşım - gerçek stoktan geriye gidiyoruz)
          const currentQty = parseFloat(productData.quantity || 0);
          const beforeQty = currentQty - parseFloat(log.quantity_produced || 0);
          const afterQty = currentQty;

          // Nihai ürün stok hareketi oluştur
          const { error: finishedError } = await supabase
            .from('stock_movements')
            .insert({
              material_type: 'finished',
              material_id: planData.product_id,
              movement_type: 'uretim',
              quantity: parseFloat(log.quantity_produced || 0),
              before_quantity: Math.max(0, beforeQty),
              after_quantity: afterQty,
              user_id: log.operator_id,
              description: `Üretim kaydı: ${log.quantity_produced} adet ${productData.name || 'Ürün'} (Retroaktif düzeltme)`,
              created_at: log.timestamp,
              production_log_id: log.id
            });

          if (finishedError) {
            console.error(`   ❌ Log ${log.id.substring(0, 8)}...: Nihai ürün hareketi oluşturulamadı - ${finishedError.message}`);
            errorCount++;
            continue;
          }

          fixedCount++;
          if (fixedCount % 50 === 0) {
            console.log(`   ✅ ${fixedCount} log düzeltildi...`);
          }
        } else {
          // Varsa sadece production_log_id'yi güncelle
          const { error: updateError } = await supabase
            .from('stock_movements')
            .update({ production_log_id: log.id })
            .eq('id', existingFinished.id)
            .is('production_log_id', null);

          if (!updateError) {
            skippedCount++; // Zaten var, production_log_id güncellendi
          }
        }

        // BOM snapshot'tan malzeme tüketim hareketleri
        const { data: bomSnapshot } = await supabase
          .from('production_plan_bom_snapshot')
          .select('*')
          .eq('plan_id', log.plan_id);

        if (bomSnapshot && bomSnapshot.length > 0) {
          const plannedQty = parseFloat(planData.planned_quantity || 1);

          for (const bomItem of bomSnapshot) {
            // Bu malzeme için stok hareketi var mı kontrol et
            const { data: existingMaterial } = await supabase
              .from('stock_movements')
              .select('id')
              .eq('production_log_id', log.id)
              .eq('material_type', bomItem.material_type)
              .eq('material_id', bomItem.material_id)
              .eq('movement_type', 'uretim')
              .limit(1)
              .single();

            if (!existingMaterial) {
              const consumptionQty = (bomItem.quantity_needed / plannedQty) * parseFloat(log.quantity_produced || 0);

              // Mevcut stoku al
              let tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
              const { data: materialData } = await supabase
                .from(tableName)
                .select('quantity')
                .eq('id', bomItem.material_id)
                .single();

              if (materialData) {
                const currentQty = parseFloat(materialData.quantity || 0);
                const beforeQty = currentQty + consumptionQty; // Geriye gidiyoruz
                const afterQty = currentQty;

                const { error: materialError } = await supabase
                  .from('stock_movements')
                  .insert({
                    material_type: bomItem.material_type,
                    material_id: bomItem.material_id,
                    movement_type: 'uretim',
                    quantity: -consumptionQty,
                    before_quantity: Math.max(0, beforeQty),
                    after_quantity: Math.max(0, afterQty),
                    user_id: log.operator_id,
                    description: `Üretim tüketimi: ${log.quantity_produced} adet için (Retroaktif düzeltme)`,
                    created_at: log.timestamp,
                    production_log_id: log.id
                  });

                if (materialError) {
                  // Sessizce devam et
                }
              }
            }
          }
        }

      } catch (error) {
        console.error(`   ❌ Log ${log.id?.substring(0, 8) || 'unknown'}...: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Düzeltilen: ${fixedCount}`);
    console.log(`   ⏭️  Zaten var: ${skippedCount}`);
    console.log(`   ❌ Hata: ${errorCount}\n`);
    console.log('✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

fixAllMissingMovements();

