import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

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

async function createMigrationRPC() {
  console.log('🔧 Migration RPC function oluşturuluyor...\n');

  try {
    const sqlFile = readFileSync(
      join(__dirname, '..', 'supabase', 'CREATE-MIGRATION-RPC.sql'),
      'utf8'
    );

    // SQL'i satırlara böl
    const statements = sqlFile
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.toUpperCase().startsWith('SELECT'));

    // Her statement'ı ayrı ayrı çalıştır
    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      // Supabase REST API ile SQL çalıştıramayız
      // Bu yüzden RPC function'ı manuel oluşturmalıyız
      // Ya da Supabase Management API kullanmalıyız
      
      console.log('⚠️  Supabase REST API ile direkt SQL çalıştıramıyoruz.');
      console.log('💡 RPC function\'ı oluşturmak için CREATE-MIGRATION-RPC.sql dosyasını Supabase Dashboard\'da çalıştırın.\n');
      
      return false;
    }

    return false;

  } catch (error) {
    console.error('❌ Hata:', error.message);
    return false;
  }
}

async function executeMigration() {
  console.log('🚀 Migration çalıştırılıyor...\n');

  try {
    // Önce RPC function'ı çağırmayı dene
    const { data, error } = await supabase.rpc('migrate_stock_movements_quantities');

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  Migration RPC function bulunamadı.');
        console.log('📝 Önce RPC function\'ı oluşturmanız gerekiyor:\n');
        console.log('   1. supabase/CREATE-MIGRATION-RPC.sql dosyasını Supabase Dashboard\'da çalıştırın');
        console.log('   2. Ardından bu script\'i tekrar çalıştırın\n');
        return false;
      }
      
      console.error('❌ Migration hatası:', error.message);
      return false;
    }

    if (data) {
      console.log('✅ Migration başarılı!');
      console.log('📊 Sonuç:', JSON.stringify(data, null, 2));
      return true;
    }

    return false;

  } catch (error) {
    console.error('❌ Hata:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Stock Movements Quantity Type Migration (RPC)\n');
  console.log('='.repeat(60) + '\n');

  // Önce RPC function'ı oluşturmayı dene
  const rpcCreated = await createMigrationRPC();
  
  // RPC function'ı çalıştır
  const migrated = await executeMigration();

  if (migrated) {
    console.log('\n✅ Migration tamamlandı!');
    console.log('📌 Artık stok hareketleri ondalıklı değerleri destekliyor.\n');
  } else {
    console.log('\n⚠️  Migration otomatik çalıştırılamadı.');
    console.log('📌 Manuel adımlar:\n');
    console.log('   1. supabase/CREATE-MIGRATION-RPC.sql dosyasını Supabase Dashboard\'da çalıştırın');
    console.log('   2. Ardından bu script\'i tekrar çalıştırın\n');
    console.log('   VEYA\n');
    console.log('   1. supabase/FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql dosyasını direkt Supabase Dashboard\'da çalıştırın\n');
  }

  console.log('='.repeat(60));
}

main();

