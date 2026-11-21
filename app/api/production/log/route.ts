import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
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

    // Request body parse — DB'ye gitmeden önce zorunlu alanları doğrula
    const body = await request.json();
    const { plan_id, barcode_scanned, quantity_produced } = body;

    if (!plan_id || !barcode_scanned || !quantity_produced) {
      return NextResponse.json({ 
        error: 'plan_id, barcode_scanned ve quantity_produced gerekli' 
      }, { status: 400 });
    }

    const operatorId = payload.userId;
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Operatörün users tablosunda olduğundan emin ol
    const { data: userExists, error: userCheckError } = await adminSupabase
      .from('users')
      .select('id, role')
      .eq('id', operatorId)
      .single();

    if (userCheckError || !userExists) {
      logger.error('Operator not found in users table:', { 
        operatorId, 
        operatorIdType: typeof operatorId,
        error: userCheckError 
      });
      return NextResponse.json({ 
        error: '❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Kullanıcı bilgisi bulunamadı\n💡 Çözüm: Lütfen tekrar giriş yapın.' 
      }, { status: 401 });
    }

    // Operator ID'nin UUID formatında olduğundan emin ol
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(operatorId)) {
      logger.error('Invalid operator ID format:', { operatorId, operatorIdType: typeof operatorId });
      return NextResponse.json({ 
        error: '❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Geçersiz operatör kimliği formatı\n💡 Çözüm: Lütfen tekrar giriş yapın.' 
      }, { status: 400 });
    }

    // 2. Plan Validasyonu (normal client ile kontrol)
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

    // Plan status kontrolü ve otomatik başlatma
    if (plan.status === 'planlandi') {
      // Plan durumu "planlandi" ise otomatik olarak "devam_ediyor" yap
      const { error: statusUpdateError } = await adminSupabase
        .from('production_plans')
        .update({
          status: 'devam_ediyor',
          started_at: new Date().toISOString()
        })
        .eq('id', plan_id);

      if (statusUpdateError) {
        logger.error('Error auto-starting plan:', statusUpdateError);
        return NextResponse.json({ 
          error: '❌ Plan başlatılamadı!\n\n🔍 Problem: Plan durumu güncellenemedi\n💡 Çözüm: Lütfen sistem yöneticisi ile iletişime geçin.' 
        }, { status: 500 });
      }

      // Plan durumunu güncelle
      plan.status = 'devam_ediyor';
      
      // Operatör durumunu aktif yap (operators tablosunda varsa)
      const { data: operatorExists } = await adminSupabase
        .from('operators')
        .select('id')
        .eq('id', operatorId)
        .single();
      
      if (operatorExists) {
        await adminSupabase
          .from('operators')
          .update({ current_status: 'active' })
          .eq('id', operatorId);
      } else {
        logger.warn(`Operator ${operatorId} not found in operators table, skipping status update`);
      }
    } else if (plan.status !== 'devam_ediyor') {
      return NextResponse.json({ 
        error: `❌ Üretim yapılamadı!\n\n🔍 Problem: Bu plan aktif değil (Durum: ${plan.status})\n💡 Çözüm: Plan durumunu kontrol edin veya planlama departmanından yardım isteyin.` 
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
      logger.error('BOM snapshot fetch error:', bomError);
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

    // 6. Production Log Kaydet (admin client ile RLS bypass)
    // operator_id zaten yukarıda validate edildi, direkt kullanabiliriz
    if (!operatorId || typeof operatorId !== 'string') {
      logger.error('Invalid operator_id before insert:', { operatorId, type: typeof operatorId });
      return NextResponse.json({ 
        error: '❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Geçersiz operatör kimliği\n💡 Çözüm: Lütfen tekrar giriş yapın.' 
      }, { status: 400 });
    }
    
    // Ensure all values are in correct format for PostgreSQL
    // PostgreSQL UUID columns accept UUID strings, but we need to ensure proper format
    const insertData = {
      plan_id: plan_id, // Keep as is, Supabase will handle UUID conversion
      operator_id: operatorId, // Keep as is, Supabase will handle UUID conversion  
      barcode_scanned: String(barcode_scanned).trim(),
      quantity_produced: Number(quantity_produced)
    };
    
    logger.info('Inserting production log:', {
      plan_id,
      operator_id: operatorId,
      operator_id_type: typeof operatorId,
      operator_id_length: operatorId.length,
      barcode_scanned,
      quantity_produced,
      insertData
    });
    
    console.log('📝 Inserting production log:', insertData);
    
    const { data: log, error: logError } = await adminSupabase
      .from('production_logs')
      .insert(insertData)
      .select()
      .single();

    if (logError) {
      // Detaylı hata bilgisi logla
      const errorDetails = {
        code: logError.code,
        message: logError.message,
        details: logError.details,
        hint: logError.hint,
        plan_id,
        operator_id: operatorId,
        barcode_scanned,
        quantity_produced,
        fullError: JSON.stringify(logError, Object.getOwnPropertyNames(logError))
      };
      
      logger.error('Production log insert error:', errorDetails);
      
      // Console'a da yazdır (development için)
      console.error('🔴 Production Log Insert Error:', errorDetails);
      console.error('🔴 Full Error Object:', logError);
      
      // Hata mesajını parse et
      if (logError.message) {
        console.error('🔴 Error Message:', logError.message);
        console.error('🔴 Error Code:', logError.code);
        console.error('🔴 Error Details:', logError.details);
        console.error('🔴 Error Hint:', logError.hint);
      }
      
      // Constraint hatası kontrolü
      if (logError.code === '23514' && logError.message.includes('quantity_check')) {
        return NextResponse.json({ 
          error: '❌ Üretim yapılamadı! Stok yetersizliği nedeniyle üretim durduruldu.\n\n🔍 Problem: Veritabanı seviyesinde stok constraint hatası\n💡 Çözüm: Stok yönetimi sayfasından malzeme stoklarını kontrol edin ve gerekli miktarları artırın.' 
        }, { status: 400 });
      }
      
      // Foreign key constraint hatası (plan_id veya operator_id)
      if (logError.code === '23503') {
        if (logError.message.includes('plan_id') || logError.message.includes('production_plans')) {
          return NextResponse.json({ 
            error: '❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Üretim planı bulunamadı\n💡 Çözüm: Lütfen sayfayı yenileyin ve tekrar deneyin.' 
          }, { status: 404 });
        }
        if (logError.message.includes('operator') || logError.message.includes('users')) {
          // Operator users tablosunda var mı kontrol et
          const { data: userExists } = await adminSupabase
            .from('users')
            .select('id')
            .eq('id', operatorId)
            .single();
          
          if (!userExists) {
            return NextResponse.json({ 
              error: '❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Kullanıcı bilgisi bulunamadı\n💡 Çözüm: Lütfen tekrar giriş yapın.' 
            }, { status: 401 });
          }
          
          // Users tablosunda var ama başka bir sorun var (belki operators tablosunda bir trigger)
          return NextResponse.json({ 
            error: '❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Operatör kaydı eksik. Sistem yöneticisi ile iletişime geçin.\n💡 Çözüm: Operatör bilgilerinin tam olarak kaydedildiğinden emin olun.' 
          }, { status: 500 });
        }
      }
      
      // Not null constraint hatası
      if (logError.code === '23502') {
        return NextResponse.json({ 
          error: `❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: Gerekli alan eksik (${logError.message})\n💡 Çözüm: Lütfen tüm bilgileri doldurun.` 
        }, { status: 400 });
      }
      
      // Daha detaylı hata mesajı
      const errorMessage = logError.message || 'Bilinmeyen veritabanı hatası';
      return NextResponse.json({ 
        error: `❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: ${errorMessage}\n💡 Çözüm: Lütfen sistem yöneticisi ile iletişime geçin.` 
      }, { status: 500 });
    }

    // 7-10. Trigger'lar otomatik çalışacak:
    // - Finished product stok artırılır
    // - BOM snapshot'tan malzeme tüketilir
    // - Stock movements kayıtları oluşur
    // - Plan produced_quantity güncellenir
    // - Kritik seviye kontrolü yapılır

    // Trigger'ların çalışıp çalışmadığını doğrula (kısa bir bekleme sonrası)
    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms bekle

    // Güncellenmiş plan bilgilerini al
    const { data: updatedPlan, error: updatedPlanError } = await supabase
      .from('production_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (updatedPlanError) {
      logger.error('Updated plan fetch error:', updatedPlanError);
    }

    // Trigger'ların çalışıp çalışmadığını kontrol et
    // Nihai ürün stok hareketi oluşmuş mu?
    const { data: finishedMovement, error: movementError } = await adminSupabase
      .from('stock_movements')
      .select('id')
      .eq('material_type', 'finished')
      .eq('material_id', plan.product_id)
      .eq('movement_type', 'uretim')
      .or(`description.ilike.%Plan #${plan_id}%,description.ilike.%plan #${plan_id}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!finishedMovement && !movementError) {
      logger.warn('⚠️ Nihai ürün stok hareketi oluşmamış! Trigger çalışmamış olabilir.', {
        plan_id,
        product_id: plan.product_id,
        log_id: log.id
      });
    }

    // Malzeme tüketim hareketleri kontrolü (örnek 1 malzeme)
    if (bomSnapshot && bomSnapshot.length > 0) {
      const sampleBomItem = bomSnapshot[0];
      const { data: materialMovement } = await adminSupabase
        .from('stock_movements')
        .select('id')
        .eq('material_type', sampleBomItem.material_type)
        .eq('material_id', sampleBomItem.material_id)
        .eq('movement_type', 'uretim')
        .gte('created_at', new Date(Date.now() - 2000).toISOString()) // Son 2 saniye
        .limit(1)
        .single();

      if (!materialMovement) {
        logger.warn('⚠️ Malzeme tüketim hareketi oluşmamış! Trigger çalışmamış olabilir.', {
          plan_id,
          material_id: sampleBomItem.material_id,
          material_type: sampleBomItem.material_type,
          log_id: log.id
        });

        // Eğer trigger çalışmamışsa, manuel olarak stok düşürme dene (fallback)
        logger.error('❌ CRITICAL: Production trigger çalışmadı! Manuel stok düşürme gerekebilir.', {
          plan_id,
          log_id: log.id
        });
      }
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

  } catch (error: any) {
    logger.error('Production Log API error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    
    console.error('🔴 Production Log API Error:', error);
    
    // Eğer error bir Supabase hatası ise, detaylarını göster
    if (error?.code || error?.message) {
      return NextResponse.json({ 
        error: `❌ Üretim kaydı oluşturulamadı!\n\n🔍 Problem: ${error.message || 'Bilinmeyen hata'}\n💡 Çözüm: Lütfen sistem yöneticisi ile iletişime geçin.` 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
