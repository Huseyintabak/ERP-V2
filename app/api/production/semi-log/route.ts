import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
import { relationOne } from '@/lib/utils/supabase-relation';
export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    const { order_id, barcode_scanned, quantity_produced } = await request.json();

    logger.log('📝 Semi production log request:', {
      order_id,
      barcode_scanned,
      quantity_produced,
      operatorId,
    });

    if (!order_id || !barcode_scanned) {
      return NextResponse.json({ 
        error: 'order_id ve barcode_scanned gerekli',
        received: { order_id: !!order_id, barcode_scanned: !!barcode_scanned }
      }, { status: 400 });
    }

    // Yarı mamul üretim siparişinin operatöre atanmış olduğunu kontrol et
    const { data: order, error: orderError } = await supabase
      .from('semi_production_orders')
      .select(`
        assigned_operator_id, 
        status, 
        planned_quantity, 
        produced_quantity,
        product_id,
        semi_finished_products!semi_production_orders_product_id_fkey (
          id,
          code,
          barcode
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      logger.error('Order fetch error:', orderError);
      return NextResponse.json({ 
        error: 'Yarı mamul üretim siparişi bulunamadı',
        details: orderError?.message || 'Sipariş bulunamadı',
        order_id 
      }, { status: 404 });
    }

    logger.log('📦 Order found:', {
      id: order_id,
      assigned_operator_id: order.assigned_operator_id,
      current_operator_id: operatorId,
      status: order.status,
      planned_quantity: order.planned_quantity,
      produced_quantity: order.produced_quantity,
    });

    if (order.assigned_operator_id !== operatorId) {
      return NextResponse.json({ 
        error: 'Bu sipariş size atanmamış',
        details: `Sipariş ${order.assigned_operator_id} operatörüne atanmış, siz ${operatorId}`
      }, { status: 403 });
    }

    // Eğer sipariş "planlandi" durumundaysa, "devam_ediyor"a geçir
    if (order.status === 'planlandi') {
      const { error: statusUpdateError } = await supabase
        .from('semi_production_orders')
        .update({ 
          status: 'devam_ediyor',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id);
      
      if (statusUpdateError) {
        logger.error('Status update error:', statusUpdateError);
      } else {
        order.status = 'devam_ediyor';
        logger.log('✅ Order status updated to devam_ediyor');
      }
    }

    if (order.status !== 'devam_ediyor') {
      return NextResponse.json({ 
        error: 'Bu sipariş aktif değil',
        details: `Sipariş durumu: ${order.status} (gerekli: devam_ediyor veya planlandi)`
      }, { status: 400 });
    }

    // Barkod doğrulaması
    const product = relationOne(order.semi_finished_products);
    if (product) {
      const expectedIdentifier = product.barcode || product.code;
      if (barcode_scanned.trim() !== expectedIdentifier) {
        const identifierType = product.barcode ? 'barkod' : 'ürün kodu';
        logger.warn('Barcode mismatch:', {
          expected: expectedIdentifier,
          received: barcode_scanned,
          product_id: order.product_id,
        });
        return NextResponse.json({ 
          error: `❌ Üretim yapılamadı!\n\n🔍 Problem: Yanlış ${identifierType}\n• Beklenen: ${expectedIdentifier}\n• Girilen: ${barcode_scanned.trim()}\n\n💡 Çözüm: Doğru ${identifierType} ile tekrar deneyin.`,
          expected: expectedIdentifier,
          received: barcode_scanned.trim()
        }, { status: 400 });
      }
    } else {
      logger.warn('Product not found for order:', order_id);
    }

    // Yeni üretim miktarını hesapla
    const newProducedQuantity = order.produced_quantity + (quantity_produced || 1);
    
    if (newProducedQuantity > order.planned_quantity) {
      return NextResponse.json({ 
        error: `Üretim miktarı planlanan miktarı aşamaz. Maksimum: ${order.planned_quantity}` 
      }, { status: 400 });
    }

    // Production log oluştur (RLS bypass için admin client kullan)
    const adminClient = createAdminClient();
    const { data: log, error: logError } = await adminClient
      .from('semi_production_logs')
      .insert({
        order_id,
        operator_id: operatorId,
        barcode_scanned: barcode_scanned.trim(),
        quantity_produced: quantity_produced || 1,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      logger.error('Semi production log creation error:', logError);
      logger.error('Error details:', {
        code: logError.code,
        message: logError.message,
        details: logError.details,
        hint: logError.hint,
      });
      
      // Daha açıklayıcı hata mesajı
      let errorMessage = 'Log oluşturulamadı';
      if (logError.code === '23503') {
        errorMessage = 'Barkod veya operatör bilgisi geçersiz';
      } else if (logError.code === '23505') {
        errorMessage = 'Bu barkod zaten kullanılmış';
      } else if (logError.message) {
        errorMessage = `Log oluşturulamadı: ${logError.message}`;
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: logError.message,
        code: logError.code 
      }, { status: 500 });
    }

    // Yarı mamul üretim siparişinin üretilen miktarını güncelle
    const { error: updateError } = await supabase
      .from('semi_production_orders')
      .update({
        produced_quantity: newProducedQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', order_id);

    if (updateError) {
      logger.error('Semi production order update error:', updateError);
      // Log oluşturuldu ama sipariş güncellenemedi, hata döndürme
    }

    // Eğer hedef miktara ulaşıldıysa, siparişi tamamlandı olarak işaretle
    if (newProducedQuantity >= order.planned_quantity) {
      const { error: completeError } = await supabase
        .from('semi_production_orders')
        .update({
          status: 'tamamlandi',
          updated_at: new Date().toISOString()
        })
        .eq('id', order_id);

      if (completeError) {
        logger.error('Semi production order completion error:', completeError);
      }
    }

    return NextResponse.json({
      success: true,
      data: log,
      message: 'Yarı mamul üretim kaydı başarıyla eklendi',
      produced_quantity: newProducedQuantity,
      is_complete: newProducedQuantity >= order.planned_quantity
    });

  } catch (error) {
    logger.error('Semi Production Log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
