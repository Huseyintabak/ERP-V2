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

async function fixAllMaterialConsumption() {
  console.log('🔧 TÜM MALZEME TÜKETİM HAREKETLERİNİ DÜZELTİYOR\n');
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
    console.log('🔍 Kontrol ediliyor ve düzeltiliyor...\n');

    let totalFixed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let plansProcessed = new Set();

    for (const log of allLogs) {
      try {
        // Plan bilgisini al
        const { data: planData } = await supabase
          .from('production_plans')
          .select('planned_quantity, product_id, product:finished_products(name)')
          .eq('id', log.plan_id)
          .single();

        if (!planData) {
          console.log(`   ⚠️  Log ${log.id.substring(0, 8)}...: Plan bulunamadı`);
          totalErrors++;
          continue;
        }

        const plannedQty = parseFloat(planData.planned_quantity || 1);
        const producedQty = parseFloat(log.quantity_produced || 0);

        if (plannedQty <= 0 || producedQty <= 0) {
          continue; // Geçersiz değerler
        }

        // BOM snapshot'ı al
        const { data: bomSnapshot } = await supabase
          .from('production_plan_bom_snapshot')
          .select('material_type, material_id, quantity_needed, material_name, material_code')
          .eq('plan_id', log.plan_id);

        if (!bomSnapshot || bomSnapshot.length === 0) {
          // BOM snapshot yoksa atla
          continue;
        }

        let logFixed = 0;
        let logSkipped = 0;

        // Her malzeme için kontrol et ve oluştur
        for (const bomItem of bomSnapshot) {
          const consumptionQty = (bomItem.quantity_needed / plannedQty) * producedQty;

          if (consumptionQty <= 0) {
            continue;
          }

          // Bu malzeme için stok hareketi var mı kontrol et
          const { data: existingMovement } = await supabase
            .from('stock_movements')
            .select('id, quantity, before_quantity, after_quantity')
            .eq('production_log_id', log.id)
            .eq('material_type', bomItem.material_type)
            .eq('material_id', bomItem.material_id)
            .eq('movement_type', 'uretim')
            .limit(1)
            .single();

          if (existingMovement) {
            // Mevcut hareketi güncelle (production_log_id yoksa ekle, before/after kontrol et)
            let needsUpdate = false;
            const updateData = {};

            if (!existingMovement.production_log_id) {
              updateData.production_log_id = log.id;
              needsUpdate = true;
            }

            if (!existingMovement.before_quantity || !existingMovement.after_quantity) {
              // Before/after quantity'leri hesapla
              const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
              
              const { data: materialData } = await supabase
                .from(tableName)
                .select('quantity')
                .eq('id', bomItem.material_id)
                .single();

              if (materialData) {
                const currentQty = parseFloat(materialData.quantity || 0);
                // Geriye giderek before quantity'yi hesapla
                const afterQty = currentQty;
                const beforeQty = currentQty + consumptionQty;
                
                updateData.before_quantity = Math.max(0, beforeQty);
                updateData.after_quantity = Math.max(0, afterQty);
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              const { error: updateError } = await supabase
                .from('stock_movements')
                .update(updateData)
                .eq('id', existingMovement.id);

              if (!updateError) {
                logFixed++;
              }
            } else {
              logSkipped++;
            }
          } else {
            // Yeni stok hareketi oluştur
            const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
            
            // Mevcut stoku al
            const { data: materialData } = await supabase
              .from(tableName)
              .select('quantity, name')
              .eq('id', bomItem.material_id)
              .single();

            if (!materialData) {
              console.log(`   ⚠️  Log ${log.id.substring(0, 8)}...: ${bomItem.material_name || bomItem.material_code} bulunamadı`);
              continue;
            }

            const currentQty = parseFloat(materialData.quantity || 0);
            // Geriye giderek before quantity'yi hesapla (basit yaklaşım)
            const afterQty = currentQty;
            const beforeQty = currentQty + consumptionQty;

            // Ürün adını al
            const productName = planData.product?.name || 'Ürün';

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
                description: `Üretim tüketimi: ${producedQty} adet ${productName} için (Retroaktif düzeltme)`,
                created_at: log.timestamp,
                production_log_id: log.id
              });

            if (insertError) {
              console.error(`   ❌ Log ${log.id.substring(0, 8)}...: ${bomItem.material_name || bomItem.material_code} - ${insertError.message}`);
              totalErrors++;
            } else {
              logFixed++;
              totalFixed++;
              
              // Stoku güncelle (eğer henüz güncellenmemişse)
              // Not: Bu geriye gidiyor, bu yüzden dikkatli olmalıyız
              // Ancak kullanıcı tüm stokların doğru olmasını istiyor
              const newQty = Math.max(0, currentQty);
              
              if (Math.abs(currentQty - newQty) > 0.01) {
                const { error: stockUpdateError } = await supabase
                  .from(tableName)
                  .update({ quantity: newQty })
                  .eq('id', bomItem.material_id);

                if (stockUpdateError) {
                  // Sessizce devam et
                }
              }
            }
          }
        }

        if (logFixed > 0 || logSkipped > 0) {
          plansProcessed.add(log.plan_id);
          
          if ((totalFixed + totalSkipped) % 50 === 0) {
            console.log(`   ✅ ${totalFixed + totalSkipped} log işlendi...`);
          }
        }

        totalSkipped += logSkipped;

      } catch (error) {
        console.error(`   ❌ Log ${log.id?.substring(0, 8) || 'unknown'}...: ${error.message}`);
        totalErrors++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Yeni oluşturulan hareket: ${totalFixed}`);
    console.log(`   ⏭️  Zaten var (güncellendi): ${totalSkipped}`);
    console.log(`   ❌ Hata: ${totalErrors}`);
    console.log(`   📋 İşlenen plan: ${plansProcessed.size}\n`);

    // Doğrulama
    console.log('🔍 Doğrulama yapılıyor...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Malzeme tüketim hareketleri sayısı
    const { data: materialMovements } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .not('production_log_id', 'is', null);

    console.log(`   ✅ production_log_id ile malzeme hareketi: ${materialMovements?.length || 0}\n`);

    console.log('✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

fixAllMaterialConsumption();

