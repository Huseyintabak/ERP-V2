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
  console.error('Lütfen .env.local dosyasında NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olduğundan emin olun.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkCurrentTypes() {
  console.log('🔍 Mevcut veri tipleri kontrol ediliyor...\n');

  // Information schema query'si için özel bir yaklaşım
  // Supabase REST API doğrudan information_schema'ya erişemez
  // Bu yüzden önce bir kontrol yapalım
  
  // Test: Bir stock_movement kaydı alıp tiplerini kontrol edelim
  const { data: sample, error: sampleError } = await supabase
    .from('stock_movements')
    .select('before_quantity, after_quantity, quantity')
    .limit(1);

  if (sampleError) {
    console.error('❌ Stock movements tablosuna erişilemedi:', sampleError.message);
    return false;
  }

  if (sample && sample.length > 0) {
    const record = sample[0];
    console.log('📊 Örnek kayıt:');
    console.log(`   quantity: ${record.quantity} (tip: ${typeof record.quantity})`);
    console.log(`   before_quantity: ${record.before_quantity} (tip: ${typeof record.before_quantity})`);
    console.log(`   after_quantity: ${record.after_quantity} (tip: ${typeof record.after_quantity})`);
    console.log();
  }

  return true;
}

async function applyMigration() {
  console.log('🔧 Stock movements quantity tiplerini düzeltiliyor...\n');

  try {
    // Supabase REST API ile direkt SQL çalıştıramayız
    // Ama bir RPC function oluşturup onu çağırabiliriz
    // Ya da direkt SQL çalıştırmak için Supabase'in SQL Editor API'sini kullanabiliriz
    
    // Alternatif: ALTER TABLE komutunu bir function olarak oluşturup çağıralım
    
    console.log('⚠️  Supabase REST API direkt SQL çalıştıramaz.');
    console.log('📝 Bunun yerine, migration SQL\'ini Supabase Dashboard\'da çalıştırmanız gerekiyor.\n');
    console.log('📄 Migration dosyası: supabase/FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql\n');
    console.log('💡 Adımlar:');
    console.log('   1. https://supabase.com → Projenize giriş yapın');
    console.log('   2. Sol menüden "SQL Editor" seçin');
    console.log('   3. "New Query" butonuna tıklayın');
    console.log('   4. supabase/FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql dosyasının içeriğini yapıştırın');
    console.log('   5. "Run" butonuna tıklayın\n');

    // Ama yine de deneyelim - belki bir RPC function var
    // Önce mevcut durumu kontrol edelim
    await checkCurrentTypes();

    // Eğer before_quantity veya after_quantity INTEGER ise, bunu tespit etmek zor
    // Çünkü JavaScript tarafında tip bilgisini alamayız
    // En iyi yol: Migration SQL'ini manuel çalıştırmak

    console.log('✅ Kontrol tamamlandı.');
    console.log('📌 Migration SQL\'ini manuel olarak çalıştırmak için yukarıdaki adımları takip edin.\n');

    return false;

  } catch (error) {
    console.error('❌ Hata:', error.message);
    return false;
  }
}

// Alternatif: SQL'i direkt çalıştırmak için bir RPC function oluştur ve çağır
async function createAndExecuteMigrationRPC() {
  console.log('🔧 Migration RPC function oluşturuluyor...\n');

  try {
    // Önce migration SQL'ini oku
    const fs = await import('fs');
    const sqlContent = fs.readFileSync(
      join(__dirname, '..', 'supabase', 'FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql'),
      'utf8'
    );

    // SQL'i parse et ve ALTER TABLE komutlarını bul
    const alterBeforeRegex = /ALTER\s+TABLE\s+stock_movements\s+ALTER\s+COLUMN\s+before_quantity\s+TYPE\s+(\w+\([^)]+\))/i;
    const alterAfterRegex = /ALTER\s+TABLE\s+stock_movements\s+ALTER\s+COLUMN\s+after_quantity\s+TYPE\s+(\w+\([^)]+\))/i;

    const beforeMatch = sqlContent.match(alterBeforeRegex);
    const afterMatch = sqlContent.match(alterAfterRegex);

    if (beforeMatch || afterMatch) {
      console.log('📋 ALTER TABLE komutları bulundu:\n');
      if (beforeMatch) {
        console.log(`   - before_quantity → ${beforeMatch[1]}`);
      }
      if (afterMatch) {
        console.log(`   - after_quantity → ${afterMatch[1]}`);
      }
      console.log('\n⚠️  Ancak Supabase REST API direkt ALTER TABLE yapamaz.');
      console.log('💡 Migration SQL\'ini Supabase Dashboard\'da çalıştırmanız gerekiyor.\n');
    }

  } catch (error) {
    console.error('❌ SQL dosyası okunamadı:', error.message);
  }
}

async function main() {
  console.log('🚀 Stock Movements Quantity Type Migration\n');
  console.log('='.repeat(60) + '\n');

  await checkCurrentTypes();
  await createAndExecuteMigrationRPC();
  await applyMigration();

  console.log('='.repeat(60));
  console.log('\n✅ İşlem tamamlandı!');
  console.log('📌 Migration SQL\'ini Supabase Dashboard\'da çalıştırmayı unutmayın.\n');
}

main();

