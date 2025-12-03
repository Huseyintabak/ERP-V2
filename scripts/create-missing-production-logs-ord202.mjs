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

async function createMissingLogs() {
  console.log('🔧 ORD-2025-202 İÇİN EKSİK PRODUCTION LOG\'LARI OLUŞTURULUYOR\n');
  console.log('='.repeat(70) + '\n');

  try {
    // ORD-2025-202 için tüm planları bul
    const { data: allPlans } = await supabase
      .from('production_plans')
      .select(`
        id,
        product_id,
        planned_quantity,
        produced_quantity,
        status,
        assigned_operator_id,
        created_at,
        order:orders(order_number),
        product:finished_products(code, name, barcode)
      `);

    const order202Plans = allPlans?.filter(p => p.order?.order_number === 'ORD-2025-202') || [];

    console.log(`📋 ORD-2025-202 için ${order202Plans.length} plan bulundu\n`);

    if (order202Plans.length === 0) {
      console.log('⚠️  Plan bulunamadı!\n');
      return;
    }

    // Toplam planlanan ve üretilmesi gereken
    const totalPlanned = order202Plans.reduce((sum, p) => sum + parseFloat(p.planned_quantity || 0), 0);
    const totalProduced = order202Plans.reduce((sum, p) => sum + parseFloat(p.produced_quantity || 0), 0);
    const totalNeeded = totalPlanned - totalProduced;

    console.log(`📊 ÖZET:\n`);
    console.log(`   Toplam Planlanan: ${totalPlanned} adet`);
    console.log(`   Mevcut Üretilen: ${totalProduced} adet`);
    console.log(`   Oluşturulacak: ${totalNeeded} adet\n`);

    // İlk operatörü bul (test için)
    const { data: firstOperator } = await supabase
      .from('users')
      .select('id, name')
      .eq('role', 'operator')
      .limit(1)
      .single();

    if (!firstOperator) {
      console.log('⚠️  Operatör bulunamadı!\n');
      return;
    }

    console.log(`👤 Operatör: ${firstOperator.name || firstOperator.id}\n`);

    // Her plan için production log oluştur
    let createdCount = 0;
    let errorCount = 0;

    console.log('📝 Production log\'ları oluşturuluyor...\n');

    for (const plan of order202Plans) {
      const plannedQty = parseFloat(plan.planned_quantity || 0);
      const producedQty = parseFloat(plan.produced_quantity || 0);
      const neededQty = plannedQty - producedQty;

      if (neededQty <= 0) {
        continue; // Zaten üretilmiş
      }

      // BOM snapshot kontrolü
      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('*')
        .eq('plan_id', plan.id)
        .limit(1)
        .single();

      if (!bomSnapshot) {
        console.log(`   ⚠️  Plan #${plan.id.substring(0, 8)}... için BOM snapshot yok, atlanıyor`);
        errorCount++;
        continue;
      }

      // Product code/barcode
      const productCode = plan.product?.barcode || plan.product?.code || 'UNKNOWN';
      const operatorId = plan.assigned_operator_id || firstOperator.id;
      const logDate = plan.created_at || new Date().toISOString();

      // Production log oluştur
      const { data: log, error: logError } = await supabase
        .from('production_logs')
        .insert({
          plan_id: plan.id,
          operator_id: operatorId,
          barcode_scanned: productCode,
          quantity_produced: neededQty,
          timestamp: logDate
        })
        .select()
        .single();

      if (logError) {
        console.error(`   ❌ Plan #${plan.id.substring(0, 8)}...: ${logError.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Plan #${plan.id.substring(0, 8)}...: ${neededQty} adet ${plan.product?.name || 'Ürün'} - Log ID: ${log.id.substring(0, 8)}...`);
        createdCount++;

        // Biraz bekle (trigger'ların çalışması için)
        if (createdCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Başarıyla oluşturuldu: ${createdCount}`);
    console.log(`   ❌ Hata alan: ${errorCount}`);
    console.log(`   📋 Toplam: ${order202Plans.length} plan\n`);

    // Doğrulama
    if (createdCount > 0) {
      console.log('🔍 Doğrulama yapılıyor...\n');
      
      // Biraz bekle
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Yeni production log sayısı
      let newLogCount = 0;
      for (const plan of order202Plans) {
        const { count } = await supabase
          .from('production_logs')
          .select('*', { count: 'exact', head: true })
          .eq('plan_id', plan.id);
        newLogCount += count || 0;
      }

      // Yeni stok hareketi sayısı
      const productIds = [...new Set(order202Plans.map(p => p.product_id).filter(Boolean))];
      let newMovementCount = 0;
      for (const productId of productIds.slice(0, 3)) {
        const { count } = await supabase
          .from('stock_movements')
          .select('*', { count: 'exact', head: true })
          .eq('material_type', 'finished')
          .eq('material_id', productId)
          .eq('movement_type', 'uretim')
          .gte('created_at', new Date(Date.now() - 60000).toISOString());
        newMovementCount += count || 0;
      }

      console.log(`   📝 Yeni production log'lar: ${newLogCount}`);
      console.log(`   📦 Yeni stok hareketleri (örnek): ${newMovementCount}\n`);

      // Güncellenmiş plan durumu
      const { data: updatedPlans } = await supabase
        .from('production_plans')
        .select('produced_quantity, status')
        .in('id', order202Plans.map(p => p.id));

      const totalUpdated = updatedPlans?.reduce((sum, p) => sum + parseFloat(p.produced_quantity || 0), 0) || 0;
      console.log(`   📋 Güncellenmiş toplam üretim: ${totalUpdated.toFixed(2)} adet\n`);
    }

    console.log('✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

createMissingLogs();

