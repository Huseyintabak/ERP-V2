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

async function updateActualStocks() {
  console.log('🔧 GERÇEK STOKLAR GÜNCELLENİYOR (Stok Hareketlerinden)\n');
  console.log('='.repeat(70) + '\n');

  try {
    // 1. Tüm malzemeleri al
    console.log('📦 1. Malzemeler yükleniyor...\n');

    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('id, code, name, quantity');

    const { data: semiMaterials } = await supabase
      .from('semi_finished_products')
      .select('id, code, name, quantity');

    const { data: finishedProducts } = await supabase
      .from('finished_products')
      .select('id, code, name, quantity');

    console.log(`   Hammadde: ${rawMaterials?.length || 0} adet`);
    console.log(`   Yarı Mamul: ${semiMaterials?.length || 0} adet`);
    console.log(`   Nihai Ürün: ${finishedProducts?.length || 0} adet\n`);

    // 2. Her malzeme için stok hareketlerinden gerçek stoku hesapla
    console.log('📊 2. Stok hareketlerinden gerçek stoklar hesaplanıyor...\n');

    const updates = [];

    // Hammadde
    if (rawMaterials) {
      for (const material of rawMaterials) {
        // Bu malzeme için tüm stok hareketlerini topla
        const { data: movements } = await supabase
          .from('stock_movements')
          .select('quantity, movement_type')
          .eq('material_id', material.id)
          .eq('material_type', 'raw')
          .order('created_at', { ascending: true });

        if (!movements || movements.length === 0) continue;

        // İlk stoku bul (başlangıç stoku)
        // Basit yaklaşım: Mevcut stoktan geriye doğru hesapla
        // Ya da son hareketten geriye doğru
        
        // Son hareketin after_quantity'sini kullan
        const { data: lastMovement } = await supabase
          .from('stock_movements')
          .select('after_quantity, created_at')
          .eq('material_id', material.id)
          .eq('material_type', 'raw')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMovement && lastMovement.after_quantity !== null) {
          // Son hareketteki after_quantity ile mevcut stoku karşılaştır
          const calculatedStock = parseFloat(lastMovement.after_quantity);
          const currentStock = parseFloat(material.quantity);

          // Son hareketten sonra başka hareket var mı?
          const { data: movementsAfter } = await supabase
            .from('stock_movements')
            .select('quantity, movement_type')
            .eq('material_id', material.id)
            .eq('material_type', 'raw')
            .gt('created_at', lastMovement.created_at);

          let finalStock = calculatedStock;
          if (movementsAfter && movementsAfter.length > 0) {
            movementsAfter.forEach(m => {
              const qty = parseFloat(m.quantity || 0);
              if (m.movement_type === 'giris' || (m.movement_type === 'uretim' && qty > 0)) {
                finalStock += qty;
              } else {
                finalStock += qty; // Çıkışlar zaten negatif
              }
            });
          }

          const diff = Math.abs(finalStock - currentStock);
          if (diff > 0.01) {
            updates.push({
              material_type: 'raw',
              material_id: material.id,
              material_name: material.name,
              current: currentStock,
              calculated: finalStock,
              difference: finalStock - currentStock
            });
          }
        }
      }
    }

    // Yarı Mamul
    if (semiMaterials) {
      for (const material of semiMaterials) {
        const { data: lastMovement } = await supabase
          .from('stock_movements')
          .select('after_quantity, created_at')
          .eq('material_id', material.id)
          .eq('material_type', 'semi')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMovement && lastMovement.after_quantity !== null) {
          let finalStock = parseFloat(lastMovement.after_quantity);

          const { data: movementsAfter } = await supabase
            .from('stock_movements')
            .select('quantity, movement_type')
            .eq('material_id', material.id)
            .eq('material_type', 'semi')
            .gt('created_at', lastMovement.created_at);

          if (movementsAfter && movementsAfter.length > 0) {
            movementsAfter.forEach(m => {
              const qty = parseFloat(m.quantity || 0);
              if (m.movement_type === 'giris' || (m.movement_type === 'uretim' && qty > 0)) {
                finalStock += qty;
              } else {
                finalStock += qty;
              }
            });
          }

          const currentStock = parseFloat(material.quantity);
          const diff = Math.abs(finalStock - currentStock);
          if (diff > 0.01) {
            updates.push({
              material_type: 'semi',
              material_id: material.id,
              material_name: material.name,
              current: currentStock,
              calculated: finalStock,
              difference: finalStock - currentStock
            });
          }
        }
      }
    }

    // Nihai Ürün
    if (finishedProducts) {
      for (const product of finishedProducts) {
        const { data: lastMovement } = await supabase
          .from('stock_movements')
          .select('after_quantity, created_at')
          .eq('material_id', product.id)
          .eq('material_type', 'finished')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMovement && lastMovement.after_quantity !== null) {
          let finalStock = parseFloat(lastMovement.after_quantity);

          const { data: movementsAfter } = await supabase
            .from('stock_movements')
            .select('quantity, movement_type')
            .eq('material_id', product.id)
            .eq('material_type', 'finished')
            .gt('created_at', lastMovement.created_at);

          if (movementsAfter && movementsAfter.length > 0) {
            movementsAfter.forEach(m => {
              const qty = parseFloat(m.quantity || 0);
              if (m.movement_type === 'giris' || (m.movement_type === 'uretim' && qty > 0)) {
                finalStock += qty;
              } else {
                finalStock += qty;
              }
            });
          }

          const currentStock = parseFloat(product.quantity);
          const diff = Math.abs(finalStock - currentStock);
          if (diff > 0.01) {
            updates.push({
              material_type: 'finished',
              material_id: product.id,
              material_name: product.name,
              current: currentStock,
              calculated: finalStock,
              difference: finalStock - currentStock
            });
          }
        }
      }
    }

    console.log(`✅ Hesaplama tamamlandı!\n`);
    console.log(`📊 ${updates.length} malzeme için tutarsızlık bulundu.\n`);

    if (updates.length > 0) {
      console.log('⚠️  TUTARSIZ STOKLAR:\n');
      updates.slice(0, 20).forEach((update, index) => {
        console.log(`${index + 1}. ${update.material_name} (${update.material_type})`);
        console.log(`   Mevcut: ${update.current.toFixed(2)}`);
        console.log(`   Hesaplanan: ${update.calculated.toFixed(2)}`);
        console.log(`   Fark: ${update.difference > 0 ? '+' : ''}${update.difference.toFixed(2)}\n`);
      });

      if (updates.length > 20) {
        console.log(`   ... ve ${updates.length - 20} malzeme daha\n`);
      }

      console.log('='.repeat(70));
      console.log('\n🔧 Stoklar güncelleniyor...\n');

      let updatedCount = 0;
      let errorCount = 0;

      for (const update of updates) {
        const tableName = update.material_type === 'raw' ? 'raw_materials' :
                         update.material_type === 'semi' ? 'semi_finished_products' : 'finished_products';

        const { error } = await supabase
          .from(tableName)
          .update({ quantity: parseFloat(update.calculated.toFixed(2)) })
          .eq('id', update.material_id);

        if (error) {
          console.error(`   ❌ ${update.material_name}: ${error.message}`);
          errorCount++;
        } else {
          updatedCount++;
          if (updatedCount % 10 === 0) {
            process.stdout.write(`\r   ✅ Güncellendi: ${updatedCount}/${updates.length}`);
          }
        }
      }

      console.log(`\n\n📊 GÜNCELLEME ÖZETİ:\n`);
      console.log(`   ✅ Başarıyla güncellendi: ${updatedCount}`);
      console.log(`   ❌ Hata alan: ${errorCount}`);
      console.log(`   📋 Toplam: ${updates.length}\n`);

      // Doğrulama
      console.log('🔍 Güncelleme sonrası doğrulama...\n');
      
      const sampleUpdate = updates[0];
      if (sampleUpdate) {
        const tableName = sampleUpdate.material_type === 'raw' ? 'raw_materials' :
                         sampleUpdate.material_type === 'semi' ? 'semi_finished_products' : 'finished_products';
        
        const { data: updated } = await supabase
          .from(tableName)
          .select('quantity')
          .eq('id', sampleUpdate.material_id)
          .single();

        if (updated) {
          const diff = Math.abs(parseFloat(updated.quantity) - sampleUpdate.calculated);
          if (diff < 0.01) {
            console.log(`✅ Örnek kontrol başarılı: ${sampleUpdate.material_name}`);
            console.log(`   Güncellenmiş stok: ${updated.quantity}\n`);
          }
        }
      }
    } else {
      console.log('✅ Tüm stoklar tutarlı görünüyor!\n');
    }

    console.log('='.repeat(70));
    console.log('\n✅ İşlem tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error(error.stack);
  }
}

updateActualStocks();

