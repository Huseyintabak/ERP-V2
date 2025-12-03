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

async function applyMigration() {
  console.log('🔧 Stock Movements Quantity Type Migration\n');
  console.log('='.repeat(60) + '\n');

  try {
    // 1. Önce CREATE-MIGRATION-RPC.sql'i çalıştırmak için RPC function oluştur
    console.log('📝 Adım 1: RPC Function oluşturuluyor...\n');
    
    // RPC function'ı oluşturmak için bir RPC call yapamayız
    // Ama migration SQL'ini direkt çalıştırmak için bir yol bulmalıyız
    
    // Alternatif: ALTER TABLE komutlarını direkt Supabase client ile çalıştıramayız
    // Çünkü Supabase REST API DDL (ALTER TABLE) komutlarını desteklemez
    
    // En pratik çözüm: Migration SQL'ini bir function olarak execute etmek
    // Bunun için önce function'ı oluşturmalıyız
    
    console.log('⚠️  Supabase REST API direkt ALTER TABLE komutlarını çalıştıramaz.');
    console.log('💡 Migration SQL\'ini Supabase Dashboard\'da çalıştırmanız gerekiyor:\n');
    console.log('   📄 Dosya: supabase/FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql\n');
    console.log('   📝 Adımlar:');
    console.log('      1. https://supabase.com → Projenize giriş yapın');
    console.log('      2. Sol menüden "SQL Editor" seçin');
    console.log('      3. "New Query" butonuna tıklayın');
    console.log('      4. Dosyanın içeriğini yapıştırın');
    console.log('      5. "Run" butonuna tıklayın\n');

    // Yine de deneyelim - belki bir workaround var
    // Migration SQL'ini execute etmek için en azından SQL'i gösterebiliriz
    
    const migrationSql = `-- Stock Movements Quantity Type Migration
DO $$
BEGIN
  -- before_quantity
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name = 'before_quantity'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN before_quantity TYPE NUMERIC(12, 2) USING before_quantity::NUMERIC(12, 2);
    RAISE NOTICE '✅ before_quantity INTEGER → NUMERIC(12,2) çevrildi';
  END IF;

  -- after_quantity
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stock_movements'
      AND column_name = 'after_quantity'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE stock_movements 
    ALTER COLUMN after_quantity TYPE NUMERIC(12, 2) USING after_quantity::NUMERIC(12, 2);
    RAISE NOTICE '✅ after_quantity INTEGER → NUMERIC(12,2) çevrildi';
  END IF;
END $$;`;

    console.log('📋 Migration SQL:\n');
    console.log(migrationSql);
    console.log('\n' + '='.repeat(60) + '\n');
    
    console.log('✅ Migration SQL hazır!');
    console.log('📌 Yukarıdaki SQL\'i Supabase Dashboard\'da çalıştırın.\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

applyMigration();

