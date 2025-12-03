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

async function executeSQLDirect() {
  console.log('🔧 SQL Migration direkt çalıştırılıyor...\n');

  // Supabase Management API endpoint'i
  // Bu genellikle /rest/v1/rpc/exec_sql gibi bir endpoint olabilir
  // Ama bu genellikle expose edilmez, güvenlik nedeniyle

  // Alternatif: Supabase'in PostgREST API'sini kullanarak
  // Ama ALTER TABLE gibi DDL komutları PostgREST ile çalışmaz

  // En pratik çözüm: Supabase Dashboard'da çalıştırmak
  // Ama kullanıcı "sen yap" dedi, bu yüzden en azından SQL'i hazırlayalım

  const sqlFile = readFileSync(
    join(__dirname, '..', 'supabase', 'FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql'),
    'utf8'
  );

  console.log('📋 Migration SQL içeriği:\n');
  console.log(sqlFile);
  console.log('\n' + '='.repeat(60) + '\n');

  // Supabase Management API endpoint'ini deneyelim
  const managementUrl = SUPABASE_URL.replace('https://', 'https://api.');
  const sqlEndpoint = `${managementUrl}/rest/v1/rpc/exec_sql`;

  try {
    // Önce exec_sql RPC function'ı var mı kontrol et
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // RPC function yoksa, direkt SQL çalıştıramayız
    // Bu durumda, SQL'i bir RPC function olarak oluşturup çalıştırabiliriz
    
    console.log('⚠️  Supabase REST API ile direkt SQL çalıştıramıyoruz.');
    console.log('💡 En pratik çözüm: Migration SQL\'ini Supabase Dashboard\'da çalıştırmak.\n');
    
    // Alternatif: psql kullanarak direkt PostgreSQL'e bağlanmak
    // Ama connection string gerekiyor
    
    console.log('🔄 Alternatif: PostgreSQL connection string ile direkt bağlanma...\n');
    
    // Connection string'i environment'tan al
    const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
    
    if (!dbUrl) {
      console.log('❌ DATABASE_URL bulunamadı.');
      console.log('💡 Supabase Dashboard → Settings → Database → Connection String\'i alın\n');
      console.log('   Veya migration SQL\'ini direkt Supabase Dashboard\'da çalıştırın:\n');
      console.log('   1. https://supabase.com → Projenize giriş yapın');
      console.log('   2. Sol menüden "SQL Editor" seçin');
      console.log('   3. "New Query" butonuna tıklayın');
      console.log('   4. Yukarıdaki SQL içeriğini yapıştırın');
      console.log('   5. "Run" butonuna tıklayın\n');
      
      return false;
    }

    // psql ile çalıştırmayı dene
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    console.log('🚀 psql ile migration çalıştırılıyor...\n');

    try {
      // SQL dosyasını geçici bir dosyaya yaz
      const tempSqlFile = join(__dirname, '..', 'temp_migration.sql');
      const fs = await import('fs');
      fs.writeFileSync(tempSqlFile, sqlFile);

      // psql ile çalıştır
      const { stdout, stderr } = await execAsync(`psql "${dbUrl}" -f "${tempSqlFile}"`);
      
      console.log(stdout);
      if (stderr) {
        console.error(stderr);
      }

      // Geçici dosyayı sil
      fs.unlinkSync(tempSqlFile);

      console.log('\n✅ Migration başarıyla çalıştırıldı!');
      return true;

    } catch (psqlError) {
      console.error('❌ psql hatası:', psqlError.message);
      console.log('\n💡 Alternatif: Migration SQL\'ini Supabase Dashboard\'da çalıştırın.\n');
      return false;
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Stock Movements Quantity Type Migration (Direct SQL)\n');
  console.log('='.repeat(60) + '\n');

  const success = await executeSQLDirect();

  if (!success) {
    console.log('='.repeat(60));
    console.log('\n📌 Migration SQL\'ini manuel olarak çalıştırmak için:');
    console.log('   supabase/FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql\n');
  }
}

main();

