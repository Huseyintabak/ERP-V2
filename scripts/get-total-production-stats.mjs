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

async function getTotalProduction() {
  console.log('📊 TOPLAM ÜRETİM İSTATİSTİKLERİ\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Toplam production log kaydı
    const { count: totalLogs } = await supabase
      .from('production_logs')
      .select('*', { count: 'exact', head: true });

    // 2. Toplam üretilen miktar
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('quantity_produced');

    const totalProduced = allLogs?.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0) || 0;

    // 3. Plan bazında toplam
    const { data: plans } = await supabase
      .from('production_plans')
      .select('produced_quantity, status, planned_quantity');

    const totalPlanned = plans?.reduce((sum, p) => sum + parseFloat(p.planned_quantity || 0), 0) || 0;
    const totalProducedFromPlans = plans?.reduce((sum, p) => sum + parseFloat(p.produced_quantity || 0), 0) || 0;

    // 4. Durum bazında ayrım
    const statusBreakdown = {};
    plans?.forEach(plan => {
      const status = plan.status || 'unknown';
      if (!statusBreakdown[status]) {
        statusBreakdown[status] = { count: 0, produced: 0, planned: 0 };
      }
      statusBreakdown[status].count++;
      statusBreakdown[status].produced += parseFloat(plan.produced_quantity || 0);
      statusBreakdown[status].planned += parseFloat(plan.planned_quantity || 0);
    });

    // 5. Nihai ürün stok hareketlerinden toplam
    const { data: finishedMovements } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim');

    const totalFromMovements = finishedMovements?.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0) || 0;

    // 6. Tarih aralığı
    const { data: dateRange } = await supabase
      .from('production_logs')
      .select('timestamp')
      .order('timestamp', { ascending: true })
      .limit(1)
      .single();

    const { data: lastLog } = await supabase
      .from('production_logs')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    console.log('📦 GENEL İSTATİSTİKLER:\n');
    console.log(`   Toplam Production Log Sayısı: ${totalLogs || 0} adet`);
    console.log(`   Toplam Üretilen Miktar (Log'lardan): ${totalProduced.toFixed(2)} adet`);
    console.log(`   Toplam Üretilen Miktar (Plan'lardan): ${totalProducedFromPlans.toFixed(2)} adet`);
    console.log(`   Toplam Üretilen Miktar (Stok Hareketlerinden): ${totalFromMovements.toFixed(2)} adet`);
    console.log(`   Toplam Planlanan Miktar: ${totalPlanned.toFixed(2)} adet\n`);

    // Hangi kaynak güvenilir?
    const average = (totalProduced + totalProducedFromPlans + totalFromMovements) / 3;
    const maxDiff = Math.max(
      Math.abs(totalProduced - average),
      Math.abs(totalProducedFromPlans - average),
      Math.abs(totalFromMovements - average)
    );

    console.log('📊 ORTALAMA VE TUTARLILIK:\n');
    console.log(`   Ortalama Üretim: ${average.toFixed(2)} adet`);
    console.log(`   Maksimum Fark: ${maxDiff.toFixed(2)} adet`);
    
    if (maxDiff < 1) {
      console.log(`   ✅ Tüm kaynaklar tutarlı (fark < 1 adet)\n`);
    } else if (maxDiff < 10) {
      console.log(`   ⚠️  Küçük farklar var (${maxDiff.toFixed(2)} adet)\n`);
    } else {
      console.log(`   ❌ Büyük farklar var! Kontrol edilmesi gerekiyor.\n`);
    }

    // 7. Durum bazında breakdown
    console.log('📋 DURUM BAZINDA PLAN İSTATİSTİKLERİ:\n');
    Object.entries(statusBreakdown).forEach(([status, stats]) => {
      const percentage = stats.planned > 0 ? ((stats.produced / stats.planned) * 100).toFixed(1) : 0;
      console.log(`   ${status}:`);
      console.log(`      Plan Sayısı: ${stats.count}`);
      console.log(`      Üretilen: ${stats.produced.toFixed(2)} adet`);
      console.log(`      Planlanan: ${stats.planned.toFixed(2)} adet`);
      console.log(`      Tamamlanma: ${percentage}%\n`);
    });

    // 8. Tarih aralığı
    if (dateRange && lastLog) {
      const firstDate = new Date(dateRange.timestamp);
      const lastDate = new Date(lastLog.timestamp);
      const daysDiff = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
      
      console.log('📅 ÜRETİM TARİH ARALIĞI:\n');
      console.log(`   İlk Üretim: ${firstDate.toLocaleDateString('tr-TR')}`);
      console.log(`   Son Üretim: ${lastDate.toLocaleDateString('tr-TR')}`);
      console.log(`   Toplam Süre: ${daysDiff} gün\n`);
      
      if (daysDiff > 0) {
        const dailyAverage = totalProduced / daysDiff;
        console.log(`   Günlük Ortalama: ${dailyAverage.toFixed(2)} adet/gün\n`);
      }
    }

    // 9. En üretilen ürünler (ilk 5)
    console.log('🏆 EN ÇOK ÜRETİLEN ÜRÜNLER (İlk 5):\n');
    
    const { data: topProducts } = await supabase
      .from('production_logs')
      .select(`
        quantity_produced,
        plan:production_plans(
          product:finished_products(name, code)
        )
      `)
      .limit(1000); // Tüm log'ları al (limit varsa)

    if (topProducts) {
      const productStats = {};
      topProducts.forEach(log => {
        if (log.plan?.product) {
          const productKey = log.plan.product.code || log.plan.product.name;
          if (!productStats[productKey]) {
            productStats[productKey] = {
              name: log.plan.product.name,
              code: log.plan.product.code,
              total: 0
            };
          }
          productStats[productKey].total += parseFloat(log.quantity_produced || 0);
        }
      });

      const sortedProducts = Object.values(productStats)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      sortedProducts.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (${product.code})`);
        console.log(`      Toplam: ${product.total.toFixed(2)} adet\n`);
      });
    }

    console.log('='.repeat(70));
    console.log('\n✅ ÖZET:\n');
    console.log(`   📦 TOPLAM ÜRETİM ADETİ: ${totalProduced.toFixed(0)} adet`);
    console.log(`   📝 Production Log Sayısı: ${totalLogs || 0} adet`);
    console.log(`   📋 Toplam Plan: ${plans?.length || 0} adet\n`);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

getTotalProduction();

