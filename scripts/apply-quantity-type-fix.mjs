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

const sqlFile = readFileSync(join(__dirname, '..', 'supabase', 'FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql'), 'utf8');

async function applyMigration() {
  console.log('🔧 Stock movements quantity tiplerini düzeltiliyor...\n');

  try {
    // SQL'i parçalara böl (DO $$ blokları için)
    const statements = sqlFile
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim().length === 0) continue;
      
      // SELECT statement'ları için
      if (statement.trim().toUpperCase().startsWith('SELECT')) {
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        }).catch(() => {
          // Eğer rpc yoksa direkt query yapamayız
          return { data: null, error: { message: 'exec_sql RPC function not found' } };
        });

        if (error && !error.message.includes('exec_sql RPC function not found')) {
          console.error('❌ Hata:', error.message);
        } else if (data) {
          console.log('📊 Sonuç:', data);
        }
      }
    }

    // Alternatif: Supabase REST API ile direkt SQL çalıştırma
    // Ancak bu genellikle mümkün değil, bu yüzden kullanıcıya manuel çalıştırma talimatı verelim
    console.log('\n⚠️  Bu migration SQL Editor\'da manuel çalıştırılmalı.');
    console.log('📄 Dosya: supabase/FIX-STOCK-MOVEMENTS-QUANTITIES-TYPE.sql');
    console.log('💡 Supabase Dashboard → SQL Editor → Dosya içeriğini yapıştır → Run\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

applyMigration();

