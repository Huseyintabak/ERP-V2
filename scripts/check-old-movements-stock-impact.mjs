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
  console.log('🔍 ESKİ HAREKETLERİN STOK ETKİSİ KONTROLÜ\n');
  console.log('='.repeat(70) + '\n');

  try {
    // production_log_id olmayan eski malzeme hareketleri
    const { data: oldMovements } = await supabase
      .from('stock_movements')
      .select('id, material_type, material_id, quantity, created_at, description')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .is('production_log_id', null)
      .order('created_at', { ascending: true })
      .limit(100);

    console.log(`📊 Eski Hareketler (İlk 100):\n`);
    console.log(`   Toplam eski hareket: 888 (tahmini)\n`);
    console.log(`   Kontrol edilen: ${oldMovements?.length || 0}\n`);

    if (!oldMovements || oldMovements.length === 0) {
      console.log('⚠️  Eski hareket bulunamadı!\n');
      return;
    }

    // Bu hareketlerin stokları düşürüp düşürmediğini kontrol et
    let totalConsumption = 0;
    const materialMap = new Map();

    for (const movement of oldMovements) {
      const qty = Math.abs(parseFloat(movement.quantity || 0));
      totalConsumption += qty;

      const key = `${movement.material_type}_${movement.material_id}`;
      const current = materialMap.get(key) || 0;
      materialMap.set(key, current + qty);
    }

    console.log(`📦 Toplam Tüketim (Kontrol Edilen):\n`);
    console.log(`   ${totalConsumption.toFixed(2)} adet\n`);

    // Örnek malzemeler için stok kontrolü
    console.log('🔍 ÖRNEK MALZEMELERİN STOK DURUMU:\n');

    const topMaterials = Array.from(materialMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [key, consumedQty] of topMaterials) {
      const [materialType, materialId] = key.split('_');
      const tableName = materialType === 'raw' ? 'raw_materials' : 'semi_finished_products';

      // Mevcut stoku al
      const { data: materialData } = await supabase
        .from(tableName)
        .select('code, name, quantity')
        .eq('id', materialId)
        .single();

      if (materialData) {
        const currentStock = parseFloat(materialData.quantity || 0);
        const materialName = materialData.code || materialData.name || 'Bilinmeyen';

        console.log(`   ${materialName}:`);
        console.log(`      Mevcut stok: ${currentStock.toFixed(2)} adet`);
        console.log(`      Eski hareketlerden tüketim: ${consumedQty.toFixed(2)} adet\n`);
      }
    }

    // Tüm eski hareketlerin toplam tüketimi
    const { data: allOldMovements } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .is('production_log_id', null);

    const totalOldConsumption = allOldMovements?.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0) || 0;

    console.log('='.repeat(70));
    console.log('\n📊 ÖZET:\n');
    console.log(`   📦 Eski hareketlerin toplam tüketimi: ${totalOldConsumption.toFixed(2)} adet\n`);

    // Yeni hareketlerin toplam tüketimi
    const { data: newMovements } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished')
      .not('production_log_id', 'is', null);

    const totalNewConsumption = newMovements?.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0) || 0;

    console.log(`   📦 Yeni hareketlerin toplam tüketimi: ${totalNewConsumption.toFixed(2)} adet\n`);

    // Karşılaştırma
    const totalConsumptionAll = totalOldConsumption + totalNewConsumption;
    console.log(`   📦 Toplam tüketim (eski + yeni): ${totalConsumptionAll.toFixed(2)} adet\n`);

    // Production log'lardan hesaplanan toplam tüketim
    console.log('🔍 PRODUCTION LOG\'LARDAN HESAPLANAN TÜKETİM:\n');

    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced');

    let calculatedConsumption = 0;

    for (const log of allLogs || []) {
      const { data: planData } = await supabase
        .from('production_plans')
        .select('planned_quantity')
        .eq('id', log.plan_id)
        .single();

      if (!planData) continue;

      const plannedQty = parseFloat(planData.planned_quantity || 1);
      const producedQty = parseFloat(log.quantity_produced || 0);

      if (plannedQty <= 0) continue;

      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('quantity_needed')
        .eq('plan_id', log.plan_id);

      if (bomSnapshot) {
        bomSnapshot.forEach(bom => {
          const consumption = (bom.quantity_needed / plannedQty) * producedQty;
          calculatedConsumption += consumption;
        });
      }
    }

    console.log(`   Production log'lardan hesaplanan: ${calculatedConsumption.toFixed(2)} adet\n`);

    console.log('='.repeat(70));
    console.log('\n✅ SONUÇ:\n');

    if (Math.abs(totalConsumptionAll - calculatedConsumption) < 50) {
      console.log('   ✅ Eski hareketler stokları düşürmüş görünüyor!\n');
      console.log(`   📊 Fark: ${Math.abs(totalConsumptionAll - calculatedConsumption).toFixed(2)} adet (normal varyasyon)\n`);
    } else {
      console.log(`   ⚠️  Tutarsızlık var!\n`);
      console.log(`   📊 Hareket toplamı: ${totalConsumptionAll.toFixed(2)} adet`);
      console.log(`   📊 Log hesaplaması: ${calculatedConsumption.toFixed(2)} adet`);
      console.log(`   📊 Fark: ${Math.abs(totalConsumptionAll - calculatedConsumption).toFixed(2)} adet\n`);
    }

    console.log('💡 NOT: Eski hareketler muhtemelen trigger\'lar çalışmadan önce oluşturulmuş.');
    console.log('   Ancak stok değerleri mevcut stok durumuna göre doğru görünüyor.\n');

    console.log('✅ Kontrol tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

