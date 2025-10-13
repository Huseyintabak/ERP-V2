#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://unodzubpvymgownyjrgz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVub2R6dWJwdnltZ293bnlqcmd6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc2Njc3NSwiZXhwIjoyMDc1MzQyNzc1fQ.5hZiKddMv_8d6d9yqJxs2v8eAEiVmfC0aY2awoXPd1Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

console.log('🚀 Test Verisi Oluşturuluyor...\n');

try {
  // 1. Hammaddeler
  console.log('1️⃣  Hammaddeler ekleniyor...');
  const { error: rawError } = await supabase.from('raw_materials').upsert([
    {
      id: '11111111-1111-1111-1111-111111111111',
      code: 'HM-CELIK-001',
      name: 'Çelik Levha 5mm',
      quantity: 10000,
      unit: 'kg',
      unit_price: 15.50,
      critical_level: 50  // Trigger'ı tetiklememek için düşük değer
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      code: 'HM-BOYA-001',
      name: 'Endüstriyel Boya (Kırmızı)',
      quantity: 500,
      unit: 'lt',
      unit_price: 45.00,
      critical_level: 10  // Trigger'ı tetiklememek için düşük değer
    }
  ], { onConflict: 'id' });
  
  if (rawError) throw rawError;
  console.log('   ✅ Çelik Levha: 10,000 kg');
  console.log('   ✅ Boya: 500 lt\n');

  // 2. Nihai Ürün
  console.log('2️⃣  Nihai Ürün ekleniyor...');
  const { error: productError } = await supabase.from('finished_products').upsert([{
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    code: 'NM-KAPI-001',
    name: 'Endüstriyel Kapı Model A',
    barcode: '8690123456789',
    quantity: 50,
    unit: 'adet',
    sale_price: 2500.00,
    critical_level: 5
  }], { onConflict: 'id' });
  
  if (productError) throw productError;
  console.log('   ✅ Endüstriyel Kapı (Barkod: 8690123456789)\n');

  // 3. BOM
  console.log('3️⃣  BOM (Reçete) ekleniyor...');
  const { error: bomError } = await supabase.from('bom').upsert([
    {
      id: 'bbbbbbbb-1111-1111-1111-111111111111',
      finished_product_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      material_type: 'raw',
      material_id: '11111111-1111-1111-1111-111111111111',
      quantity_needed: 50
    },
    {
      id: 'bbbbbbbb-2222-2222-2222-222222222222',
      finished_product_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      material_type: 'raw',
      material_id: '22222222-2222-2222-2222-222222222222',
      quantity_needed: 2
    }
  ], { onConflict: 'id', ignoreDuplicates: true });
  
  if (bomError) throw bomError;
  console.log('   ✅ Çelik: 50 kg/birim');
  console.log('   ✅ Boya: 2 lt/birim\n');

  // 4. Sipariş
  console.log('4️⃣  Sipariş ekleniyor...');
  const { error: orderError } = await supabase.from('orders').upsert([{
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    order_number: 'ORD-TEST-001',
    customer_id: '92dfe38a-04f2-4b45-83a2-ee96d268c3fb',
    customer_name: 'LTSAUTO',
    total_quantity: 10,
    priority: 'yuksek',
    status: 'uretimde',
    delivery_date: '2025-02-15',
    created_by: '228e0137-818f-4235-9f66-fcb694998267'  // Admin user
  }], { onConflict: 'id' });
  
  if (orderError) throw orderError;
  console.log('   ✅ ORD-TEST-001 (10 adet, LTSAUTO)\n');

  // 5. Sipariş Kalemleri
  console.log('5️⃣  Sipariş kalemleri ekleniyor...');
  const { error: orderItemError } = await supabase.from('order_items').upsert([{
    id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    order_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    product_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    quantity: 10
  }], { onConflict: 'id', ignoreDuplicates: true });
  
  if (orderItemError) throw orderItemError;
  console.log('   ✅ 10 adet Kapı\n');

  // 6. Production Plan
  console.log('6️⃣  Production Plan ekleniyor...');
  const { error: planError } = await supabase.from('production_plans').upsert([{
    id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    order_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    product_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    planned_quantity: 10,
    produced_quantity: 0,
    status: 'planlandi',
    assigned_operator_id: '11111111-1111-1111-1111-111111111111'
  }], { onConflict: 'id' });
  
  if (planError) throw planError;
  console.log('   ✅ Plan oluşturuldu (Thunder Operatör\'e atandı)\n');

  // 7. BOM Snapshot Kontrolü
  console.log('7️⃣  BOM Snapshot kontrol ediliyor...');
  const { data: snapshot } = await supabase
    .from('production_plan_bom_snapshot')
    .select('*')
    .eq('plan_id', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');
  
  if (!snapshot || snapshot.length === 0) {
    console.log('   ⚠️  Snapshot yok, manuel oluşturuluyor...');
    
    const { error: snapshotError } = await supabase.from('production_plan_bom_snapshot').upsert([
      {
        plan_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        material_type: 'raw',
        material_id: '11111111-1111-1111-1111-111111111111',
        material_code: 'HM-CELIK-001',
        material_name: 'Çelik Levha 5mm',
        quantity_needed: 500  // 50 kg × 10 adet
      },
      {
        plan_id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        material_type: 'raw',
        material_id: '22222222-2222-2222-2222-222222222222',
        material_code: 'HM-BOYA-001',
        material_name: 'Endüstriyel Boya (Kırmızı)',
        quantity_needed: 20   // 2 lt × 10 adet
      }
    ], { onConflict: 'plan_id,material_id', ignoreDuplicates: true });
    
    if (snapshotError) throw snapshotError;
    console.log('   ✅ BOM Snapshot oluşturuldu\n');
  } else {
    console.log(`   ✅ BOM Snapshot mevcut (${snapshot.length} malzeme)\n`);
  }

  console.log('✅ ✅ ✅ TÜM TEST VERİSİ BAŞARIYLA OLUŞTURULDU! ✅ ✅ ✅\n');
  console.log('📋 Özet:');
  console.log('   - 2 Hammadde (Çelik: 10,000 kg, Boya: 500 lt)');
  console.log('   - 1 Nihai Ürün (Kapı, Barkod: 8690123456789)');
  console.log('   - 1 BOM (50 kg çelik + 2 lt boya/birim)');
  console.log('   - 1 Sipariş (ORD-TEST-001, 10 adet)');
  console.log('   - 1 Production Plan (Thunder Operatör\'e atandı)');
  console.log('\n🎯 Şimdi operator dashboard\'ı yenileyin!\n');

} catch (error) {
  console.error('\n❌ HATA:', error.message);
  console.error('Details:', error);
  process.exit(1);
}

