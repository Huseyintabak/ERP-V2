import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixMissingStocks() {
  console.log('🔧 EKSİK STOK HAREKETLERİ DÜZELTİLİYOR...\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Eksik planları bul veya JSON'dan oku
    let missingPlans;

    const jsonFile = join(__dirname, '..', 'missing-stock-movements.json');
    try {
      const fileContent = readFileSync(jsonFile, 'utf8');
      missingPlans = JSON.parse(fileContent);
      console.log(`📄 ${missingPlans.length} plan JSON dosyasından yüklendi.\n`);
    } catch {
      console.log('⚠️  JSON dosyası bulunamadı, tüm planlar taranacak...\n');
      // Bu durumda find-missing script'ini çalıştırmak gerekir
      return;
    }

    if (!missingPlans || missingPlans.length === 0) {
      console.log('✅ Düzeltilecek plan bulunamadı!\n');
      return;
    }

    console.log(`🔧 ${missingPlans.length} plan için stok hareketleri oluşturulacak...\n`);
    console.log('='.repeat(70) + '\n');

    let fixedCount = 0;
    let errorCount = 0;

    // Her planı tek tek düzelt
    for (let i = 0; i < missingPlans.length; i++) {
      const plan = missingPlans[i];
      
      console.log(`\n[${i + 1}/${missingPlans.length}] Plan #${plan.plan_id.substring(0, 8)}...`);
      console.log(`   Ürün: ${plan.product} (${plan.order})`);

      try {
        // 1. Nihai ürün stok hareketi oluştur
        if (plan.missing_finished) {
          console.log(`   📝 Nihai ürün stok hareketi oluşturuluyor...`);

          // Önceki stoku hesapla
          const { data: previousLogs } = await supabase
            .from('production_logs')
            .select('quantity_produced')
            .eq('plan_id', plan.plan_id)
            .lt('timestamp', plan.log_time);

          const beforeQty = previousLogs?.reduce((sum, l) => sum + parseFloat(l.quantity_produced || 0), 0) || 0;
          const afterQty = beforeQty + plan.produced;

          // Mevcut stoku kontrol et
          const { data: currentProduct } = await supabase
            .from('finished_products')
            .select('quantity')
            .eq('id', plan.product_id)
            .single();

          // Stok hareketi oluştur
          const { error: finishedError } = await supabase
            .from('stock_movements')
            .insert({
              material_type: 'finished',
              material_id: plan.product_id,
              movement_type: 'uretim',
              quantity: plan.produced,
              before_quantity: parseFloat(beforeQty.toFixed(2)),
              after_quantity: parseFloat(afterQty.toFixed(2)),
              user_id: plan.operator_id,
              description: `Üretim kaydı: Plan #${plan.plan_id}`,
              created_at: plan.log_time
            });

          if (finishedError) {
            console.error(`      ❌ Hata: ${finishedError.message}`);
          } else {
            console.log(`      ✅ Nihai ürün stok hareketi oluşturuldu (${plan.produced} adet)`);
          }
        }

        // 2. Malzeme tüketim hareketleri oluştur
        if (plan.missing_materials && plan.missing_materials.length > 0) {
          console.log(`   📦 ${plan.missing_materials.length} malzeme için tüketim hareketleri oluşturuluyor...`);

          for (const bomItem of plan.missing_materials) {
            const consumptionQty = parseFloat(bomItem.expected_consumption.toFixed(2));

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

            // Bu malzeme için bu plan zamanından sonraki tüketimleri hesapla
            const { data: futureMovements } = await supabase
              .from('stock_movements')
              .select('quantity, movement_type')
              .eq('material_id', bomItem.material_id)
              .eq('material_type', bomItem.material_type)
              .gt('created_at', plan.log_time);

            let futureQty = 0;
            if (futureMovements) {
              futureMovements.forEach(m => {
                const qty = parseFloat(m.quantity || 0);
                if (m.movement_type === 'giris' || (m.movement_type === 'uretim' && qty > 0)) {
                  futureQty -= qty; // Girişler gelecekte azaltır
                } else {
                  futureQty += Math.abs(qty); // Çıkışlar gelecekte artırır
                }
              });
            }

            const beforeQty = currentQty + futureQty; // Tüketim öncesi stok
            const afterQty = beforeQty - consumptionQty; // Tüketim sonrası stok

            // Stok hareketi oluştur
            const { error: materialError } = await supabase
              .from('stock_movements')
              .insert({
                material_type: bomItem.material_type,
                material_id: bomItem.material_id,
                movement_type: 'uretim',
                quantity: -consumptionQty,
                before_quantity: parseFloat(beforeQty.toFixed(2)),
                after_quantity: parseFloat(afterQty.toFixed(2)),
                user_id: plan.operator_id,
                description: `Üretim tüketimi: ${plan.produced} adet ${plan.product} için (Plan #${plan.plan_id})`,
                created_at: plan.log_time
              });

            if (materialError) {
              console.error(`      ❌ ${bomItem.material_name}: ${materialError.message}`);
            } else {
              console.log(`      ✅ ${bomItem.material_name}: ${consumptionQty.toFixed(2)} tüketildi`);
            }
          }
        }

        fixedCount++;

      } catch (error) {
        console.error(`   ❌ Plan düzeltilirken hata: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 ÖZET:\n');
    console.log(`   ✅ Başarıyla düzeltildi: ${fixedCount}`);
    console.log(`   ❌ Hata alan: ${errorCount}`);
    console.log(`   📋 Toplam: ${missingPlans.length}\n`);

    // Doğrulama
    console.log('🔍 Düzeltme sonrası doğrulama yapılıyor...\n');
    
    // Rastgele birkaç plan kontrol et
    const samplePlans = missingPlans.slice(0, Math.min(5, missingPlans.length));
    for (const plan of samplePlans) {
      const { count: finishedCount } = await supabase
        .from('stock_movements')
        .select('*', { count: 'exact', head: true })
        .eq('material_id', plan.product_id)
        .eq('material_type', 'finished')
        .eq('movement_type', 'uretim')
        .or(`description.ilike.%Plan #${plan.plan_id}%`);

      console.log(`   Plan #${plan.plan_id.substring(0, 8)}...: ${finishedCount > 0 ? '✅' : '❌'}`);
    }

    console.log('\n✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

fixMissingStocks();

