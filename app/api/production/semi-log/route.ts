import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    if (!order_id || !barcode_scanned) {
      return NextResponse.json({ error: 'order_id ve barcode_scanned gerekli' }, { status: 400 });
    }

    // Yarı mamul üretim siparişinin operatöre atanmış olduğunu kontrol et
    const { data: order, error: orderError } = await supabase
      .from('semi_production_orders')
      .select('assigned_operator_id, status, planned_quantity, produced_quantity')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Yarı mamul üretim siparişi bulunamadı' }, { status: 404 });
    }

    if (order.assigned_operator_id !== operatorId) {
      return NextResponse.json({ error: 'Bu sipariş size atanmamış' }, { status: 403 });
    }

    if (order.status !== 'devam_ediyor') {
      return NextResponse.json({ error: 'Bu sipariş aktif değil' }, { status: 400 });
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
      console.error('Semi production log creation error:', logError);
      return NextResponse.json({ error: 'Log oluşturulamadı' }, { status: 500 });
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
      console.error('Semi production order update error:', updateError);
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
        console.error('Semi production order completion error:', completeError);
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
    console.error('Semi Production Log API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
