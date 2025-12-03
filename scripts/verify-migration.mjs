import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Environment variables bulunamadı!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyMigration() {
  console.log('🔍 Migration sonrası doğrulama yapılıyor...\n');

  try {
    // 1. Test: Ondalıklı bir stok hareketi oluşturmayı dene
    console.log('📝 Test 1: Ondalıklı değer kaydediliyor...\n');

    // Önce bir test malzemesi ve kullanıcı bul
    const { data: testMaterial } = await supabase
      .from('raw_materials')
      .select('id, name, quantity')
      .limit(1)
      .single();

    const { data: testUser } = await supabase
      .from('users')
      .select('id, name')
      .limit(1)
      .single();

    if (!testMaterial || !testUser) {
      console.log('⚠️  Test için hammadde veya kullanıcı bulunamadı.');
      return;
    }

    console.log(`   Test malzemesi: ${testMaterial.name} (${testMaterial.id})`);
    console.log(`   Test kullanıcı: ${testUser.name || testUser.id}`);
    
    // Ondalıklı before/after değerleri ile test hareketi oluştur
    const testBeforeQty = 1525.01;
    const testAfterQty = 1524.51;
    const testQuantity = -0.5;

    const { data: testMovement, error: testError } = await supabase
      .from('stock_movements')
      .insert({
        material_type: 'raw',
        material_id: testMaterial.id,
        movement_type: 'cikis',
        quantity: testQuantity,
        before_quantity: testBeforeQty,
        after_quantity: testAfterQty,
        user_id: testUser.id,
        description: 'Migration test - ondalıklı değer testi (SİLİNEBİLİR)'
      })
      .select()
      .single();

    if (testError) {
      console.error('❌ Test başarısız:', testError.message);
      
      if (testError.message.includes('integer')) {
        console.error('⚠️  Migration tamamlanmamış görünüyor. Kolonlar hala INTEGER olabilir.');
      }
      return false;
    }

    console.log('✅ Test başarılı! Ondalıklı değerler kaydedildi:');
    console.log(`   before_quantity: ${testMovement.before_quantity}`);
    console.log(`   after_quantity: ${testMovement.after_quantity}`);
    console.log(`   quantity: ${testMovement.quantity}\n`);

    // Test kaydını temizle
    await supabase
      .from('stock_movements')
      .delete()
      .eq('id', testMovement.id);

    console.log('🧹 Test kaydı temizlendi.\n');

    // 2. View'ın çalıştığını kontrol et
    console.log('📊 Test 2: stock_movements_detailed view kontrolü...\n');

    const { data: viewData, error: viewError } = await supabase
      .from('stock_movements_detailed')
      .select('id, material_name, before_quantity, after_quantity')
      .limit(5);

    if (viewError) {
      console.error('❌ View hatası:', viewError.message);
      return false;
    }

    console.log(`✅ View çalışıyor! ${viewData?.length || 0} kayıt bulundu.`);
    if (viewData && viewData.length > 0) {
      console.log('   Örnek kayıtlar:');
      viewData.slice(0, 3).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.material_name || 'Bilinmeyen'}`);
        console.log(`      before: ${record.before_quantity}, after: ${record.after_quantity}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration başarıyla doğrulandı!');
    console.log('📌 Artık ondalıklı değerler (örn: 1525.01) kaydedilebilir.\n');

    return true;

  } catch (error) {
    console.error('❌ Doğrulama hatası:', error.message);
    return false;
  }
}

verifyMigration();

