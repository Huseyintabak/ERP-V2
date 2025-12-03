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
  console.log('📚 REZERVASYON SİSTEMİ AÇIKLAMASI\n');
  console.log('='.repeat(70) + '\n');

  try {
    // Rezervasyon durumu
    const { data: reservations } = await supabase
      .from('material_reservations')
      .select('order_id, material_type, reserved_quantity, consumed_quantity, status')
      .limit(10);

    console.log('🔍 REZERVASYON SİSTEMİ NASIL ÇALIŞIR?\n');
    console.log('1️⃣  SİPARİŞ ONAYLANDIĞINDA:\n');
    console.log('   ✅ Production plan oluşturulur');
    console.log('   ✅ BOM\'a göre malzemeler rezerve edilir');
    console.log('   ✅ reserved_quantity artar (ama quantity azalmaz!)\n');
    console.log('   Örnek: 100 adet ürün için 50 adet malzeme rezerve edilir');
    console.log('   - quantity: 1000 (değişmedi)');
    console.log('   - reserved_quantity: 50 (yeni rezerve)');
    console.log('   - Kullanılabilir stok: 1000 - 50 = 950 adet\n');

    console.log('2️⃣  ÜRETİM YAPILDIĞINDA:\n');
    console.log('   ✅ Gerçek stok düşer (quantity azalır)');
    console.log('   ✅ Rezerve miktar azalır (reserved_quantity azalır)');
    console.log('   ✅ Tüketilen miktar artar (consumed_quantity artar)\n');
    console.log('   Örnek: 20 adet üretim yapıldı');
    console.log('   - quantity: 1000 → 990 (10 adet düştü)');
    console.log('   - reserved_quantity: 50 → 40 (10 adet azaldı)');
    console.log('   - consumed_quantity: 0 → 10 (10 adet tüketildi)\n');

    console.log('3️⃣  REZERVE EDİLEN MALZEMELER:\n');
    console.log('   📦 Rezerve edilen malzemeler HENÜZ stoktan düşülmemiştir!');
    console.log('   📦 Sadece "ayrılmış" durumdadır');
    console.log('   📦 Üretim yapıldığında hem stok düşer hem rezerve azalır\n');

    // Mevcut rezervasyon durumu
    const { data: stats } = await supabase
      .from('material_reservations')
      .select('status, reserved_quantity, consumed_quantity');

    const active = stats?.filter(r => r.status === 'active').length || 0;
    const completed = stats?.filter(r => r.status === 'completed').length || 0;
    const totalReserved = stats?.reduce((sum, r) => sum + parseFloat(r.reserved_quantity || 0), 0) || 0;
    const totalConsumed = stats?.reduce((sum, r) => sum + parseFloat(r.consumed_quantity || 0), 0) || 0;

    console.log('='.repeat(70));
    console.log('\n📊 MEVCUT REZERVASYON DURUMU:\n');
    console.log(`   Aktif rezervasyon: ${active}`);
    console.log(`   Tamamlanmış rezervasyon: ${completed}`);
    console.log(`   Toplam rezerve edilen: ${totalReserved.toFixed(2)} adet`);
    console.log(`   Toplam tüketilen: ${totalConsumed.toFixed(2)} adet`);
    console.log(`   Bekleyen (rezerve - tüketilen): ${(totalReserved - totalConsumed).toFixed(2)} adet\n`);

    // Hammadde ve yarı mamul rezerve durumu
    const { data: rawMaterials } = await supabase
      .from('raw_materials')
      .select('code, name, quantity, reserved_quantity')
      .gt('reserved_quantity', 0)
      .limit(5);

    console.log('🔧 REZERVE EDİLEN HAMMADDELER (Örnek):\n');
    rawMaterials?.forEach(m => {
      const available = parseFloat(m.quantity || 0) - parseFloat(m.reserved_quantity || 0);
      console.log(`   ${m.code || m.name}:`);
      console.log(`      Toplam stok: ${parseFloat(m.quantity || 0).toFixed(2)}`);
      console.log(`      Rezerve: ${parseFloat(m.reserved_quantity || 0).toFixed(2)}`);
      console.log(`      Kullanılabilir: ${available.toFixed(2)}\n`);
    });

    console.log('='.repeat(70));
    console.log('\n✅ ÖZET:\n');
    console.log('   📌 Rezerve = Henüz stoktan düşülmemiş, ama "ayrılmış" malzeme');
    console.log('   📌 Üretim yapıldığında rezerve azalır, stok düşer');
    console.log('   📌 Plan iptal edilirse rezerve geri alınır\n');

    console.log('✅ Açıklama tamamlandı!\n');

  } catch (error) {
    console.error('❌ Hata:', error.message);
  }
})();

