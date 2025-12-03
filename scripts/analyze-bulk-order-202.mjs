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

async function analyzeBulkOrder() {
  console.log('🔍 TOPLU SİPARİŞ ANALİZİ (ORD-2025-202)\n');
  console.log('='.repeat(70) + '\n');

  try {
    // ORD-2025-202 için tüm planları bul
    const { data: order202Plans } = await supabase
      .from('production_plans')
      .select(`
        id,
        planned_quantity,
        produced_quantity,
        status,
        created_at,
        started_at,
        completed_at,
        order:orders(order_number, total_quantity, status),
        product:finished_products(name, code)
      `)
      .ilike('order.orders.order_number', '%2025-202%')
      .order('created_at', { ascending: true });

    // Daha geniş arama (order_number direkt olmayabilir)
    if (!order202Plans || order202Plans.length === 0) {
      // Order number'ı farklı şekilde arayalım
      const { data: allPlans } = await supabase
        .from('production_plans')
        .select(`
          id,
          planned_quantity,
          produced_quantity,
          status,
          created_at,
          started_at,
          completed_at,
          order:orders(order_number, total_quantity, status),
          product:finished_products(name, code)
        `)
        .order('created_at', { ascending: true });

      // Manuel olarak ORD-2025-202'yi bul
      const order202PlansFiltered = allPlans?.filter(p => 
        p.order?.order_number?.includes('202') || 
        p.order?.order_number === 'ORD-2025-202'
      ) || [];

      console.log(`📋 ORD-2025-202 SİPARİŞİ İÇİN PLANLAR:\n`);
      console.log(`   Toplam Plan: ${order202PlansFiltered.length} adet\n`);

      if (order202PlansFiltered.length > 0) {
        let totalPlanned = 0;
        let totalProduced = 0;

        order202PlansFiltered.forEach((plan, index) => {
          const planned = parseFloat(plan.planned_quantity || 0);
          const produced = parseFloat(plan.produced_quantity || 0);
          totalPlanned += planned;
          totalProduced += produced;

          console.log(`${index + 1}. Plan #${plan.id.substring(0, 8)}...`);
          console.log(`   Ürün: ${plan.product?.name || 'N/A'}`);
          console.log(`   Planlanan: ${planned} adet`);
          console.log(`   Üretilen: ${produced} adet`);
          console.log(`   Durum: ${plan.status}`);
          console.log(`   Oluşturulma: ${plan.created_at ? new Date(plan.created_at).toLocaleDateString('tr-TR') : 'N/A'}`);
          
          // Bu plan için production log var mı?
          // Kontrol edelim
          
          console.log();
        });

        console.log('='.repeat(70));
        console.log('\n📊 ORD-2025-202 ÖZET:\n');
        console.log(`   Toplam Planlanan: ${totalPlanned.toFixed(2)} adet`);
        console.log(`   Toplam Üretilen: ${totalProduced.toFixed(2)} adet`);
        console.log(`   Eksik: ${(totalPlanned - totalProduced).toFixed(2)} adet\n`);

        // Production log kontrolü
        console.log('📝 PRODUCTION LOG KONTROLÜ:\n');
        
        let totalFromLogs = 0;
        for (const plan of order202PlansFiltered) {
          const { data: logs } = await supabase
            .from('production_logs')
            .select('quantity_produced')
            .eq('plan_id', plan.id);

          if (logs && logs.length > 0) {
            const planTotal = logs.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0);
            totalFromLogs += planTotal;
            
            if (planTotal > 0) {
              console.log(`   Plan #${plan.id.substring(0, 8)}...: ${planTotal} adet log var`);
            }
          }
        }

        console.log(`\n   Toplam Log Miktarı: ${totalFromLogs.toFixed(2)} adet\n`);

        // Stok hareketleri kontrolü - bu ürünler için
        console.log('📦 STOK HAREKETLERİ KONTROLÜ:\n');
        
        const productIds = [...new Set(order202PlansFiltered.map(p => p.product?.id || p.product_id).filter(Boolean))];
        
        let totalFromMovements = 0;
        for (const productId of productIds) {
          const { data: movements } = await supabase
            .from('stock_movements')
            .select('quantity, created_at, description')
            .eq('material_type', 'finished')
            .eq('material_id', productId)
            .eq('movement_type', 'uretim');

          if (movements && movements.length > 0) {
            const productTotal = movements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
            totalFromMovements += productTotal;
            
            // ORD-2025-202 ile ilgili olanları filtrele
            const relevantMovements = movements.filter(m => 
              m.description?.includes('ORD-2025-202') || 
              m.description?.includes('202')
            );
            
            if (relevantMovements.length > 0) {
              const relevantTotal = relevantMovements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
              console.log(`   Product ${productId.substring(0, 8)}...: ${relevantTotal} adet (ORD-2025-202 ile ilgili)`);
            }
          }
        }

        console.log(`\n   Toplam Stok Hareketi Miktarı: ${totalFromMovements.toFixed(2)} adet\n`);

        // Sonuç
        console.log('='.repeat(70));
        console.log('\n✅ SONUÇ:\n');
        console.log(`   📋 Planlanan: ${totalPlanned.toFixed(2)} adet`);
        console.log(`   📝 Plan'larda Üretilen: ${totalProduced.toFixed(2)} adet`);
        console.log(`   📝 Production Log'lar: ${totalFromLogs.toFixed(2)} adet`);
        console.log(`   📦 Stok Hareketleri: ${totalFromMovements.toFixed(2)} adet\n`);

        if (totalPlanned > 0 && totalProduced === 0 && totalFromLogs === 0) {
          console.log('   ⚠️  BU SİPARİŞ İÇİN HİÇ ÜRETİM YAPILMAMIŞ!\n');
          console.log('   💡 Bu planlar oluşturulmuş ama henüz üretime başlanmamış.\n');
        } else if (totalProduced > 0 || totalFromLogs > 0) {
          console.log('   ✅ Bu sipariş için üretim yapılmış.\n');
        }
      } else {
        console.log('   ⚠️  ORD-2025-202 için plan bulunamadı!\n');
      }
    }

    // Genel toplam üretimi tekrar hesapla - belki başka siparişlerde de büyük miktarlar var
    console.log('='.repeat(70));
    console.log('\n🌐 GENEL ÜRETİM DURUMU:\n');

    const { data: allPlansForTotal } = await supabase
      .from('production_plans')
      .select('planned_quantity, produced_quantity, status');

    const grandTotalPlanned = allPlansForTotal?.reduce((sum, p) => sum + parseFloat(p.planned_quantity || 0), 0) || 0;
    const grandTotalProduced = allPlansForTotal?.reduce((sum, p) => sum + parseFloat(p.produced_quantity || 0), 0) || 0;

    console.log(`   📋 Tüm Planlarda Toplam Planlanan: ${grandTotalPlanned.toFixed(2)} adet`);
    console.log(`   📝 Tüm Planlarda Toplam Üretilen: ${grandTotalProduced.toFixed(2)} adet`);
    console.log(`   ⚠️  Henüz Üretilmemiş: ${(grandTotalPlanned - grandTotalProduced).toFixed(2)} adet\n`);

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

analyzeBulkOrder();

