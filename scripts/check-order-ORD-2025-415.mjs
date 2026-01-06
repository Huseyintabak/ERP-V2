import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Environment variables bulunamadı!');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const ORDER_NUMBER = 'ORD-2025-415';

async function checkOrderStockStatus() {
  console.log('🔍 SİPARİŞ STOK DURUMU KONTROLÜ');
  console.log('='.repeat(80));
  console.log(\`📋 Sipariş No: \${ORDER_NUMBER}\n\`);

  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', ORDER_NUMBER)
      .single();

    if (orderError || !order) {
      console.error('❌ Sipariş bulunamadı!');
      console.error('Hata:', orderError?.message);
      return;
    }

    console.log('📦 SİPARİŞ BİLGİLERİ:');
    console.log(\`   ID: \${order.id}\`);
    console.log(\`   Sipariş No: \${order.order_number}\`);
    console.log(\`   Müşteri: \${order.customer_name}\`);
    console.log(\`   Teslimat Tarihi: \${order.delivery_date}\`);
    console.log(\`   Durum: \${order.status}\`);
    console.log(\`   Öncelik: \${order.priority}\`);
    console.log(\`   Toplam Miktar: \${order.total_quantity}\`);
    console.log();

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(\`
        *,
        product:finished_products(id, code, name, quantity, reserved_quantity, unit)
      \`)
      .eq('order_id', order.id);

    if (itemsError || !orderItems || orderItems.length === 0) {
      console.error('❌ Sipariş ürünleri bulunamadı!');
      console.error('Hata:', itemsError?.message);
      return;
    }

    console.log(\`📦 SİPARİŞ ÜRÜNLERİ: \${orderItems.length} adet\n\`);
    orderItems.forEach((item, index) => {
      console.log(\`   \${index + 1}. \${item.product.name} (\${item.product.code})\`);
      console.log(\`      Sipariş Miktarı: \${item.quantity} \${item.product.unit}\`);
      console.log(\`      Mevcut Stok: \${item.product.quantity} \${item.product.unit}\`);
      console.log(\`      Rezerve Stok: \${item.product.reserved_quantity} \${item.product.unit}\`);
      console.log();
    });

    console.log('🔧 MALZEME GEREKSİNİMLERİ VE STOK DURUMU:');
    console.log('='.repeat(80));
    console.log();

    let allInsufficientMaterials = [];
    let hasStockIssues = false;

    for (const item of orderItems) {
      console.log(\`📦 \${item.product.name} (\${item.product.code}) - \${item.quantity} \${item.product.unit}\`);
      console.log('-'.repeat(80));

      const { data: bomItems, error: bomError } = await supabase
        .from('bom')
        .select('*')
        .eq('finished_product_id', item.product_id);

      if (bomError) {
        console.error('   ❌ BOM bulunamadı:', bomError.message);
        continue;
      }

      if (!bomItems || bomItems.length === 0) {
        console.log('   ⚠️  Bu ürün için BOM tanımlanmamış!\n');
        continue;
      }

      console.log(\`   BOM Malzeme Sayısı: \${bomItems.length}\n\`);

      for (const bomItem of bomItems) {
        const neededQuantity = bomItem.quantity_needed * item.quantity;
        
        let material;
        let materialError;

        if (bomItem.material_type === 'raw') {
          const { data, error } = await supabase
            .from('raw_materials')
            .select('id, code, name, quantity, reserved_quantity, unit')
            .eq('id', bomItem.material_id)
            .single();
          material = data;
          materialError = error;
        } else if (bomItem.material_type === 'semi') {
          const { data, error } = await supabase
            .from('semi_finished_products')
            .select('id, code, name, quantity, reserved_quantity, unit')
            .eq('id', bomItem.material_id)
            .single();
          material = data;
          materialError = error;
        }

        if (materialError || !material) {
          console.log(\`   ❌ Malzeme bulunamadı (ID: \${bomItem.material_id})\`);
          continue;
        }

        const availableStock = parseFloat(material.quantity) - parseFloat(material.reserved_quantity);
        const shortfall = neededQuantity - availableStock;
        const isInsufficient = shortfall > 0;

        if (isInsufficient) {
          hasStockIssues = true;
          console.log(\`   ❌ \${material.name} (\${material.code}) - \${bomItem.material_type === 'raw' ? 'HAM MADDE' : 'YARI MAMUL'}\`);
        } else {
          console.log(\`   ✅ \${material.name} (\${material.code}) - \${bomItem.material_type === 'raw' ? 'HAM MADDE' : 'YARI MAMUL'}\`);
        }

        console.log(\`      Gerekli Miktar: \${neededQuantity.toFixed(2)} \${material.unit}\`);
        console.log(\`      Mevcut Stok: \${material.quantity} \${material.unit}\`);
        console.log(\`      Rezerve Stok: \${material.reserved_quantity} \${material.unit}\`);
        console.log(\`      Kullanılabilir: \${availableStock.toFixed(2)} \${material.unit}\`);

        if (isInsufficient) {
          console.log(\`      🚨 EKSİK: \${shortfall.toFixed(2)} \${material.unit}\`);
          allInsufficientMaterials.push({
            product_name: item.product.name,
            product_code: item.product.code,
            material_name: material.name,
            material_code: material.code,
            material_type: bomItem.material_type,
            needed: neededQuantity,
            available: availableStock,
            shortfall: shortfall,
            unit: material.unit
          });
        }

        console.log();
      }
    }

    console.log('='.repeat(80));
    console.log('📊 STOK KONTROLÜ SONUCU\n');

    if (!hasStockIssues) {
      console.log('✅ TÜM MALZEMELER YETER STOKTA!');
      console.log('✅ Sipariş onaylanabilir.\n');
    } else {
      console.log('❌ STOK YETERSİZLİĞİ TESPİT EDİLDİ!');
      console.log('❌ Sipariş şu anda onaylanamaz.\n');
      
      console.log('🚨 EKSİK MALZEMELER:\n');
      allInsufficientMaterials.forEach((item, index) => {
        console.log(\`\${index + 1}. \${item.product_name} (\${item.product_code}) için:\`);
        console.log(\`   Malzeme: \${item.material_name} (\${item.material_code})\`);
        console.log(\`   Tip: \${item.material_type === 'raw' ? 'HAM MADDE' : 'YARI MAMUL'}\`);
        console.log(\`   Gerekli: \${item.needed.toFixed(2)} \${item.unit}\`);
        console.log(\`   Mevcut: \${item.available.toFixed(2)} \${item.unit}\`);
        console.log(\`   Eksik: \${item.shortfall.toFixed(2)} \${item.unit}\`);
        console.log();
      });

      console.log('💡 ÇÖZÜM ÖNERİSİ:');
      console.log('   1. Eksik malzemeleri satın alın veya üretin');
      console.log('   2. Stok güncellemelerini yapın');
      console.log('   3. Tekrar kontrol edin ve onaylayın\n');
    }

    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Beklenmeyen hata:', error.message);
    console.error(error.stack);
  }
}

checkOrderStockStatus();
