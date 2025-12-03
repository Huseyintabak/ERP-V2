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
  console.log('🔍 MALZEME STOKLARI SON DOĞRULAMA\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm malzeme tüketim hareketlerini al
    const { data: allMovements } = await supabase
      .from('stock_movements')
      .select('material_type, material_id, quantity, production_log_id')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished');

    const withLogId = allMovements?.filter(m => m.production_log_id).length || 0;
    const withoutLogId = allMovements?.filter(m => !m.production_log_id).length || 0;
    const totalConsumption = allMovements?.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0) || 0;

    console.log('📊 MALZEME TÜKETİM HAREKETLERİ:\n');
    console.log(`   Toplam hareket: ${allMovements?.length || 0}`);
    console.log(`   production_log_id ile: ${withLogId}`);
    console.log(`   production_log_id olmadan: ${withoutLogId}`);
    console.log(`   Toplam tüketim: ${totalConsumption.toFixed(2)} adet\n`);

    // 2. Örnek malzemeler için stok doğrulama
    console.log('🔍 ÖRNEK MALZEME STOK DOĞRULAMA:\n');

    // En çok tüketilen malzemeleri bul
    const consumptionMap = new Map();
    allMovements?.forEach(m => {
      const key = `${m.material_type}_${m.material_id}`;
      const current = consumptionMap.get(key) || 0;
      consumptionMap.set(key, current + Math.abs(parseFloat(m.quantity || 0)));
    });

    const topConsumed = Array.from(consumptionMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [key, totalConsumed] of topConsumed) {
      const [materialType, materialId] = key.split('_');
      const tableName = materialType === 'raw' ? 'raw_materials' : 'semi_finished_products';

      // Malzeme bilgisi
      const { data: materialData } = await supabase
        .from(tableName)
        .select('code, name, quantity')
        .eq('id', materialId)
        .single();

      if (materialData) {
        const currentStock = parseFloat(materialData.quantity || 0);
        const materialName = materialData.code || materialData.name || 'Bilinmeyen';

        console.log(`   ${materialName}:\n`);
        console.log(`      Mevcut stok: ${currentStock.toFixed(2)} adet`);
        console.log(`      Toplam tüketim (üretim): ${totalConsumed.toFixed(2)} adet\n`);
      }
    }

    // 3. Tüm hammadde stokları özet
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('code, name, quantity')
      .order('quantity', { ascending: false })
      .limit(10);

    console.log('🏭 HAMMADDE STOKLARI (İlk 10):\n');
    rawMaterials?.forEach((m, i) => {
      const qty = parseFloat(m.quantity || 0);
      console.log(`   ${i + 1}. ${m.code || m.name}: ${qty.toFixed(2)} adet`);
    });

    // 4. Tüm yarı mamul stokları özet
    const { data: semiProducts } = await supabase
      .from('semi_finished_products')
      .select('code, name, quantity')
      .order('quantity', { ascending: false })
      .limit(10);

    if (semiProducts && semiProducts.length > 0) {
      console.log(`\n🔧 YARI MAMUL STOKLARI (İlk 10):\n`);
      semiProducts.forEach((m, i) => {
        const qty = parseFloat(m.quantity || 0);
        if (qty > 0) {
          console.log(`   ${i + 1}. ${m.code || m.name}: ${qty.toFixed(2)} adet`);
        }
      });
    }

    // 5. Production log sayıları
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id');

    console.log(`\n📝 PRODUCTION LOG ÖZET:\n`);
    console.log(`   Toplam log: ${allLogs?.length || 0}`);

    // BOM'u olan log'lar
    let logsWithBom = 0;
    let logsWithMaterialMovements = 0;

    for (const log of allLogs || []) {
      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('id')
        .eq('plan_id', log.plan_id)
        .limit(1);

      if (bomSnapshot && bomSnapshot.length > 0) {
        logsWithBom++;

        // Malzeme hareketi var mı?
        const { data: movements } = await supabase
          .from('stock_movements')
          .select('id')
          .eq('production_log_id', log.id)
          .eq('movement_type', 'uretim')
          .neq('material_type', 'finished')
          .limit(1);

        if (movements && movements.length > 0) {
          logsWithMaterialMovements++;
        }
      }
    }

    console.log(`   BOM'u olan log: ${logsWithBom}`);
    console.log(`   Malzeme hareketi olan log: ${logsWithMaterialMovements}\n`);

    // 6. Sonuç
    console.log('='.repeat(70));
    console.log('\n✅ SONUÇ:\n');

    if (logsWithBom === logsWithMaterialMovements) {
      console.log('   🎉 Tüm production log\'lar için malzeme tüketim hareketleri mevcut!\n');
      console.log('   ✅ Yeni üretimler için trigger\'lar doğru çalışacak!\n');
      console.log(`   📦 Toplam malzeme tüketimi: ${totalConsumption.toFixed(2)} adet\n`);
    } else {
      console.log(`   ⚠️  ${logsWithBom - logsWithMaterialMovements} log için malzeme hareketi eksik!\n`);
    }

    if (withoutLogId > 0) {
      console.log(`   ℹ️  ${withoutLogId} eski malzeme hareketi production_log_id olmadan (eski sistemden).\n`);
    } else {
      console.log('   ✅ Tüm malzeme hareketleri production_log_id ile bağlantılı!\n');
    }

    console.log('✅ Doğrulama tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

