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

async function verifyTriggers() {
  console.log('🔍 SON PRODUCTION LOG\'DAN TRIGGER DOĞRULAMA\n');
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
    console.log(`   Üretilen: ${lastLog.quantity_produced} adet`);
    console.log(`   Tarih: ${lastLog.timestamp}\n`);

    // Nihai ürün stok hareketi kontrol
    console.log('📊 1. Nihai Ürün Stok Hareketi:\n');

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

    if (finishedMovement) {
      const timeDiff = Math.abs(new Date(finishedMovement.created_at) - new Date(lastLog.timestamp)) / 1000;
      const isRecent = timeDiff < 60; // 60 saniye içinde

      console.log(`   ${isRecent ? '✅' : '⚠️ '} Stok hareketi bulundu:`);
      console.log(`      ID: ${finishedMovement.id}`);
      console.log(`      Quantity: ${finishedMovement.quantity}`);
      console.log(`      Before: ${finishedMovement.before_quantity}`);
      console.log(`      After: ${finishedMovement.after_quantity}`);
      console.log(`      Zaman farkı: ${timeDiff.toFixed(1)} saniye`);
      console.log(`      ${isRecent ? '✅ Yakın zamanda oluşturulmuş' : '⚠️  Eski kayıt (trigger çalışmamış olabilir)'}\n`);
    } else {
      console.log('   ❌ Nihai ürün stok hareketi bulunamadı!\n');
      console.log('   ⚠️  Trigger çalışmamış olabilir.\n');
    }

    // BOM snapshot ve malzeme tüketim kontrolü
    console.log('📊 2. Malzeme Tüketim Hareketleri:\n');

    const { data: bomSnapshot } = await supabase
      .from('production_plan_bom_snapshot')
      .select('material_id, material_type, material_name, material_code')
      .eq('plan_id', lastLog.plan_id);

    let foundCount = 0;
    let missingCount = 0;

    if (!bomSnapshot || bomSnapshot.length === 0) {
      console.log('   ⚠️  BOM snapshot bulunamadı.\n');
      foundCount = 0;
      missingCount = 0;
    } else {
      console.log(`   BOM Snapshot: ${bomSnapshot.length} malzeme\n`);

      for (const item of bomSnapshot.slice(0, 5)) { // İlk 5 malzeme
        const { data: movement } = await supabase
          .from('stock_movements')
          .select('*')
          .eq('material_type', item.material_type)
          .eq('material_id', item.material_id)
          .eq('movement_type', 'uretim')
          .or(`description.ilike.%Plan #${lastLog.plan_id}%`)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (movement) {
          foundCount++;
          const timeDiff = Math.abs(new Date(movement.created_at) - new Date(lastLog.timestamp)) / 1000;
          console.log(`   ✅ ${item.material_name || item.material_code}`);
          console.log(`      Quantity: ${movement.quantity}, Before: ${movement.before_quantity}, After: ${movement.after_quantity}`);
          if (timeDiff > 60) {
            console.log(`      ⚠️  Zaman farkı: ${timeDiff.toFixed(1)} saniye (eski kayıt olabilir)`);
          }
        } else {
          missingCount++;
          console.log(`   ❌ ${item.material_name || item.material_code}: Hareket bulunamadı`);
        }
        console.log();
      }

      if (bomSnapshot.length > 5) {
        console.log(`   ... ve ${bomSnapshot.length - 5} malzeme daha\n`);
      }

      console.log(`   Özet: ${foundCount} bulundu, ${missingCount} eksik\n`);
    }

    // Sonuç
    console.log('='.repeat(70));
    console.log('\n📊 SONUÇ:\n');

    const hasFinished = !!finishedMovement;
    const hasMaterials = bomSnapshot && bomSnapshot.length > 0 && foundCount > 0;

    if (hasFinished && hasMaterials) {
      console.log('   ✅ Trigger\'lar çalışıyor gibi görünüyor!');
      console.log('   ✅ Stok hareketleri oluşturulmuş.\n');
    } else if (hasFinished && !hasMaterials) {
      console.log('   ⚠️  Nihai ürün hareketi var ama malzeme tüketim hareketleri eksik.');
      console.log('   💡 consume_materials_on_production trigger\'ı çalışmamış olabilir.\n');
    } else if (!hasFinished && hasMaterials) {
      console.log('   ⚠️  Malzeme hareketleri var ama nihai ürün hareketi eksik.');
      console.log('   💡 update_stock_on_production trigger\'ı çalışmamış olabilir.\n');
    } else {
      console.log('   ❌ Trigger\'lar çalışmamış görünüyor.');
      console.log('   💡 Migration\'ı kontrol edin veya yeniden çalıştırın.\n');
    }

    console.log('💡 Yeni bir production log oluşturarak trigger\'ları test edebilirsiniz.\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

verifyTriggers();

