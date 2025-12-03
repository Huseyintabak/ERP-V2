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
  console.log('🔍 DETAYLI STOK ANALİZİ\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Stok hareketlerinde duplicate kontrolü
    console.log('📊 STOK HAREKETİ ANALİZİ:\n');

    const { data: allMovements } = await supabase
      .from('stock_movements')
      .select('id, material_type, material_id, movement_type, quantity, production_log_id, created_at')
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim')
      .order('created_at', { ascending: true });

    // production_log_id olan ve olmayanları ayır
    const withLogId = allMovements?.filter(m => m.production_log_id) || [];
    const withoutLogId = allMovements?.filter(m => !m.production_log_id) || [];

    console.log(`   Toplam üretim hareketi: ${allMovements?.length || 0}`);
    console.log(`   production_log_id ile: ${withLogId.length}`);
    console.log(`   production_log_id olmadan: ${withoutLogId.length}\n`);

    // production_log_id olmayan hareketlerin toplamı
    const totalWithoutLogId = withoutLogId.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
    console.log(`   production_log_id olmadan toplam: ${totalWithoutLogId.toFixed(2)} adet\n`);

    // 2. Duplicate kontrolü (aynı production_log_id ile birden fazla hareket)
    const logIdMap = new Map();
    withLogId.forEach(m => {
      if (m.production_log_id) {
        if (!logIdMap.has(m.production_log_id)) {
          logIdMap.set(m.production_log_id, []);
        }
        logIdMap.get(m.production_log_id).push(m);
      }
    });

    const duplicates = Array.from(logIdMap.entries()).filter(([_, movements]) => movements.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`   ⚠️  ${duplicates.length} production_log için duplicate hareket var!\n`);
      duplicates.slice(0, 5).forEach(([logId, movements]) => {
        const total = movements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        console.log(`      Log ${logId.substring(0, 8)}...: ${movements.length} hareket, toplam ${total.toFixed(2)} adet`);
      });
      console.log();
    } else {
      console.log(`   ✅ Duplicate hareket yok!\n`);
    }

    // 3. Tüm hareket tipleri analizi (örnek ürün için)
    const { data: sampleProduct } = await supabase
      .from('finished_products')
      .select('id, code, name, quantity')
      .eq('code', 'TRX-2-BLACK-94-98')
      .single();

    if (sampleProduct) {
      console.log(`🔍 DETAYLI ÜRÜN ANALİZİ: ${sampleProduct.code}\n`);

      const { data: allProductMovements } = await supabase
        .from('stock_movements')
        .select('movement_type, quantity, created_at, production_log_id, description')
        .eq('material_type', 'finished')
        .eq('material_id', sampleProduct.id)
        .order('created_at', { ascending: true });

      if (allProductMovements) {
        const byType = {};
        allProductMovements.forEach(m => {
          const type = m.movement_type || 'unknown';
          if (!byType[type]) {
            byType[type] = [];
          }
          byType[type].push(m);
        });

        console.log('   Hareket Tipleri:\n');
        Object.entries(byType).forEach(([type, movements]) => {
          const total = movements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
          console.log(`      ${type}: ${movements.length} hareket, toplam ${total.toFixed(2)} adet`);
        });

        // Hesaplanan stok
        const production = (byType['uretim'] || []).reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        const entry = (byType['giris'] || []).reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        const exit = (byType['cikis'] || []).reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
        const sales = (byType['satis'] || []).reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
        const transfer = (byType['transfer'] || []).reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);

        const calculated = production + entry - exit - sales - transfer;
        const actual = parseFloat(sampleProduct.quantity || 0);

        console.log(`\n   Özet:\n`);
        console.log(`      Üretim: +${production.toFixed(2)}`);
        console.log(`      Giriş: +${entry.toFixed(2)}`);
        console.log(`      Çıkış: -${exit.toFixed(2)}`);
        console.log(`      Satış: -${sales.toFixed(2)}`);
        console.log(`      Transfer: -${transfer.toFixed(2)}`);
        console.log(`      Hesaplanan: ${calculated.toFixed(2)}`);
        console.log(`      Gerçek: ${actual.toFixed(2)}`);
        console.log(`      Fark: ${(actual - calculated).toFixed(2)}\n`);

        // Eksik hareketler var mı?
        if (Math.abs(actual - calculated) > 1) {
          console.log(`   ⚠️  Fark var! Muhtemelen:\n`);
          console.log(`      - Manuel stok girişi yapılmış olabilir\n`);
          console.log(`      - Satış/transfer kayıtları eksik olabilir\n`);
          console.log(`      - Eski sistemden veri aktarımı sırasında tutarsızlık olmuş olabilir\n`);
        }
      }
    }

    // 4. Production log'lar ile stok hareketlerinin karşılaştırması
    console.log('📋 PRODUCTION LOG vs STOK HAREKETİ KARŞILAŞTIRMA:\n');

    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('id, plan_id, quantity_produced')
      .order('timestamp', { ascending: true });

    let matchedLogs = 0;
    let unmatchedLogs = 0;
    let logTotal = 0;
    let movementTotal = 0;

    for (const log of allLogs || []) {
      logTotal += parseFloat(log.quantity_produced || 0);

      const { data: movements } = await supabase
        .from('stock_movements')
        .select('quantity')
        .eq('production_log_id', log.id)
        .eq('material_type', 'finished');

      if (movements && movements.length > 0) {
        matchedLogs++;
        const movementQty = movements.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        movementTotal += movementQty;
      } else {
        unmatchedLogs++;
      }
    }

    console.log(`   Production Log Toplam: ${logTotal.toFixed(2)} adet`);
    console.log(`   Stok Hareketi Toplam (production_log_id ile): ${movementTotal.toFixed(2)} adet`);
    console.log(`   Eşleşen log: ${matchedLogs}`);
    console.log(`   Eşleşmeyen log: ${unmatchedLogs}\n`);

    // 5. Sonuç ve öneriler
    console.log('='.repeat(70));
    console.log('\n✅ SONUÇ:\n');

    if (withoutLogId.length > 0) {
      console.log(`   ⚠️  ${withoutLogId.length} eski stok hareketi production_log_id olmadan!`);
      console.log(`      Bu hareketler muhtemelen eski sistemden veya manuel oluşturulmuş.\n`);
      console.log(`   💡 ÖNERİ: Bu hareketleri inceleyin veya temizleyin.\n`);
    }

    if (Math.abs(logTotal - movementTotal) > 10) {
      console.log(`   ⚠️  Production log ve stok hareketleri arasında ${Math.abs(logTotal - movementTotal).toFixed(2)} adet fark var!\n`);
      console.log(`   💡 Muhtemelen:\n`);
      console.log(`      - Eski üretimlerde stok hareketleri eksik\n`);
      console.log(`      - Bazı stok hareketleri duplicate\n`);
      console.log(`      - Manuel stok girişleri yapılmış\n`);
    } else {
      console.log(`   ✅ Production log ve stok hareketleri uyumlu!\n`);
    }

    console.log('✅ Analiz tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

