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

async function checkMissingLogs() {
  console.log('🔍 EKSİK ÜRETİM LOG KONTROLÜ\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm siparişleri kontrol et
    console.log('📦 1. SİPARİŞ ANALİZİ:\n');

    const { data: allOrders } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        order_type,
        status,
        total_quantity,
        order_items(
          id,
          quantity,
          product:finished_products(name, code)
        )
      `)
      .order('created_at', { ascending: false });

    console.log(`   Toplam Sipariş: ${allOrders?.length || 0} adet\n`);

    // Toplu siparişleri bul
    const bulkOrders = allOrders?.filter(order => {
      const totalQty = order.order_items?.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0) || 0;
      return totalQty > 10 || order.total_quantity > 10; // 10'dan fazla toplu sipariş
    }) || [];

    console.log(`   Toplu Sipariş (>10 adet): ${bulkOrders.length} adet\n`);

    if (bulkOrders.length > 0) {
      console.log('📋 TOPLU SİPARİŞLER:\n');
      bulkOrders.forEach((order, index) => {
        const totalQty = order.order_items?.reduce((sum, item) => sum + parseFloat(item.quantity || 0), 0) || order.total_quantity || 0;
        console.log(`${index + 1}. ${order.order_number}`);
        console.log(`   Tip: ${order.order_type}`);
        console.log(`   Durum: ${order.status}`);
        console.log(`   Toplam Miktar: ${totalQty} adet`);
        if (order.order_items && order.order_items.length > 0) {
          console.log(`   Ürünler:`);
          order.order_items.slice(0, 3).forEach(item => {
            console.log(`      - ${item.product?.name || 'N/A'}: ${item.quantity} adet`);
          });
          if (order.order_items.length > 3) {
            console.log(`      ... ve ${order.order_items.length - 3} ürün daha`);
          }
        }
        console.log();
      });
    }

    // 2. Production plans kontrolü
    console.log('='.repeat(70));
    console.log('\n📋 2. PRODUCTION PLANS ANALİZİ:\n');

    const { data: allPlans } = await supabase
      .from('production_plans')
      .select(`
        id,
        planned_quantity,
        produced_quantity,
        status,
        order:orders(order_number, total_quantity),
        product:finished_products(name, code)
      `)
      .order('created_at', { ascending: false });

    console.log(`   Toplam Plan: ${allPlans?.length || 0} adet\n`);

    // Plan bazında üretim vs log karşılaştırması
    let plansWithDiscrepancy = [];
    let totalPlannedFromPlans = 0;
    let totalProducedFromPlans = 0;

    allPlans?.forEach(plan => {
      totalPlannedFromPlans += parseFloat(plan.planned_quantity || 0);
      totalProducedFromPlans += parseFloat(plan.produced_quantity || 0);

      // Bu plan için production log var mı?
      // Bunu kontrol etmek için log sayısını alalım (burada sadece plan bilgilerini gösterelim)
    });

    console.log(`   Toplam Planlanan: ${totalPlannedFromPlans.toFixed(2)} adet`);
    console.log(`   Toplam Üretilen (Plan'lardan): ${totalProducedFromPlans.toFixed(2)} adet\n`);

    // Büyük miktarlı planlar
    const largePlans = allPlans?.filter(p => parseFloat(p.planned_quantity || 0) > 10) || [];
    
    console.log(`   Büyük Miktarlı Planlar (>10 adet): ${largePlans.length} adet\n`);

    if (largePlans.length > 0) {
      console.log('📊 BÜYÜK MİKTARLI PLANLAR:\n');
      largePlans.slice(0, 10).forEach((plan, index) => {
        const produced = parseFloat(plan.produced_quantity || 0);
        const planned = parseFloat(plan.planned_quantity || 0);
        const diff = planned - produced;
        
        console.log(`${index + 1}. Plan #${plan.id.substring(0, 8)}...`);
        console.log(`   Sipariş: ${plan.order?.order_number || 'N/A'}`);
        console.log(`   Ürün: ${plan.product?.name || 'N/A'}`);
        console.log(`   Planlanan: ${planned} adet`);
        console.log(`   Üretilen: ${produced} adet`);
        if (diff > 0) {
          console.log(`   ⚠️  Eksik: ${diff} adet`);
        }
        console.log();
      });
    }

    // 3. Production logs kontrolü - her plan için log var mı?
    console.log('='.repeat(70));
    console.log('\n📝 3. PRODUCTION LOGS vs PLANS KARŞILAŞTIRMASI:\n');

    let plansWithoutLogs = [];
    let plansWithLogs = [];

    for (const plan of allPlans || []) {
      const { count: logCount } = await supabase
        .from('production_logs')
        .select('*', { count: 'exact', head: true })
        .eq('plan_id', plan.id);

      if (!logCount || logCount === 0) {
        if (parseFloat(plan.produced_quantity || 0) > 0) {
          plansWithoutLogs.push({
            plan_id: plan.id,
            order: plan.order?.order_number,
            product: plan.product?.name,
            produced: parseFloat(plan.produced_quantity || 0),
            planned: parseFloat(plan.planned_quantity || 0)
          });
        }
      } else {
        plansWithLogs.push(plan.id);
      }
    }

    console.log(`   Log'u Olan Planlar: ${plansWithLogs.length}`);
    console.log(`   Log'u Olmayan Ama Üretilen Planlar: ${plansWithoutLogs.length}\n`);

    if (plansWithoutLogs.length > 0) {
      console.log('⚠️  LOG KAYDI OLMAYAN AMA ÜRETİM YAPILMIŞ PLANLAR:\n');
      plansWithoutLogs.forEach((plan, index) => {
        console.log(`${index + 1}. Plan #${plan.plan_id.substring(0, 8)}...`);
        console.log(`   Sipariş: ${plan.order || 'N/A'}`);
        console.log(`   Ürün: ${plan.product || 'N/A'}`);
        console.log(`   Üretilen: ${plan.produced} adet (ama log yok!)\n`);
      });
    }

    // 4. Stok hareketlerinden gerçek üretim miktarını hesapla
    console.log('='.repeat(70));
    console.log('\n📊 4. STOK HAREKETLERİNDEN ÜRETİM MİKTARI:\n');

    const { data: allFinishedMovements } = await supabase
      .from('stock_movements')
      .select('quantity, created_at, description')
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim')
      .order('created_at', { ascending: false });

    const totalFromMovements = allFinishedMovements?.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0) || 0;

    console.log(`   Toplam Üretim (Stok Hareketlerinden): ${totalFromMovements.toFixed(2)} adet`);
    console.log(`   Toplam Stok Hareketi: ${allFinishedMovements?.length || 0} adet\n`);

    // 5. Sonuç ve özet
    console.log('='.repeat(70));
    console.log('\n📊 ÖZET VE TUTARSIZLIKLAR:\n');

    // Production logs toplamı
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('quantity_produced');
    
    const totalFromLogs = allLogs?.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0) || 0;

    console.log(`   📝 Production Logs Toplamı: ${totalFromLogs.toFixed(2)} adet`);
    console.log(`   📋 Production Plans Üretilen: ${totalProducedFromPlans.toFixed(2)} adet`);
    console.log(`   📦 Stok Hareketleri Toplamı: ${totalFromMovements.toFixed(2)} adet`);
    console.log(`   📋 Production Plans Planlanan: ${totalPlannedFromPlans.toFixed(2)} adet\n`);

    const maxTotal = Math.max(totalFromLogs, totalProducedFromPlans, totalFromMovements);
    console.log(`   🎯 Maksimum Üretim Miktarı: ${maxTotal.toFixed(2)} adet\n`);

    if (plansWithoutLogs.length > 0) {
      const missingTotal = plansWithoutLogs.reduce((sum, p) => sum + p.produced, 0);
      console.log(`   ⚠️  LOG KAYDI EKSİK TOPLAM: ${missingTotal.toFixed(2)} adet\n`);
      console.log(`   💡 Gerçek toplam: ${(totalFromLogs + missingTotal).toFixed(2)} adet olabilir\n`);
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

checkMissingLogs();

