import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

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

async function checkOperators() {
  console.log('🔍 Operatör Durumu Kontrolü\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Tüm operatörleri çek
    const { data: allOperators, error: allError } = await supabase
      .from('operators')
      .select('id, name, status, daily_capacity, user_id')
      .limit(20);

    if (allError) {
      console.error('❌ Operatörler çekilemedi:', allError.message);
      return;
    }

    console.log(`📊 Toplam Operatör Sayısı: ${allOperators?.length || 0}\n`);

    if (allOperators && allOperators.length > 0) {
      console.log('📋 TÜM OPERATÖRLER:');
      console.log('-'.repeat(70));
      allOperators.forEach((op, idx) => {
        console.log(`${idx + 1}. ${op.name || 'N/A'}`);
        console.log(`   ID: ${op.id}`);
        console.log(`   Status: ${op.status || 'N/A'}`);
        console.log(`   Daily Capacity: ${op.daily_capacity || 0}`);
        console.log(`   User ID: ${op.user_id || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Veritabanında operatör bulunamadı!\n');
    }

    // Active operatörleri çek
    const { data: activeOperators, error: activeError } = await supabase
      .from('operators')
      .select('id, name, status, daily_capacity, user_id')
      .eq('status', 'active');

    if (activeError) {
      console.error('❌ Active operatörler çekilemedi:', activeError.message);
      return;
    }

    console.log(`✅ Active Operatör Sayısı: ${activeOperators?.length || 0}\n`);

    if (activeOperators && activeOperators.length > 0) {
      console.log('📋 ACTIVE OPERATÖRLER:');
      console.log('-'.repeat(70));
      activeOperators.forEach((op, idx) => {
        console.log(`${idx + 1}. ${op.name || 'N/A'}`);
        console.log(`   ID: ${op.id}`);
        console.log(`   Status: ${op.status}`);
        console.log(`   Daily Capacity: ${op.daily_capacity || 0}`);
        console.log('');
      });

      const totalCapacity = activeOperators.reduce((sum, op) => sum + (op.daily_capacity || 0), 0);
      console.log(`📊 Toplam Daily Capacity: ${totalCapacity} adet/gün\n`);
    } else {
      console.log('⚠️  Active operatör bulunamadı!\n');
    }

    // Status dağılımını kontrol et
    const statusCounts = {};
    allOperators?.forEach(op => {
      const status = op.status || 'null';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📊 STATUS DAĞILIMI:');
    console.log('-'.repeat(70));
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count} operatör`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

checkOperators();

