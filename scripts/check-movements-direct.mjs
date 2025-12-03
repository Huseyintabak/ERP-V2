import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PLAN_ID = '5fcd32b2-ec7b-4717-901f-a05508e4ce21';

async function checkDirect() {
  console.log('🔍 Direkt stok hareketleri kontrolü...\n');
  
  // Tüm üretim tipi stok hareketlerini al
  const { data: allMovements, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('movement_type', 'uretim')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Hata:', error.message);
    return;
  }

  console.log(`📊 Son 20 üretim stok hareketi:\n`);
  
  allMovements?.forEach((movement, index) => {
    const hasPlanId = movement.description?.includes(PLAN_ID) || movement.description?.toLowerCase().includes(PLAN_ID.toLowerCase());
    const marker = hasPlanId ? '✅' : '  ';
    
    console.log(`${marker} ${index + 1}. ${movement.material_type} - ${movement.quantity}`);
    console.log(`   Description: ${movement.description || 'N/A'}`);
    console.log(`   Tarih: ${new Date(movement.created_at).toLocaleString('tr-TR')}`);
    if (hasPlanId) {
      console.log(`   👈 Bu plan için!`);
    }
    console.log();
  });

  // Bu plan için spesifik kontrol
  const { data: planMovements } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('movement_type', 'uretim')
    .gte('created_at', '2025-12-02T13:50:00')
    .lte('created_at', '2025-12-02T14:10:00');

  console.log(`\n📋 Plan zaman aralığındaki hareketler: ${planMovements?.length || 0} adet\n`);
  
  if (planMovements && planMovements.length > 0) {
    planMovements.forEach((movement) => {
      console.log(`   - ${movement.material_type}: ${movement.quantity}`);
      console.log(`     ${movement.description || 'N/A'}\n`);
    });
  }
}

checkDirect();

