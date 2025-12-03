/**
 * Operator Type Cast Fix Migration'ını Uygula
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🔧 Operator Type Cast Fix migration uygulanıyor...\n');

  try {
    // Migration SQL dosyasını oku
    const migrationPath = join(__dirname, '..', 'supabase', 'FIX-OPERATOR-TYPE-CAST.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📝 Migration SQL dosyası okundu\n');

    // SQL'i çalıştır
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      // RPC yoksa direkt SQL çalıştırmayı dene
      console.log('⚠️ RPC yöntemi başarısız, direkt SQL çalıştırılıyor...\n');
      
      // SQL'i parçalara böl ve çalıştır
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.length > 0) {
          try {
            // Supabase REST API ile direkt SQL çalıştıramayız, 
            // Bu yüzden kullanıcıya manuel olarak çalıştırmasını söyleyelim
            console.log('❌ Supabase REST API ile direkt SQL çalıştırılamıyor.');
            console.log('📋 Lütfen migration SQL dosyasını manuel olarak çalıştırın:\n');
            console.log('   Dosya: supabase/FIX-OPERATOR-TYPE-CAST.sql\n');
            console.log('   Supabase Dashboard > SQL Editor > New Query\n');
            console.log('   Veya psql ile:\n');
            console.log(`   psql "postgresql://[connection-string]" -f supabase/FIX-OPERATOR-TYPE-CAST.sql\n`);
            break;
          } catch (err) {
            console.error('❌ SQL statement hatası:', err.message);
          }
        }
      }
    } else {
      console.log('✅ Migration başarıyla uygulandı!');
    }

  } catch (error) {
    console.error('❌ Migration uygulanırken hata:', error.message);
    console.error('\n📋 Lütfen migration SQL dosyasını manuel olarak çalıştırın:');
    console.error('   Dosya: supabase/FIX-OPERATOR-TYPE-CAST.sql');
    console.error('   Supabase Dashboard > SQL Editor > New Query');
  }
}

// Script'i çalıştır
applyMigration()
  .then(() => {
    console.log('\n✨ Script tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

