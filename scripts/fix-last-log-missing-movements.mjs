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

async function fixLastLog() {
  console.log('🔧 SON LOG İÇİN EKSİK STOK HAREKETLERİ OLUŞTURULUYOR\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Son production log'u bul
    const { data: lastLog } = await supabase
      .from('production_logs')
      .select(`
        id,
        plan_id,
        quantity_produced,
        timestamp,
        operator_id,
        plan:production_plans(
          id,
          product_id,
          planned_quantity,
          product:finished_products(name, code)
        )
      `)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (!lastLog || !lastLog.plan) {
      console.log('⚠️  Production log bulunamadı.\n');
      return;
    }

    console.log('📋 Son Production Log:\n');
    console.log(`   Plan ID: ${lastLog.plan_id}`);
    console.log(`   Ürün: ${lastLog.plan.product?.name || 'N/A'}`);
    console.log(`   Üretilen: ${lastLog.quantity_produced} adet\n`);

    // BOM snapshot
    const { data: bomSnapshot } = await supabase
      .from('production_plan_bom_snapshot')
      .select('*')
      .eq('plan_id', lastLog.plan_id);

    if (!bomSnapshot || bomSnapshot.length === 0) {
      console.log('⚠️  BOM snapshot bulunamadı.\n');
      return;
    }

    console.log(`📦 BOM Snapshot: ${bomSnapshot.length} malzeme bulundu\n`);

    // Malzeme tüketim hareketlerini kontrol et
    let fixedCount = 0;
    let errorCount = 0;

    for (const item of bomSnapshot) {
      // Bu malzeme için hareket var mı?
      const { data: existingMovement } = await supabase
        .from('stock_movements')
        .select('id')
        .eq('material_type', item.material_type)
        .eq('material_id', item.material_id)
        .eq('movement_type', 'uretim')
        .or(`description.ilike.%Plan #${lastLog.plan_id}%,description.ilike.%plan #${lastLog.plan_id}%`)
        .limit(1)
        .single();

      if (existingMovement) {
        console.log(`   ⏭️  ${item.material_name || item.material_code}: Zaten var, atlanıyor`);
        continue;
      }

      // Tüketim miktarı hesapla
      const consumptionQty = (parseFloat(item.quantity_needed) / parseFloat(lastLog.plan.planned_quantity)) * parseFloat(lastLog.quantity_produced);

      // Mevcut stoku al
      let currentQty = 0;
      if (item.material_type === 'raw') {
        const { data: material } = await supabase
          .from('raw_materials')
          .select('quantity')
          .eq('id', item.material_id)
          .single();
        currentQty = parseFloat(material?.quantity || 0);
      } else if (item.material_type === 'semi') {
        const { data: material } = await supabase
          .from('semi_finished_products')
          .select('quantity')
          .eq('id', item.material_id)
          .single();
        currentQty = parseFloat(material?.quantity || 0);
      }

      // Bu log'dan sonraki hareketleri hesapla (geriye doğru)
      const { data: futureMovements } = await supabase
        .from('stock_movements')
        .select('quantity, movement_type')
        .eq('material_id', item.material_id)
        .eq('material_type', item.material_type)
        .gt('created_at', lastLog.timestamp);

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

      const beforeQty = currentQty + futureQty + consumptionQty; // Tüketim öncesi
      const afterQty = beforeQty - consumptionQty; // Tüketim sonrası

      // Stok hareketi oluştur
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          material_type: item.material_type,
          material_id: item.material_id,
          movement_type: 'uretim',
          quantity: -consumptionQty,
          before_quantity: parseFloat(beforeQty.toFixed(2)),
          after_quantity: parseFloat(afterQty.toFixed(2)),
          user_id: lastLog.operator_id,
          description: `Üretim tüketimi: ${lastLog.quantity_produced} adet ${lastLog.plan.product?.name || 'Ürün'} için (Plan #${lastLog.plan_id})`,
          created_at: lastLog.timestamp
        });

      if (movementError) {
        console.error(`   ❌ ${item.material_name || item.material_code}: ${movementError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ ${item.material_name || item.material_code}: ${consumptionQty.toFixed(2)} tüketildi`);
        fixedCount++;
      }
    }

    // Nihai ürün hareketi kontrol et ve before/after ekle
    console.log('\n📊 Nihai Ürün Stok Hareketi Kontrolü:\n');

    const { data: finishedMovement } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('material_type', 'finished')
      .eq('material_id', lastLog.plan.product_id)
      .eq('movement_type', 'uretim')
      .or(`description.ilike.%Plan #${lastLog.plan_id}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (finishedMovement && (finishedMovement.before_quantity === null || finishedMovement.after_quantity === null)) {
      // Önceki stoku hesapla
      const { data: previousLogs } = await supabase
        .from('production_logs')
        .select('quantity_produced')
        .eq('plan_id', lastLog.plan_id)
        .lt('timestamp', lastLog.timestamp);

      const beforeQty = previousLogs?.reduce((sum, l) => sum + parseFloat(l.quantity_produced || 0), 0) || 0;
      const afterQty = beforeQty + parseFloat(lastLog.quantity_produced);

      // Güncelle
      const { error: updateError } = await supabase
        .from('stock_movements')
        .update({
          before_quantity: parseFloat(beforeQty.toFixed(2)),
          after_quantity: parseFloat(afterQty.toFixed(2))
        })
        .eq('id', finishedMovement.id);

      if (updateError) {
        console.error(`   ❌ Nihai ürün hareketi güncellenemedi: ${updateError.message}\n`);
      } else {
        console.log(`   ✅ Nihai ürün hareketi güncellendi: Before=${beforeQty}, After=${afterQty}\n`);
      }
    } else if (finishedMovement) {
      console.log(`   ✅ Nihai ürün hareketi zaten güncel (before/after mevcut)\n`);
    } else {
      // Nihai ürün hareketi hiç yoksa oluştur
      const { data: previousLogs } = await supabase
        .from('production_logs')
        .select('quantity_produced')
        .eq('plan_id', lastLog.plan_id)
        .lt('timestamp', lastLog.timestamp);

      const beforeQty = previousLogs?.reduce((sum, l) => sum + parseFloat(l.quantity_produced || 0), 0) || 0;
      const afterQty = beforeQty + parseFloat(lastLog.quantity_produced);

      const { error: insertError } = await supabase
        .from('stock_movements')
        .insert({
          material_type: 'finished',
          material_id: lastLog.plan.product_id,
          movement_type: 'uretim',
          quantity: parseFloat(lastLog.quantity_produced),
          before_quantity: parseFloat(beforeQty.toFixed(2)),
          after_quantity: parseFloat(afterQty.toFixed(2)),
          user_id: lastLog.operator_id,
          description: `Üretim kaydı: ${lastLog.quantity_produced} adet ${lastLog.plan.product?.name || 'Ürün'} (Plan #${lastLog.plan_id})`,
          created_at: lastLog.timestamp
        });

      if (insertError) {
        console.error(`   ❌ Nihai ürün hareketi oluşturulamadı: ${insertError.message}\n`);
      } else {
        console.log(`   ✅ Nihai ürün hareketi oluşturuldu: Before=${beforeQty}, After=${afterQty}\n`);
        fixedCount++;
      }
    }

    console.log('='.repeat(70));
    console.log('\n📊 ÖZET:\n');
    console.log(`   ✅ Başarıyla oluşturuldu: ${fixedCount}`);
    console.log(`   ❌ Hata alan: ${errorCount}`);
    console.log(`   📋 Toplam: ${bomSnapshot.length} malzeme\n`);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

fixLastLog();

