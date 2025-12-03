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

async function comprehensiveVerification() {
  console.log('🔍 KAPSAMLI STOK DOĞRULAMA\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Önce order ID'yi bul
    const { data: orderData } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', 'ORD-2025-202')
      .single();

    if (!orderData) {
      console.log('⚠️  ORD-2025-202 siparişi bulunamadı!\n');
      return;
    }

    // 2. ORD-2025-202 için tüm planları al
    const { data: allPlans } = await supabase
      .from('production_plans')
      .select('id, product_id')
      .eq('order_id', orderData.id);

    const planIds = allPlans?.map(p => p.id) || [];
    
    if (planIds.length === 0) {
      console.log('⚠️  ORD-2025-202 için plan bulunamadı!\n');
      return;
    }

    console.log(`📋 ORD-2025-202: ${planIds.length} plan bulundu\n`);

    // 3. Tüm production log'ları al
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced, timestamp, operator_id, created_at')
      .in('plan_id', planIds)
      .order('timestamp', { ascending: true });

    console.log(`📝 Production Log Sayısı: ${allLogs?.length || 0}\n`);

    if (!allLogs || allLogs.length === 0) {
      console.log('⚠️  Production log bulunamadı!\n');
      return;
    }

    // 3. Her log için stok hareketlerini kontrol et
    let missingFinishedMovements = 0;
    let missingMaterialMovements = 0;
    let totalLogsChecked = 0;
    let logsWithIssues = [];

    console.log('🔍 Log\'lar kontrol ediliyor...\n');

    for (const log of allLogs) {
      totalLogsChecked++;
      
      // Nihai ürün stok hareketi kontrolü
      const { data: finishedMovement } = await supabase
        .from('stock_movements')
        .select('id, quantity, before_quantity, after_quantity')
        .eq('production_log_id', log.id)
        .eq('material_type', 'finished')
        .eq('movement_type', 'uretim')
        .limit(1)
        .single();

      if (!finishedMovement) {
        missingFinishedMovements++;
        logsWithIssues.push({
          logId: log.id,
          planId: log.plan_id,
          issue: 'Nihai ürün stok hareketi eksik'
        });
        continue;
      }

      // BOM snapshot'tan malzemeleri al
      const { data: bomItems } = await supabase
        .from('production_plan_bom_snapshot')
        .select('material_type, material_id, material_name, quantity_needed')
        .eq('plan_id', log.plan_id);

      if (!bomItems || bomItems.length === 0) {
        continue; // BOM yoksa malzeme kontrolü yapamayız
      }

      // Plan bilgisini al (planned_quantity için)
      const { data: planData } = await supabase
        .from('production_plans')
        .select('planned_quantity')
        .eq('id', log.plan_id)
        .single();

      const plannedQty = parseFloat(planData?.planned_quantity || 1);

      // Her malzeme için stok hareketi kontrolü
      for (const bomItem of bomItems) {
        const expectedConsumption = (bomItem.quantity_needed / plannedQty) * log.quantity_produced;

        const { data: materialMovement } = await supabase
          .from('stock_movements')
          .select('id, quantity, before_quantity, after_quantity')
          .eq('production_log_id', log.id)
          .eq('material_type', bomItem.material_type)
          .eq('material_id', bomItem.material_id)
          .eq('movement_type', 'uretim')
          .limit(1)
          .single();

        if (!materialMovement) {
          missingMaterialMovements++;
          logsWithIssues.push({
            logId: log.id,
            planId: log.plan_id,
            issue: `Malzeme stok hareketi eksik: ${bomItem.material_name || bomItem.material_id.substring(0, 8)}`
          });
        }
      }
    }

    // 4. Özet rapor
    console.log('='.repeat(70));
    console.log('\n📊 DOĞRULAMA SONUÇLARI:\n');
    console.log(`   ✅ Kontrol edilen log: ${totalLogsChecked}`);
    console.log(`   ❌ Eksik nihai ürün hareketi: ${missingFinishedMovements}`);
    console.log(`   ❌ Eksik malzeme hareketi: ${missingMaterialMovements}`);
    console.log(`   ⚠️  Sorunlu log: ${logsWithIssues.length}\n`);

    if (logsWithIssues.length > 0) {
      console.log('🔴 SORUNLU LOG\'LAR:\n');
      logsWithIssues.slice(0, 10).forEach(issue => {
        console.log(`   - Log ${issue.logId.substring(0, 8)}...: ${issue.issue}`);
      });
      if (logsWithIssues.length > 10) {
        console.log(`   ... ve ${logsWithIssues.length - 10} tane daha\n`);
      }
    }

    // 5. Genel stok hareketi istatistikleri
    console.log('\n📦 GENEL STOK HAREKETİ İSTATİSTİKLERİ:\n');

    // Nihai ürün hareketleri (ORD-2025-202)
    const { data: planData } = await supabase
      .from('production_plans')
      .select('product_id')
      .in('id', planIds);

    const productIds = [...new Set(planData?.map(p => p.product_id).filter(Boolean) || [])];

    let finishedTotal = 0;
    for (const productId of productIds.slice(0, 5)) {
      const { data: movements } = await supabase
        .from('stock_movements')
        .select('quantity, production_log_id')
        .eq('material_type', 'finished')
        .eq('material_id', productId)
        .eq('movement_type', 'uretim')
        .not('production_log_id', 'is', null)
        .in('production_log_id', allLogs.map(l => l.id));

      if (movements) {
        const productTotal = movements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        finishedTotal += productTotal;
        console.log(`   Product ${productId.substring(0, 8)}...: ${movements.length} hareket, ${productTotal.toFixed(2)} adet`);
      }
    }

    // Malzeme tüketim hareketleri
    let materialTotal = 0;
    const { data: materialMovements } = await supabase
      .from('stock_movements')
      .select('quantity')
      .eq('movement_type', 'uretim')
      .in('production_log_id', allLogs.map(l => l.id))
      .neq('material_type', 'finished');

    if (materialMovements) {
      materialTotal = materialMovements.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
      console.log(`\n   Malzeme tüketimi hareketleri: ${materialMovements.length} adet, toplam ${materialTotal.toFixed(2)} adet tüketim\n`);
    }

    // 6. Sonuç
    console.log('='.repeat(70));
    console.log('\n✅ ÖZET:\n');
    
    if (missingFinishedMovements === 0 && missingMaterialMovements === 0) {
      console.log('   🎉 Tüm stok hareketleri mevcut! Stoklar düzgün görünüyor.\n');
      console.log(`   📦 Nihai ürün toplam üretim: ${finishedTotal.toFixed(2)} adet`);
      console.log(`   🔧 Malzeme toplam tüketim: ${materialTotal.toFixed(2)} adet\n`);
    } else {
      console.log(`   ⚠️  ${missingFinishedMovements + missingMaterialMovements} eksik stok hareketi tespit edildi.\n`);
      console.log('   💡 Eksik hareketleri oluşturmak için düzeltme scripti çalıştırılmalı.\n');
    }

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

comprehensiveVerification();

