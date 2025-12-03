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
  console.log('🔍 STOK DEĞERLERİ DOĞRULAMA RAPORU\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Production log'larından toplam üretim
    const { data: allLogs } = await supabase
      .from('production_logs')
      .select('quantity_produced');

    const totalFromLogs = allLogs?.reduce((sum, log) => sum + parseFloat(log.quantity_produced || 0), 0) || 0;

    console.log('📊 PRODUCTION LOG\'LARI:\n');
    console.log(`   Toplam production log: ${allLogs?.length || 0}`);
    console.log(`   Toplam üretim miktarı: ${totalFromLogs.toFixed(2)} adet\n`);

    // 2. Stok hareketlerinden nihai ürün üretimi
    const { data: finishedMovements } = await supabase
      .from('stock_movements')
      .select('quantity, material_id, production_log_id')
      .eq('material_type', 'finished')
      .eq('movement_type', 'uretim');

    const totalFromMovements = finishedMovements?.reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0) || 0;
    const withLogId = finishedMovements?.filter(m => m.production_log_id).length || 0;

    console.log('📦 STOK HAREKETLERİ (Nihai Ürün Üretimi):\n');
    console.log(`   Toplam hareket: ${finishedMovements?.length || 0}`);
    console.log(`   Toplam üretim miktarı: ${totalFromMovements.toFixed(2)} adet`);
    console.log(`   production_log_id ile bağlantılı: ${withLogId} adet\n`);

    // 3. Gerçek nihai ürün stokları
    const { data: finishedProducts } = await supabase
      .from('finished_products')
      .select('id, code, name, quantity')
      .order('quantity', { ascending: false })
      .limit(20);

    console.log('🏭 NİHAİ ÜRÜN STOKLARI (İlk 20):\n');
    let totalStockQty = 0;
    finishedProducts?.forEach((product, i) => {
      const qty = parseFloat(product.quantity || 0);
      totalStockQty += qty;
      if (qty > 0) {
        console.log(`   ${i + 1}. ${product.code || product.name}: ${qty.toFixed(2)} adet`);
      }
    });
    console.log(`\n   Toplam stok miktarı (ilk 20): ${totalStockQty.toFixed(2)} adet\n`);

    // 4. Nihai ürün için stok hesaplama doğrulaması (örnek ürün)
    if (finishedProducts && finishedProducts.length > 0) {
      const sampleProduct = finishedProducts.find(p => parseFloat(p.quantity || 0) > 0) || finishedProducts[0];
      
      console.log(`🔍 ÖRNEK ÜRÜN DOĞRULAMA: ${sampleProduct.code || sampleProduct.name}\n`);

      // Bu ürün için tüm stok hareketleri
      const { data: productMovements } = await supabase
        .from('stock_movements')
        .select('movement_type, quantity, created_at')
        .eq('material_type', 'finished')
        .eq('material_id', sampleProduct.id)
        .order('created_at', { ascending: true });

      if (productMovements) {
        const totalProduction = productMovements
          .filter(m => m.movement_type === 'uretim')
          .reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        
        const totalEntry = productMovements
          .filter(m => m.movement_type === 'giris')
          .reduce((sum, m) => sum + parseFloat(m.quantity || 0), 0);
        
        const totalExit = productMovements
          .filter(m => ['cikis', 'satis', 'transfer'].includes(m.movement_type))
          .reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);

        const calculatedStock = totalProduction + totalEntry - totalExit;
        const actualStock = parseFloat(sampleProduct.quantity || 0);

        console.log(`   Üretim: +${totalProduction.toFixed(2)} adet`);
        console.log(`   Giriş: +${totalEntry.toFixed(2)} adet`);
        console.log(`   Çıkış: -${totalExit.toFixed(2)} adet`);
        console.log(`   Hesaplanan Stok: ${calculatedStock.toFixed(2)} adet`);
        console.log(`   Gerçek Stok: ${actualStock.toFixed(2)} adet`);
        console.log(`   Fark: ${(actualStock - calculatedStock).toFixed(2)} adet`);

        if (Math.abs(actualStock - calculatedStock) < 0.01) {
          console.log(`   ✅ Stok değeri doğru!\n`);
        } else {
          console.log(`   ⚠️  Stok değeri tutarsız! (Fark: ${(actualStock - calculatedStock).toFixed(2)} adet)\n`);
        }
      }
    }

    // 5. Malzeme stokları kontrolü
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, code, name, quantity')
      .order('quantity', { ascending: false })
      .limit(10);

    console.log('🔧 HAMMADDE STOKLARI (İlk 10):\n');
    rawMaterials?.forEach((material, i) => {
      const qty = parseFloat(material.quantity || 0);
      if (qty > 0 || qty < 0) {
        console.log(`   ${i + 1}. ${material.code || material.name}: ${qty.toFixed(2)} adet`);
      }
    });

    // 6. Üretimden tüketilen malzeme toplamı
    const { data: consumptionMovements } = await supabase
      .from('stock_movements')
      .select('quantity, material_type')
      .eq('movement_type', 'uretim')
      .neq('material_type', 'finished');

    const totalConsumption = consumptionMovements?.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0) || 0;

    console.log(`\n📉 ÜRETİM TÜKETİMİ:\n`);
    console.log(`   Toplam malzeme tüketimi: ${totalConsumption.toFixed(2)} adet\n`);

    // 7. Özet
    console.log('='.repeat(70));
    console.log('\n📊 ÖZET:\n');
    console.log(`   Production Log Toplam: ${totalFromLogs.toFixed(2)} adet`);
    console.log(`   Stok Hareketi Toplam: ${totalFromMovements.toFixed(2)} adet`);
    console.log(`   Fark: ${Math.abs(totalFromLogs - totalFromMovements).toFixed(2)} adet\n`);

    if (Math.abs(totalFromLogs - totalFromMovements) < 10) {
      console.log('   ✅ Stoklar gerçek değerlerde görünüyor! (Küçük farklar normal)\n');
    } else {
      console.log(`   ⚠️  Tutarsızlık var! Production log ve stok hareketleri uyuşmuyor.\n`);
      console.log(`   💡 Muhtemelen eski üretimlerde stok hareketleri eksik veya yanlış.\n`);
    }

    // 8. Son kontroller
    console.log('🔍 SON KONTROLLER:\n');
    
    // Eksik production_log_id kontrolü
    const { data: movementsWithoutLogId } = await supabase
      .from('stock_movements')
      .select('id', { count: 'exact', head: true })
      .eq('movement_type', 'uretim')
      .eq('material_type', 'finished')
      .is('production_log_id', null);

    if (movementsWithoutLogId && movementsWithoutLogId.length > 0) {
      console.log(`   ⚠️  ${movementsWithoutLogId.length} nihai ürün hareketi production_log_id olmadan!\n`);
    } else {
      console.log(`   ✅ Tüm üretim hareketleri production_log_id ile bağlantılı!\n`);
    }

    // Negatif stok kontrolü
    const { data: negativeStocks } = await supabase
      .from('finished_products')
      .select('code, name, quantity')
      .lt('quantity', 0)
      .limit(10);

    if (negativeStocks && negativeStocks.length > 0) {
      console.log(`   ⚠️  ${negativeStocks.length} ürünün negatif stoku var!\n`);
      negativeStocks.forEach(p => {
        console.log(`      - ${p.code || p.name}: ${p.quantity} adet`);
      });
      console.log();
    } else {
      console.log(`   ✅ Negatif stok yok!\n`);
    }

    console.log('✅ Doğrulama tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
})();

