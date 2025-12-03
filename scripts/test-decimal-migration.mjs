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

async function testDecimalMigration() {
  console.log('🔍 Migration Sonrası Ondalıklı Değer Testi\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Kolon tiplerini kontrol et (örnek kayıt üzerinden)
    console.log('📋 Test 1: Kolon Tipleri Kontrolü\n');
    
    const { data: sample } = await supabase
      .from('stock_movements')
      .select('id, quantity, before_quantity, after_quantity')
      .not('before_quantity', 'is', null)
      .limit(1)
      .single();

    if (sample) {
      console.log('✅ Örnek kayıt bulundu:');
      console.log(`   quantity: ${sample.quantity} (tip: ${typeof sample.quantity})`);
      console.log(`   before_quantity: ${sample.before_quantity} (tip: ${typeof sample.before_quantity})`);
      console.log(`   after_quantity: ${sample.after_quantity} (tip: ${typeof sample.after_quantity})`);
      
      // Ondalıklı kontrol
      const hasDecimal = sample.before_quantity?.toString().includes('.') || 
                        sample.after_quantity?.toString().includes('.') ||
                        sample.quantity?.toString().includes('.');
      
      if (hasDecimal) {
        console.log('   ✅ Ondalıklı değerler mevcut!');
      } else {
        console.log('   ⚠️  Ondalıklı değer yok (bu normal olabilir)');
      }
    } else {
      console.log('   ⚠️  before_quantity/after_quantity içeren kayıt bulunamadı');
    }
    console.log();

    // 2. Ondalıklı değer kaydetme testi
    console.log('📝 Test 2: Ondalıklı Değer Kaydetme Testi\n');
    
    // Test malzemesi ve kullanıcı bul
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
      console.log('⚠️  Test için malzeme veya kullanıcı bulunamadı.');
      return;
    }

    console.log(`   Test malzemesi: ${testMaterial.name}`);
    console.log(`   Test kullanıcı: ${testUser.name || testUser.id}`);
    
    // Ondalıklı değerler ile test
    const testBeforeQty = 1525.39;
    const testAfterQty = 1524.75;
    const testQuantity = -0.64;

    console.log(`   Test değerleri:`);
    console.log(`   - before_quantity: ${testBeforeQty}`);
    console.log(`   - after_quantity: ${testAfterQty}`);
    console.log(`   - quantity: ${testQuantity}\n`);

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
        description: 'Migration test - ondalıklı değer testi (1525.39 → 1524.75) - SİLİNEBİLİR'
      })
      .select()
      .single();

    if (testError) {
      console.error('❌ Test başarısız:', testError.message);
      
      if (testError.message.includes('integer') || testError.message.includes('numeric')) {
        console.error('⚠️  Migration tamamlanmamış görünüyor!');
        console.error('   Kolonlar hala INTEGER tipinde olabilir.');
        console.error('   Lütfen FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql dosyasını çalıştırın.\n');
      }
      return false;
    }

    console.log('✅ Test başarılı! Ondalıklı değerler kaydedildi:');
    console.log(`   before_quantity: ${testMovement.before_quantity} (${typeof testMovement.before_quantity})`);
    console.log(`   after_quantity: ${testMovement.after_quantity} (${typeof testMovement.after_quantity})`);
    console.log(`   quantity: ${testMovement.quantity} (${typeof testMovement.quantity})\n`);

    // Değerlerin doğru kaydedildiğini kontrol et
    const beforeOk = Math.abs(parseFloat(testMovement.before_quantity) - testBeforeQty) < 0.001;
    const afterOk = Math.abs(parseFloat(testMovement.after_quantity) - testAfterQty) < 0.001;
    const quantityOk = Math.abs(parseFloat(testMovement.quantity) - testQuantity) < 0.001;

    if (beforeOk && afterOk && quantityOk) {
      console.log('✅ Tüm değerler doğru kaydedildi!');
    } else {
      console.log('⚠️  Bazı değerler beklenenden farklı:');
      if (!beforeOk) console.log(`   before_quantity: ${testMovement.before_quantity} != ${testBeforeQty}`);
      if (!afterOk) console.log(`   after_quantity: ${testMovement.after_quantity} != ${testAfterQty}`);
      if (!quantityOk) console.log(`   quantity: ${testMovement.quantity} != ${testQuantity}`);
    }
    console.log();

    // Test kaydını temizle
    await supabase
      .from('stock_movements')
      .delete()
      .eq('id', testMovement.id);

    console.log('🧹 Test kaydı temizlendi.\n');

    // 3. View kontrolü
    console.log('📊 Test 3: stock_movements_detailed View Kontrolü\n');

    const { data: viewData, error: viewError } = await supabase
      .from('stock_movements_detailed')
      .select('id, material_name, before_quantity, after_quantity, quantity')
      .not('before_quantity', 'is', null)
      .limit(5);

    if (viewError) {
      console.error('❌ View hatası:', viewError.message);
      return false;
    }

    console.log(`✅ View çalışıyor! ${viewData?.length || 0} kayıt bulundu.`);
    
    if (viewData && viewData.length > 0) {
      console.log('   Örnek kayıtlar:');
      viewData.slice(0, 3).forEach((record, index) => {
        const hasDecimal = record.before_quantity?.toString().includes('.') || 
                          record.after_quantity?.toString().includes('.');
        const decimalMark = hasDecimal ? '✅' : '  ';
        
        console.log(`   ${decimalMark} ${index + 1}. ${record.material_name || 'Bilinmeyen'}`);
        console.log(`      quantity: ${record.quantity}`);
        console.log(`      before: ${record.before_quantity}, after: ${record.after_quantity}`);
      });
    }
    console.log();

    // 4. Son kontrol - TRX_Siyah_Profil_575 gibi ondalıklı değerli bir malzemenin hareketlerini kontrol et
    console.log('📊 Test 4: Gerçek Ondalıklı Değer Kontrolü (TRX_Siyah_Profil_575)\n');

    const { data: profilMaterial } = await supabase
      .from('raw_materials')
      .select('id, name, code')
      .ilike('code', '%TRX_Siyah_Profil%')
      .limit(1)
      .single();

    if (profilMaterial) {
      const { data: profilMovements } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('material_id', profilMaterial.id)
        .eq('movement_type', 'uretim')
        .order('created_at', { ascending: false })
        .limit(5);

      if (profilMovements && profilMovements.length > 0) {
        console.log(`   ${profilMaterial.name} için son 5 üretim hareketi:`);
        profilMovements.forEach((movement, index) => {
          const qty = parseFloat(movement.quantity || 0);
          const before = movement.before_quantity ? parseFloat(movement.before_quantity) : null;
          const after = movement.after_quantity ? parseFloat(movement.after_quantity) : null;
          
          const hasDecimal = (before && before.toString().includes('.')) || 
                            (after && after.toString().includes('.')) ||
                            qty.toString().includes('.');
          
          console.log(`   ${hasDecimal ? '✅' : '  '} ${index + 1}. Quantity: ${qty}, Before: ${before ?? 'N/A'}, After: ${after ?? 'N/A'}`);
          if (movement.description) {
            console.log(`      ${movement.description.substring(0, 60)}...`);
          }
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Migration başarıyla doğrulandı!');
    console.log('📌 Artık ondalıklı değerler (örn: 1525.39, 1.39) doğru kaydedilebilir.\n');

    return true;

  } catch (error) {
    console.error('❌ Doğrulama hatası:', error.message);
    console.error(error.stack);
    return false;
  }
}

testDecimalMigration();

