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
  console.log('🔍 KAPSAMLI STOK DOĞRULAMA RAPORU\n');
  console.log('='.repeat(70) + '\n');

  // 1. Tüm production log'ları al
  const { data: allLogs, error: logsError } = await supabase
    .from('production_logs')
    .select('id, plan_id, quantity_produced, timestamp')
    .order('timestamp', { ascending: false })
    .limit(200);

  if (logsError) {
    console.error('❌ Production log hatası:', logsError);
    return;
  }

  console.log(`📝 Toplam Production Log: ${allLogs?.length || 0}\n`);

  if (!allLogs || allLogs.length === 0) {
    console.log('⚠️  Hiç production log bulunamadı!\n');
    return;
  }

  // 2. Her log için stok hareketi kontrolü
  let logsWithFinishedMovement = 0;
  let logsWithoutFinishedMovement = 0;
  let logsWithMaterialMovements = 0;
  let logsWithoutMaterialMovements = 0;
  let totalFinishedQty = 0;
  let totalMaterialConsumption = 0;
  const problematicLogs = [];

  console.log('🔍 Log\'lar kontrol ediliyor...\n');

  for (const log of allLogs) {
    // Nihai ürün stok hareketi kontrolü
    const { data: finishedMovement } = await supabase
      .from('stock_movements')
      .select('id, quantity, before_quantity, after_quantity')
      .eq('production_log_id', log.id)
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim')
      .limit(1)
      .single();

    if (finishedMovement) {
      logsWithFinishedMovement++;
      totalFinishedQty += parseFloat(finishedMovement.quantity || 0);
    } else {
      logsWithoutFinishedMovement++;
      problematicLogs.push({
        logId: log.id,
        planId: log.plan_id,
        issue: 'Nihai ürün stok hareketi eksik'
      });
    }

    // Malzeme stok hareketi kontrolü
    const { data: materialMovements } = await supabase
      .from('stock_movements')
      .select('id, quantity')
      .eq('production_log_id', log.id)
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished');

    if (materialMovements && materialMovements.length > 0) {
      logsWithMaterialMovements++;
      const materialTotal = materialMovements.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
      totalMaterialConsumption += materialTotal;
    } else {
      logsWithoutMaterialMovements++;
      if (!finishedMovement) {
        // Zaten eklendi
      } else if (problematicLogs.find(p => p.logId === log.id)) {
        problematicLogs.find(p => p.logId === log.id).issue += ', Malzeme hareketi eksik';
      } else {
        problematicLogs.push({
          logId: log.id,
          planId: log.plan_id,
          issue: 'Malzeme stok hareketi eksik'
        });
      }
    }
  }

  // 3. Genel stok hareketi istatistikleri
  const { data: allFinishedMovements } = await supabase
    .from('stock_movements')
    .select('quantity, production_log_id')
    .eq('material_type', 'finished')
    .eq('movement_type', 'uretim');

  const { data: allMaterialMovements } = await supabase
    .from('stock_movements')
    .select('quantity, production_log_id')
    .eq('movement_type', 'uretim')
    .neq('material_type', 'finished');

  // 4. Rapor
  console.log('='.repeat(70));
  console.log('\n📊 DETAYLI SONUÇLAR:\n');

  console.log('📝 PRODUCTION LOG\'LARI:\n');
  console.log(`   ✅ Toplam log: ${allLogs.length}`);
  console.log(`   ✅ Nihai ürün hareketi olan: ${logsWithFinishedMovement}`);
  console.log(`   ❌ Nihai ürün hareketi eksik: ${logsWithoutFinishedMovement}`);
  console.log(`   ✅ Malzeme hareketi olan: ${logsWithMaterialMovements}`);
  console.log(`   ❌ Malzeme hareketi eksik: ${logsWithoutMaterialMovements}\n`);

  console.log('📦 STOK HAREKETİ İSTATİSTİKLERİ:\n');
  console.log(`   Nihai ürün toplam üretim: ${totalFinishedQty.toFixed(2)} adet`);
  console.log(`   Malzeme toplam tüketim: ${totalMaterialConsumption.toFixed(2)} adet\n`);

  if (allFinishedMovements) {
    const globalFinishedTotal = allFinishedMovements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
    const withLogId = allFinishedMovements.filter(m => m.production_log_id).length;
    console.log(`   📊 Tüm nihai ürün hareketleri: ${allFinishedMovements.length} adet, toplam ${globalFinishedTotal.toFixed(2)} adet`);
    console.log(`   🔗 production_log_id olan: ${withLogId} adet\n`);
  }

  if (allMaterialMovements) {
    const globalMaterialTotal = allMaterialMovements.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
    const withLogId = allMaterialMovements.filter(m => m.production_log_id).length;
    console.log(`   📊 Tüm malzeme hareketleri: ${allMaterialMovements.length} adet, toplam ${globalMaterialTotal.toFixed(2)} adet`);
    console.log(`   🔗 production_log_id olan: ${withLogId} adet\n`);
  }

  // 5. Sorunlu log'lar
  console.log('='.repeat(70));
  console.log(`\n⚠️  SORUNLU LOG'LAR: ${problematicLogs.length}\n`);

  if (problematicLogs.length > 0) {
    console.log('İlk 10 sorunlu log:\n');
    problematicLogs.slice(0, 10).forEach((issue, i) => {
      console.log(`   ${i + 1}. Log ${issue.logId.substring(0, 8)}...`);
      console.log(`      Plan: ${issue.planId?.substring(0, 8)}...`);
      console.log(`      Sorun: ${issue.issue}\n`);
    });

    if (problematicLogs.length > 10) {
      console.log(`   ... ve ${problematicLogs.length - 10} tane daha\n`);
    }

    console.log('💡 ÖNERİ: Sorunlu log\'lar için retroaktif stok hareketi oluşturulmalı.\n');
  } else {
    console.log('   🎉 Tüm log\'lar için stok hareketleri mevcut!\n');
  }

  // 6. Genel durum
  console.log('='.repeat(70));
  console.log('\n✅ GENEL DURUM:\n');

  const successRate = ((logsWithFinishedMovement / allLogs.length) * 100).toFixed(1);
  console.log(`   📊 Başarı oranı: ${successRate}%`);

  if (logsWithoutFinishedMovement === 0 && logsWithoutMaterialMovements === 0) {
    console.log('   🎉 Stoklar düzgün! Tüm üretimler için stok hareketleri mevcut.\n');
  } else {
    console.log(`   ⚠️  ${logsWithoutFinishedMovement + logsWithoutMaterialMovements} log için eksik stok hareketi var.\n`);
    console.log('   💡 Eksik hareketleri oluşturmak için düzeltme scripti çalıştırılmalı.\n');
  }

})();

