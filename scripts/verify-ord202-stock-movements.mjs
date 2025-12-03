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

async function verifyStockMovements() {
  console.log('🔍 ORD-2025-202 STOK HAREKETLERİ DOĞRULAMA\n');
  console.log('='.repeat(70) + '\n');

  try {
    // ORD-2025-202 planlarını bul
    const { data: plans } = await supabase
      .from('production_plans')
      .select('id, product_id, produced_quantity, order:orders(order_number)')
      .eq('order.orders.order_number', 'ORD-2025-202');

    const planIds = plans?.map(p => p.id) || [];
    const productIds = [...new Set(plans?.map(p => p.product_id).filter(Boolean) || [])];

    console.log(`📋 Plan Sayısı: ${planIds.length}`);
    console.log(`📦 Ürün Sayısı: ${productIds.length}\n`);

    // Nihai ürün stok hareketleri
    console.log('📊 NİHAİ ÜRÜN STOK HAREKETLERİ:\n');

    let finishedTotal = 0;
    for (const productId of productIds.slice(0, 5)) {
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('quantity, created_at, description')
        .eq('material_type', 'finished')
        .eq('material_id', productId)
        .eq('movement_type', 'uretim')
        .order('created_at', { ascending: false })
        .limit(50);

      if (movements && movements.length > 0) {
        const productTotal = movements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        finishedTotal += productTotal;
        console.log(`   Product ${productId.substring(0, 8)}...: ${movements.length} hareket, toplam ${productTotal} adet`);
      }
    }

    // Tüm finished product hareketleri (son 1 saat)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentMovements } = await supabase
      .from('stock_movements')
      .select('quantity, material_id')
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim')
      .in('material_id', productIds)
      .gte('created_at', oneHourAgo);

    const recentTotal = recentMovements?.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0) || 0;

    console.log(`\n   Son 1 saatte oluşturulan: ${recentTotal.toFixed(2)} adet`);
    console.log(`   Toplam hareket sayısı: ${recentMovements?.length || 0}\n`);

    // Production log kontrolü
    console.log('📝 PRODUCTION LOG KONTROLÜ:\n');

    let logTotal = 0;
    for (const planId of planIds.slice(0, 10)) {
      const { data: logs } = await supabase
        .from('production_logs')
        .select('quantity_produced')
        .eq('plan_id', planId);

      if (logs && logs.length > 0) {
        const planTotal = logs.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0);
        logTotal += planTotal;
      }
    }

    console.log(`   İlk 10 plan için log toplamı: ${logTotal} adet\n`);

    // Genel toplam
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('quantity_produced')
      .in('plan_id', planIds);

    const totalFromLogs = allLogs?.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0) || 0;

    console.log('='.repeat(70));
    console.log('\n📊 ÖZET:\n');
    console.log(`   📝 Production Log Toplamı: ${totalFromLogs.toFixed(2)} adet`);
    console.log(`   📦 Stok Hareketleri (Son 1 saat): ${recentTotal.toFixed(2)} adet\n`);

    if (recentTotal < totalFromLogs * 0.9) {
      console.log('   ⚠️  Stok hareketleri eksik görünüyor. Trigger\'lar çalışmamış olabilir.\n');
      console.log('   💡 Biraz bekleyip tekrar kontrol edin veya trigger\'ları manuel tetikleyin.\n');
    } else {
      console.log('   ✅ Stok hareketleri oluşturulmuş görünüyor!\n');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
}

verifyStockMovements();

