import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const PLAN_ID = '5fcd32b2-ec7b-4717-901f-a05508e4ce21';

async function verifyStockDeduction() {
  console.log('🔍 Gerçek Stok Düşüşü Kontrolü\n');
  console.log(`📋 Plan ID: ${PLAN_ID}\n`);
  console.log('='.repeat(70) + '\n');

  // Plan bilgileri
  const { data: plan } = await supabase
    .from('production_plans')
    .select('*, product:finished_products(name, code)')
    .eq('id', PLAN_ID)
    .single();

  if (!plan) {
    console.error('❌ Plan bulunamadı');
    return;
  }

  console.log(`📦 Ürün: ${plan.product?.name} (${plan.product?.code})`);
  console.log(`📊 Üretilen: ${plan.produced_quantity} adet\n`);

  // Production log zamanı
  const { data: logs } = await supabase
    .from('production_logs')
    .select('timestamp')
    .eq('plan_id', PLAN_ID)
    .order('timestamp', { ascending: true })
    .limit(1)
    .single();

  if (!logs) {
    console.error('❌ Production log bulunamadı');
    return;
  }

  const productionTime = new Date(logs.timestamp);
  console.log(`⏰ Üretim Zamanı: ${productionTime.toLocaleString('tr-TR')}\n`);

  // BOM Snapshot
  const { data: bomSnapshot } = await supabase
    .from('production_plan_bom_snapshot')
    .select('*')
    .eq('plan_id', PLAN_ID);

  if (!bomSnapshot || bomSnapshot.length === 0) {
    console.error('❌ BOM Snapshot bulunamadı');
    return;
  }

  console.log(`📦 BOM Malzemeler: ${bomSnapshot.length} adet\n`);

  // Her malzeme için kontrol
  for (const bomItem of bomSnapshot) {
    // Mevcut stok
    let currentStock = 0;
    let materialName = '';
    
    if (bomItem.material_type === 'raw') {
      const { data: mat } = await supabase
        .from('raw_materials')
        .select('quantity, name')
        .eq('id', bomItem.material_id)
        .single();
      currentStock = parseFloat(mat?.quantity || 0);
      materialName = mat?.name || bomItem.material_name;
    } else if (bomItem.material_type === 'semi') {
      const { data: mat } = await supabase
        .from('semi_finished_products')
        .select('quantity, name')
        .eq('id', bomItem.material_id)
        .single();
      currentStock = parseFloat(mat?.quantity || 0);
      materialName = mat?.name || bomItem.material_name;
    }

    // Beklenen tüketim
    const expectedConsumption = (parseFloat(bomItem.quantity_needed) / parseFloat(plan.planned_quantity)) * parseFloat(plan.produced_quantity);

    // Bu malzeme için üretim zamanı civarındaki tüketim hareketleri
    const timeBefore = new Date(productionTime.getTime() - 60000).toISOString(); // 1 dk önce
    const timeAfter = new Date(productionTime.getTime() + 60000).toISOString(); // 1 dk sonra

    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('material_id', bomItem.material_id)
      .eq('material_type', bomItem.material_type)
      .eq('movement_type', 'uretim')
      .gte('created_at', timeBefore)
      .lte('created_at', timeAfter)
      .order('created_at', { ascending: true });

    // Üretimden ÖNCEKİ son hareketleri topla (önceki stok için)
    const { data: movementsBefore } = await supabase
      .from('stock_movements')
      .select('quantity, movement_type')
      .eq('material_id', bomItem.material_id)
      .eq('material_type', bomItem.material_type)
      .lt('created_at', timeBefore)
      .order('created_at', { ascending: false })
      .limit(10);

    // Önceki stoku hesapla (mevcut stok + üretimden sonraki tüm çıkışlar - üretimden sonraki tüm girişler)
    const { data: movementsAfter } = await supabase
      .from('stock_movements')
      .select('quantity, movement_type')
      .eq('material_id', bomItem.material_id)
      .eq('material_type', bomItem.material_type)
      .gt('created_at', timeAfter);

    let stockAfterProduction = currentStock;
    if (movementsAfter) {
      movementsAfter.forEach(m => {
        if (m.movement_type === 'giris' || (m.movement_type === 'uretim' && parseFloat(m.quantity) > 0)) {
          stockAfterProduction -= parseFloat(m.quantity || 0);
        } else {
          stockAfterProduction += Math.abs(parseFloat(m.quantity || 0));
        }
      });
    }

    const stockBeforeProduction = stockAfterProduction + expectedConsumption;

    console.log(`📦 ${materialName} (${bomItem.material_code}):`);
    console.log(`   Mevcut Stok: ${currentStock.toFixed(2)}`);
    console.log(`   Beklenen Tüketim: ${expectedConsumption.toFixed(2)}`);
    
    if (movements && movements.length > 0) {
      const totalConsumed = movements.reduce((sum, m) => sum + Math.abs(parseFloat(m.quantity || 0)), 0);
      console.log(`   ✅ Stok Hareketi VAR: ${totalConsumed.toFixed(2)} tüketilmiş`);
      
      // before_quantity ve after_quantity kontrolü
      const firstMovement = movements[0];
      if (firstMovement.before_quantity !== null && firstMovement.after_quantity !== null) {
        console.log(`   📊 Hareket Öncesi Stok: ${firstMovement.before_quantity}`);
        console.log(`   📊 Hareket Sonrası Stok: ${firstMovement.after_quantity}`);
        
        const actualDeduction = parseFloat(firstMovement.before_quantity) - parseFloat(firstMovement.after_quantity);
        if (Math.abs(actualDeduction - expectedConsumption) < 0.01) {
          console.log(`   ✅ Stok DÜŞMÜŞ! (${actualDeduction.toFixed(2)} tüketilmiş)`);
        } else {
          console.log(`   ⚠️  UYARI: Tüketim beklenenden farklı (${actualDeduction.toFixed(2)} vs ${expectedConsumption.toFixed(2)})`);
        }
      } else {
        console.log(`   ⚠️  UYARI: before_quantity/after_quantity bilgisi yok`);
      }
    } else {
      console.log(`   ❌ Stok Hareketi YOK!`);
      console.log(`   📊 Hesaplanan Önceki Stok: ${stockBeforeProduction.toFixed(2)}`);
      console.log(`   📊 Hesaplanan Sonraki Stok: ${stockAfterProduction.toFixed(2)}`);
      console.log(`   ⚠️  Stok DÜŞMEMİŞ olabilir!`);
    }
    console.log();
  }
}

verifyStockDeduction();

