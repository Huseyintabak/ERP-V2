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
  console.log('🔧 AKTİF REZERVASYONLARIN STOKLARINI DÜŞÜRÜYOR\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Aktif rezervasyonları al
    const { data: activeReservations } = await supabase
      .from('material_reservations')
      .select('id, order_id, material_type, material_id, reserved_quantity, consumed_quantity')
      .eq('status', 'active');

    console.log(`📦 Aktif rezervasyon: ${activeReservations?.length || 0}\n`);
    console.log('🔍 Kontrol ediliyor...\n');

    if (!activeReservations || activeReservations.length === 0) {
      console.log('⚠️  Aktif rezervasyon bulunamadı!\n');
      return;
    }

    let fixedCount = 0;
    let totalReleased = 0;

    // Her rezervasyon için kontrol et
    for (const reservation of activeReservations) {
      // Bu rezervasyonun order'ına ait production plan'ları bul
      const { data: plans } = await supabase
        .from('production_plans')
        .select('id, planned_quantity, product_id')
        .eq('order_id', reservation.order_id);

      if (!plans || plans.length === 0) {
        continue;
      }

      // Bu planlar için toplam üretim miktarını hesapla
      let totalProduced = 0;
      let totalPlanned = 0;

      for (const plan of plans) {
        const { data: logs } = await supabase
          .from('production_logs')
          .select('quantity_produced')
          .eq('plan_id', plan.id);

        const planProduced = logs?.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0) || 0;
        totalProduced += planProduced;
        totalPlanned += parseFloat(plan.planned_quantity || 0);
      }

      if (totalProduced <= 0 || totalPlanned <= 0) {
        continue; // Üretim yapılmamış
      }

      // Bu rezervasyona ait malzemenin BOM'daki miktarını bul
      let bomQuantity = 0;
      for (const plan of plans) {
        const { data: bomSnapshot } = await supabase
          .from('production_plan_bom_snapshot')
          .select('quantity_needed')
          .eq('plan_id', plan.id)
          .eq('material_type', reservation.material_type)
          .eq('material_id', reservation.material_id)
          .single();

        if (bomSnapshot) {
          // Toplam planlanan için ne kadar gerekli
          const planBomQty = (bomSnapshot.quantity_needed / parseFloat(plan.planned_quantity || 1)) * parseFloat(plan.planned_quantity || 0);
          bomQuantity += planBomQty;
        }
      }

      if (bomQuantity <= 0) {
        continue; // BOM'da bulunamadı
      }

      // Üretim yapılan miktara göre tüketim hesapla
      const expectedConsumption = (bomQuantity / totalPlanned) * totalProduced;
      const currentConsumed = parseFloat(reservation.consumed_quantity || 0);
      const shouldConsume = Math.min(expectedConsumption, parseFloat(reservation.reserved_quantity || 0));

      if (shouldConsume > currentConsumed) {
        const consumptionDiff = shouldConsume - currentConsumed;
        const newConsumed = shouldConsume;
        const newReserved = Math.max(0, parseFloat(reservation.reserved_quantity || 0) - consumptionDiff);

        // Rezervasyonu güncelle
        const newStatus = newConsumed >= parseFloat(reservation.reserved_quantity || 0) ? 'completed' : 'active';

        const { error: updateError } = await supabase
          .from('material_reservations')
          .update({
            consumed_quantity: newConsumed,
            reserved_quantity: newReserved,
            status: newStatus
          })
          .eq('id', reservation.id);

        if (updateError) {
          console.error(`   ❌ Rezervasyon ${reservation.id.substring(0, 8)}...: ${updateError.message}`);
        } else {
          // Malzeme tablosundaki reserved_quantity'yi de azalt
          const tableName = reservation.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
          
          const { error: stockUpdateError } = await supabase
            .from(tableName)
            .update({
              reserved_quantity: newReserved
            })
            .eq('id', reservation.material_id);

          if (!stockUpdateError) {
            fixedCount++;
            totalReleased += consumptionDiff;
            
            if (fixedCount % 10 === 0) {
              console.log(`   ✅ ${fixedCount} rezervasyon düzeltildi...`);
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Düzeltilen rezervasyon: ${fixedCount}`);
    console.log(`   📦 Toplam serbest bırakılan: ${totalReleased.toFixed(2)} adet\n`);

    // Doğrulama
    console.log('🔍 Doğrulama yapılıyor...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: updatedReservations } = await supabase
      .from('material_reservations')
      .select('status, reserved_quantity, consumed_quantity');

    const active = updatedReservations?.filter(r => r.status === 'active').length || 0;
    const completed = updatedReservations?.filter(r => r.status === 'completed').length || 0;
    const totalReserved = updatedReservations?.reduce((sum, r) => sum + parseFloat(r.reserved_quantity || 0), 0) || 0;
    const totalConsumed = updatedReservations?.reduce((sum, r) => sum + parseFloat(r.consumed_quantity || 0), 0) || 0;

    console.log('📊 GÜNCEL REZERVASYON DURUMU:\n');
    console.log(`   Aktif: ${active}`);
    console.log(`   Tamamlanmış: ${completed}`);
    console.log(`   Toplam rezerve: ${totalReserved.toFixed(2)} adet`);
    console.log(`   Toplam tüketilen: ${totalConsumed.toFixed(2)} adet`);
    console.log(`   Bekleyen: ${(totalReserved - totalConsumed).toFixed(2)} adet\n`);

    console.log('✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

