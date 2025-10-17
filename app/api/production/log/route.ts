import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    // 1. Auth & Permission Check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operatorId = payload.userId;
    const supabase = await createClient();

    // Request body parse
    const body = await request.json();
    const { plan_id, barcode_scanned, quantity_produced } = body;

    if (!plan_id || !barcode_scanned || !quantity_produced) {
      return NextResponse.json({ 
        error: 'plan_id, barcode_scanned ve quantity_produced gerekli' 
      }, { status: 400 });
    }

    // 2. Plan Validasyonu
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(*),
        product:finished_products(*)
      `)
      .eq('id', plan_id)
      .eq('assigned_operator_id', operatorId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ 
        error: '❌ Üretim yapılamadı!\n\n🔍 Problem: Plan bulunamadı veya size atanmamış\n💡 Çözüm: Planlama departmanından size bir görev atanmasını isteyin.' 
      }, { status: 404 });
    }

    // Plan status kontrolü
    if (plan.status !== 'devam_ediyor') {
      return NextResponse.json({ 
        error: `❌ Üretim yapılamadı!\n\n🔍 Problem: Bu plan aktif değil (Durum: ${plan.status})\n💡 Çözüm: Planlama departmanından planın aktif hale getirilmesini isteyin.` 
      }, { status: 400 });
    }

    // 3. Barkod/Code Validasyonu
    const product = plan.product;
    if (!product) {
      return NextResponse.json({ 
        error: '❌ Üretim yapılamadı!\n\n🔍 Problem: Ürün bilgisi bulunamadı\n💡 Çözüm: Lütfen sistem yöneticisi ile iletişime geçin.' 
      }, { status: 404 });
    }

    // Barkod varsa kontrol et, yoksa code ile devam et
    const expectedIdentifier = product.barcode || product.code;
    if (barcode_scanned !== expectedIdentifier) {
      const identifierType = product.barcode ? 'barkod' : 'ürün kodu';
      return NextResponse.json({ 
        error: `❌ Üretim yapılamadı!\n\n🔍 Problem: Yanlış ${identifierType}\n• Beklenen: ${expectedIdentifier}\n• Girilen: ${barcode_scanned}\n\n💡 Çözüm: Doğru ${identifierType} ile tekrar deneyin.` 
      }, { status: 400 });
    }

    // 4. Miktar Kontrolü
    const totalProduced = plan.produced_quantity + quantity_produced;
    if (totalProduced > plan.planned_quantity) {
      const remaining = plan.planned_quantity - plan.produced_quantity;
      return NextResponse.json({ 
        error: `❌ Üretim yapılamadı!\n\n🔍 Problem: Hedef miktar aşılamaz\n• Planlanan: ${plan.planned_quantity} adet\n• Üretilen: ${plan.produced_quantity} adet\n• Kalan: ${remaining} adet\n• Girilen: ${quantity_produced} adet\n\n💡 Çözüm: Maksimum ${remaining} adet üretim yapabilirsiniz.` 
      }, { status: 400 });
    }

    // 5. Stok Yeterlilik Kontrolü (BOM Snapshot)
    const { data: bomSnapshot, error: bomError } = await supabase
      .from('production_plan_bom_snapshot')
      .select('*')
      .eq('plan_id', plan_id);

    if (bomError) {
      console.error('BOM snapshot fetch error:', bomError);
      return NextResponse.json({ 
        error: '❌ Üretim yapılamadı!\n\n🔍 Problem: BOM bilgileri alınamadı\n💡 Çözüm: Lütfen sistem yöneticisi ile iletişime geçin.' 
      }, { status: 500 });
    }

    if (!bomSnapshot || bomSnapshot.length === 0) {
      return NextResponse.json({ 
        error: '❌ Üretim yapılamadı!\n\n🔍 Problem: Bu plan için BOM snapshot bulunamadı\n💡 Çözüm: Siparişi yeniden onaylayın veya sistem yöneticisi ile iletişime geçin.' 
      }, { status: 404 });
    }

    // Her malzeme için stok kontrolü
    const stockChecks = [];
    for (const item of bomSnapshot) {
      const consumption = (item.quantity_needed / plan.planned_quantity) * quantity_produced;
      
      let material;
      if (item.material_type === 'raw') {
        const { data: rawMaterial, error: rawError } = await supabase
          .from('raw_materials')
          .select('*')
          .eq('id', item.material_id)
          .single();
        
        if (rawError || !rawMaterial) continue;
        material = rawMaterial;
      } else if (item.material_type === 'semi') {
        const { data: semiMaterial, error: semiError } = await supabase
          .from('semi_finished_products')
          .select('*')
          .eq('id', item.material_id)
          .single();
        
        if (semiError || !semiMaterial) continue;
        material = semiMaterial;
      }

      if (material && material.quantity < consumption) {
        return NextResponse.json({ 
          error: `❌ Üretim yapılamadı! Stok yetersizliği nedeniyle üretim durduruldu.\n\n🔍 Problemli Malzeme:\n• ${item.material_name} (${item.material_code})\n• Mevcut Stok: ${material.quantity} ${item.material_type === 'raw' ? 'kg' : 'adet'}\n• Gerekli Miktar: ${consumption.toFixed(2)} ${item.material_type === 'raw' ? 'kg' : 'adet'}\n• Eksik Miktar: ${(consumption - material.quantity).toFixed(2)} ${item.material_type === 'raw' ? 'kg' : 'adet'}\n\n💡 Çözüm: Stok yönetimi sayfasından ${item.material_name} malzemesinin stok miktarını artırın.` 
        }, { status: 400 });
      }

      stockChecks.push({
        material_type: item.material_type,
        material_id: item.material_id,
        material_code: item.material_code,
        material_name: item.material_name,
        consumption: consumption,
        before: material?.quantity || 0
      });
    }

    // 6. Production Log Kaydet
    const { data: log, error: logError } = await supabase
      .from('production_logs')
      .insert({
        plan_id,
        operator_id: operatorId,
        barcode_scanned,
        quantity_produced
      })
      .select()
      .single();

    if (logError) {
      console.error('Production log insert error:', logError);
      
      // Constraint hatası kontrolü
      if (logError.code === '23514' && logError.message.includes('quantity_check')) {
        return NextResponse.json({ 
          error: '❌ Üretim yapılamadı! Stok yetersizliği nedeniyle üretim durduruldu.\n\n🔍 Problem: Veritabanı seviyesinde stok constraint hatası\n💡 Çözüm: Stok yönetimi sayfasından malzeme stoklarını kontrol edin ve gerekli miktarları artırın.' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        error: '❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Veritabanı hatası\n💡 Çözüm: Lütfen sistem yöneticisi ile iletişime geçin.' 
      }, { status: 500 });
    }

    // 7-10. Trigger'lar otomatik çalışacak:
    // - Finished product stok artırılır
    // - BOM snapshot'tan malzeme tüketilir
    // - Stock movements kayıtları oluşur
    // - Plan produced_quantity güncellenir
    // - Kritik seviye kontrolü yapılır

    // Güncellenmiş plan bilgilerini al
    const { data: updatedPlan, error: updatedPlanError } = await supabase
      .from('production_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (updatedPlanError) {
      console.error('Updated plan fetch error:', updatedPlanError);
    }

    // Response hazırla
    const response = {
      success: true,
      log,
      planProgress: {
        produced: updatedPlan?.produced_quantity || plan.produced_quantity + quantity_produced,
        planned: plan.planned_quantity,
        remaining: plan.planned_quantity - (updatedPlan?.produced_quantity || plan.produced_quantity + quantity_produced),
        percentage: Math.round(((updatedPlan?.produced_quantity || plan.produced_quantity + quantity_produced) / plan.planned_quantity) * 100)
      },
      stockUpdates: {
        finishedProduct: {
          before: product.quantity,
          after: product.quantity + quantity_produced
        },
        consumedMaterials: stockChecks.map(check => ({
          type: check.material_type,
          code: check.material_code,
          name: check.material_name,
          consumed: check.consumption,
          before: check.before,
          after: check.before - check.consumption
        }))
      },
      criticalWarnings: [] // Trigger'lar tarafından otomatik bildirim oluşturulacak
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Production Log API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
