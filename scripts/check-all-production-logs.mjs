import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

(async () => {
  console.log('🔍 TÜM PRODUCTION LOG\'LARI KONTROL\n');
  
  // Tüm production logs
  const { data: allLogs, error } = await supabase
    .from('production_logs')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`Toplam production log sayısı (son 100): ${allLogs?.length || 0}\n`);
  
  if (allLogs && allLogs.length > 0) {
    console.log('İlk 5 log:');
    allLogs.slice(0, 5).forEach((log, i) => {
      console.log(`\n${i + 1}. Log ID: ${log.id?.substring(0, 8)}...`);
      console.log(`   Plan ID: ${log.plan_id?.substring(0, 8)}...`);
      console.log(`   Quantity: ${log.quantity_produced}`);
      console.log(`   Created: ${log.timestamp}`);
    });
    
    // Plan ID'lere göre grupla
    const planIds = [...new Set(allLogs.map(l => l.plan_id).filter(Boolean))];
    console.log(`\n📋 Toplam farklı plan sayısı: ${planIds.length}`);
    
    // Order ID'yi bul
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', 'ORD-2025-202')
      .single();
    
    if (order) {
      const { data: ord202Plans } = await supabase
        .from('production_plans')
        .select('id')
        .eq('order_id', order.id);
      
      const ord202PlanIds = new Set(ord202Plans?.map(p => p.id) || []);
      const matchingLogs = allLogs.filter(l => ord202PlanIds.has(l.plan_id));
      
      console.log(`\n📦 ORD-2025-202 için eşleşen log: ${matchingLogs.length}`);
      
      if (matchingLogs.length > 0) {
        const totalQty = matchingLogs.reduce((sum, l) => sum + parseFloat(l.quantity_produced || 0), 0);
        console.log(`   Toplam üretim: ${totalQty} adet`);
      }
    }
  } else {
    console.log('⚠️  Hiç production log bulunamadı!');
  }
  
  // Stok hareketlerini kontrol et
  console.log('\n📦 STOK HAREKETLERİ KONTROL:\n');
  
  const { data: stockMovements } = await supabase
    .from('stock_movements')
    .select('id, material_type, movement_type, quantity, production_log_id, timestamp')
    .eq('movement_type', 'uretim')
    .not('production_log_id', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(50);
  
  console.log(`Üretim stok hareketi (son 50): ${stockMovements?.length || 0}`);
  
  if (stockMovements && stockMovements.length > 0) {
    const finishedMovements = stockMovements.filter(m => m.material_type === 'finished');
    const materialMovements = stockMovements.filter(m => m.material_type !== 'finished');
    
    console.log(`   Nihai ürün: ${finishedMovements.length} hareket`);
    console.log(`   Malzeme: ${materialMovements.length} hareket`);
    
    const finishedTotal = finishedMovements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
    const materialTotal = materialMovements.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
    
    console.log(`\n   Nihai ürün toplam: ${finishedTotal.toFixed(2)} adet`);
    console.log(`   Malzeme toplam tüketim: ${materialTotal.toFixed(2)} adet`);
  }
})();

