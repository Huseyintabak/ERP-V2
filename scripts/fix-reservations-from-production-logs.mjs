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
  console.log('🔧 PRODUCTION LOG\'LARDAN REZERVASYONLARI DÜZELTİYOR\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Tüm production log'ları al
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced, timestamp')
      .order('timestamp', { ascending: true });

    console.log(`📝 Toplam ${allLogs?.length || 0} production log bulundu\n`);
    console.log('🔍 Kontrol ediliyor ve rezervasyonlar güncelleniyor...\n');

    if (!allLogs || allLogs.length === 0) {
      console.log('⚠️  Production log bulunamadı!\n');
      return;
    }

    let updatedCount = 0;
    let totalReleased = 0;
    const processedReservations = new Set();

    // Her log için
    for (const log of allLogs) {
      // Plan bilgisini al
      const { data: planData } = await supabase
        .from('production_plans')
        .select('order_id, planned_quantity')
        .eq('id', log.plan_id)
        .single();

      if (!planData || !planData.order_id) {
        continue; // Order yoksa rezervasyon da yok
      }

      const plannedQty = parseFloat(planData.planned_quantity || 1);
      const producedQty = parseFloat(log.quantity_produced || 0);

      if (plannedQty <= 0 || producedQty <= 0) {
        continue;
      }

      // BOM snapshot'ı al
      const { data: bomSnapshot } = await supabase
        .from('production_plan_bom_snapshot')
        .select('material_type, material_id, quantity_needed')
        .eq('plan_id', log.plan_id);

      if (!bomSnapshot || bomSnapshot.length === 0) {
        continue;
      }

      // Her malzeme için rezervasyonu güncelle
      for (const bomItem of bomSnapshot) {
        const consumptionQty = (bomItem.quantity_needed / plannedQty) * producedQty;

        if (consumptionQty <= 0) {
          continue;
        }

        // Bu order ve malzeme için rezervasyon bul
        const { data: reservation } = await supabase
          .from('material_reservations')
          .select('id, reserved_quantity, consumed_quantity, status')
          .eq('order_id', planData.order_id)
          .eq('material_type', bomItem.material_type)
          .eq('material_id', bomItem.material_id)
          .eq('status', 'active')
          .single();

        if (!reservation) {
          continue; // Rezervasyon yok veya tamamlanmış
        }

        const reservationKey = reservation.id;
        if (processedReservations.has(reservationKey)) {
          continue; // Zaten işlendi
        }

        // Mevcut consumed ve reserved
        const currentConsumed = parseFloat(reservation.consumed_quantity || 0);
        const currentReserved = parseFloat(reservation.reserved_quantity || 0);

        // Bu log için beklenen tüketim
        // Tüm log'lar için toplam tüketimi hesapla
        const { data: allPlanLogs } = await supabase
          .from('production_logs')
          .select('quantity_produced')
          .eq('plan_id', log.plan_id);

        let totalProducedForPlan = 0;
        allPlanLogs?.forEach(l => {
          totalProducedForPlan += parseFloat(l.quantity_produced || 0);
        });

        const expectedConsumption = (bomItem.quantity_needed / plannedQty) * totalProducedForPlan;

        if (expectedConsumption > currentConsumed) {
          const consumptionDiff = expectedConsumption - currentConsumed;
          const newConsumed = Math.min(expectedConsumption, currentReserved);
          const newReserved = Math.max(0, currentReserved - consumptionDiff);
          const newStatus = newConsumed >= currentReserved ? 'completed' : 'active';

          // Rezervasyonu güncelle
          const { error: updateError } = await supabase
            .from('material_reservations')
            .update({
              consumed_quantity: newConsumed,
              reserved_quantity: newReserved,
              status: newStatus
            })
            .eq('id', reservation.id);

          if (!updateError) {
            // Malzeme tablosundaki reserved_quantity'yi de güncelle
            const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
            
            const { data: currentMaterial } = await supabase
              .from(tableName)
              .select('reserved_quantity')
              .eq('id', bomItem.material_id)
              .single();

            if (currentMaterial) {
              const currentMaterialReserved = parseFloat(currentMaterial.reserved_quantity || 0);
              const newMaterialReserved = Math.max(0, currentMaterialReserved - consumptionDiff);

              await supabase
                .from(tableName)
                .update({ reserved_quantity: newMaterialReserved })
                .eq('id', bomItem.material_id);

              updatedCount++;
              totalReleased += consumptionDiff;
              processedReservations.add(reservationKey);

              if (updatedCount % 10 === 0) {
                console.log(`   ✅ ${updatedCount} rezervasyon güncellendi...`);
              }
            }
          }
        }
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n📊 SONUÇ:\n');
    console.log(`   ✅ Güncellenen rezervasyon: ${updatedCount}`);
    console.log(`   📦 Toplam serbest bırakılan: ${totalReleased.toFixed(2)} adet\n`);

    // Doğrulama
    console.log('🔍 Doğrulama yapılıyor...\n');
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    const { data: finalReservations } = await supabase
      .from('material_reservations')
      .select('status, reserved_quantity, consumed_quantity');

    const active = finalReservations?.filter(r => r.status === 'active').length || 0;
    const completed = finalReservations?.filter(r => r.status === 'completed').length || 0;
    const totalReserved = finalReservations?.reduce((sum, r) => sum + parseFloat(r.reserved_quantity || 0), 0) || 0;
    const totalConsumed = finalReservations?.reduce((sum, r) => sum + parseFloat(r.consumed_quantity || 0), 0) || 0;

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

