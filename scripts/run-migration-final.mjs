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

async function runMigration() {
  console.log('🚀 Stock Movements Quantity Type Migration\n');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Önce migration function'ı oluştur
    console.log('📝 Adım 1: Migration function oluşturuluyor...\n');
    
    const functionSql = readFileSync(
      join(__dirname, '..', 'supabase', 'EXECUTE-MIGRATION-FUNCTION.sql'),
      'utf8'
    );

    // Function'ı oluşturmak için Supabase REST API kullanamayız
    // Çünkü CREATE FUNCTION da bir DDL komutu
    
    console.log('⚠️  Function oluşturma SQL\'i:\n');
    console.log(functionSql);
    console.log('\n' + '='.repeat(60) + '\n');
    
    // 2. Function'ı çağırmayı dene (eğer varsa)
    console.log('📝 Adım 2: Migration function çağrılıyor...\n');
    
    const { data, error } = await supabase.rpc('execute_stock_movements_migration');

    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('⚠️  Migration function henüz oluşturulmamış.\n');
        console.log('💡 İki seçenek:\n');
        console.log('   SEÇENEK 1 (Önerilen):');
        console.log('   1. Supabase Dashboard → SQL Editor');
        console.log('   2. EXECUTE-MIGRATION-FUNCTION.sql dosyasını çalıştırın');
        console.log('   3. Ardından: SELECT execute_stock_movements_migration();');
        console.log('\n   SEÇENEK 2:');
        console.log('   1. Supabase Dashboard → SQL Editor');
        console.log('   2. FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql dosyasını direkt çalıştırın\n');
        return false;
      }
      
      console.error('❌ Migration hatası:', error.message);
      return false;
    }

    if (data) {
      console.log('✅ Migration başarılı!');
      console.log('📊 Sonuç:', data);
      console.log('\n✅ Artık before_quantity ve after_quantity NUMERIC(12,2) tipinde!\n');
      return true;
    }

    return false;

  } catch (error) {
    console.error('❌ Hata:', error.message);
    return false;
  }
}

runMigration();

