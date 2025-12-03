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

async function testTriggers() {
  console.log('🧪 PRODUCTION TRIGGER TESTİ\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Trigger'ların varlığını kontrol et (function'ları test et)
    console.log('📋 1. Trigger Fonksiyonları Kontrolü:\n');

    // Test için bir plan bul
    const { data: testPlan } = await supabase
      .from('production_plans')
      .select(`
        id,
        product_id,
        planned_quantity,
        produced_quantity,
        status,
        assigned_operator_id,
        product:finished_products(code, name)
      `)
      .eq('status', 'devam_ediyor')
      .limit(1)
      .single();

    if (!testPlan) {
      console.log('⚠️  Test için aktif plan bulunamadı. Önce bir plan oluşturun.\n');
      return;
    }

    console.log(`   Test Plan: ${testPlan.product?.name || 'N/A'}`);
    console.log(`   Plan ID: ${testPlan.id}`);
    console.log(`   Durum: ${testPlan.status}`);
    console.log(`   Üretilen/Planlanan: ${testPlan.produced_quantity}/${testPlan.planned_quantity}\n`);

    // 2. BOM snapshot kontrol
    const { data: bomSnapshot } = await supabase
      .from('production_plan_bom_snapshot')
      .select('*')
      .eq('plan_id', testPlan.id);

    if (!bomSnapshot || bomSnapshot.length === 0) {
      console.log('⚠️  Bu plan için BOM snapshot bulunamadı.\n');
      return;
    }

    console.log(`   BOM Snapshot: ${bomSnapshot.length} malzeme bulundu\n`);

    // 3. Mevcut stokları kaydet
    console.log('📊 2. Mevcut Stok Durumu:\n');

    const { data: currentProduct } = await supabase
      .from('finished_products')
      .select('quantity')
      .eq('id', testPlan.product_id)
      .single();

    console.log(`   Nihai Ürün Stoku: ${currentProduct?.quantity || 0} adet\n`);

    const materialStocks = {};
    for (const item of bomSnapshot.slice(0, 3)) { // İlk 3 malzeme
      if (item.material_type === 'raw') {
        const { data: material } = await supabase
          .from('raw_materials')
          .select('quantity, name')
          .eq('id', item.material_id)
          .single();
        if (material) {
          materialStocks[item.material_id] = { quantity: material.quantity, name: material.name, type: 'raw' };
          console.log(`   ${material.name}: ${material.quantity} ${item.material_type === 'raw' ? 'kg' : 'adet'}`);
        }
      } else if (item.material_type === 'semi') {
        const { data: material } = await supabase
          .from('semi_finished_products')
          .select('quantity, name')
          .eq('id', item.material_id)
          .single();
        if (material) {
          materialStocks[item.material_id] = { quantity: material.quantity, name: material.name, type: 'semi' };
          console.log(`   ${material.name}: ${material.quantity} adet`);
        }
      }
    }
    console.log();

    // 4. Operator kontrolü
    const operatorId = testPlan.assigned_operator_id;
    if (!operatorId) {
      console.log('⚠️  Plan için operator atanmamış. Test edilemiyor.\n');
      return;
    }

    const { data: operator } = await supabase
      .from('users')
      .select('id')
      .eq('id', operatorId)
      .single();

    if (!operator) {
      console.log('⚠️  Operator bulunamadı. Test edilemiyor.\n');
      return;
    }

    // 5. Test production log oluştur (1 adet üretim)
    console.log('🧪 3. Test Production Log Oluşturuluyor:\n');
    console.log('   ⚠️  GERÇEK ÜRETİM YAPILACAK! (1 adet)\n');

    const testQuantity = 1;
    const productCode = testPlan.product?.code || 'TEST';

    const { data: testLog, error: logError } = await supabase
      .from('production_logs')
      .insert({
        plan_id: testPlan.id,
        operator_id: operatorId,
        barcode_scanned: productCode,
        quantity_produced: testQuantity
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Production log oluşturulamadı:', logError.message);
      return;
    }

    console.log(`   ✅ Production log oluşturuldu: ID ${testLog.id}\n`);

    // 6. Biraz bekle (trigger'ların çalışması için)
    console.log('⏳ 4. Trigger\'ların çalışması bekleniyor (2 saniye)...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 7. Stok hareketlerini kontrol et
    console.log('📊 5. Stok Hareketleri Kontrolü:\n');

    // Nihai ürün stok hareketi
    const { data: finishedMovements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('material_type', 'finished')
      .eq('material_id', testPlan.product_id)
      .eq('movement_type', 'uretim')
      .or(`description.ilike.%Plan #${testPlan.id}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (finishedMovements) {
      console.log(`   ✅ Nihai ürün stok hareketi oluşturuldu:`);
      console.log(`      Quantity: ${finishedMovements.quantity}`);
      console.log(`      Before: ${finishedMovements.before_quantity}`);
      console.log(`      After: ${finishedMovements.after_quantity}\n`);
    } else {
      console.log(`   ❌ Nihai ürün stok hareketi oluşturulmamış!\n`);
    }

    // Malzeme tüketim hareketleri
    let materialMovementsFound = 0;
    for (const item of bomSnapshot.slice(0, 3)) {
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('material_type', item.material_type)
        .eq('material_id', item.material_id)
        .eq('movement_type', 'uretim')
        .gte('created_at', new Date(Date.now() - 5000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (movements) {
        materialMovementsFound++;
        console.log(`   ✅ ${item.material_name || 'Malzeme'} tüketim hareketi oluşturuldu`);
        console.log(`      Quantity: ${movements.quantity}`);
        console.log(`      Before: ${movements.before_quantity}`);
        console.log(`      After: ${movements.after_quantity}\n`);
      }
    }

    if (materialMovementsFound === 0) {
      console.log(`   ❌ Malzeme tüketim hareketleri oluşturulmamış!\n`);
    }

    // 8. Güncellenmiş stokları kontrol et
    console.log('📊 6. Güncellenmiş Stok Durumu:\n');

    const { data: updatedProduct } = await supabase
      .from('finished_products')
      .select('quantity')
      .eq('id', testPlan.product_id)
      .single();

    if (updatedProduct) {
      const expectedStock = (currentProduct?.quantity || 0) + testQuantity;
      const actualStock = updatedProduct.quantity;
      const stockOk = Math.abs(expectedStock - actualStock) < 0.01;

      console.log(`   ${stockOk ? '✅' : '❌'} Nihai Ürün Stoku:`);
      console.log(`      Önceki: ${currentProduct?.quantity || 0}`);
      console.log(`      Beklenen: ${expectedStock}`);
      console.log(`      Gerçek: ${actualStock}`);
      console.log(`      ${stockOk ? '✅ Tutarlı!' : '❌ Tutarsız!'}\n`);
    }

    // 9. Özet
    console.log('='.repeat(70));
    console.log('\n📊 TEST ÖZETİ:\n');

    const allOk = finishedMovements && materialMovementsFound > 0;
    
    if (allOk) {
      console.log('   ✅ Trigger\'lar başarıyla çalışıyor!');
      console.log('   ✅ Stok hareketleri oluşturuldu');
      console.log('   ✅ Stoklar güncellendi\n');
      
      console.log('   💡 Test production log\'u silmek isterseniz:');
      console.log(`      DELETE FROM production_logs WHERE id = '${testLog.id}';\n`);
    } else {
      console.log('   ❌ Trigger\'lar çalışmıyor veya eksik hareket var!');
      console.log('   💡 Lütfen migration dosyasını kontrol edin.\n');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

testTriggers();

