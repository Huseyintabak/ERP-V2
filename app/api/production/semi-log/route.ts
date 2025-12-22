import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
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
      .select('assigned_operator_id, status, planned_quantity, produced_quantity')
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
      id: order.id,
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

    if (order.status !== 'devam_ediyor') {
      return NextResponse.json({ 
        error: 'Bu sipariş aktif değil',
        details: `Sipariş durumu: ${order.status} (gerekli: devam_ediyor)`
      }, { status: 400 });
    }

    // Yeni üretim miktarını hesapla
    const newProducedQuantity = order.produced_quantity + (quantity_produced || 1);
    
    if (newProducedQuantity > order.planned_quantity) {
      return NextResponse.json({ 
        error: `Üretim miktarı planlanan miktarı aşamaz. Maksimum: ${order.planned_quantity}` 
      }, { status: 400 });
    }

    // Production log oluştur
    const { data: log, error: logError } = await supabase
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
