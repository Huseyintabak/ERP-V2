import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
// Rezervasyon tüketimi (üretim tamamlandığında)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (payload.role !== 'operator' && payload.role !== 'planlama' && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { order_id, order_type, consumed_materials } = body;

    if (!order_id || !order_type || !consumed_materials || !Array.isArray(consumed_materials)) {
      return NextResponse.json({
        error: 'Missing required fields: order_id, order_type, consumed_materials'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Her malzeme için rezervasyon tüketimi
    const results = await Promise.all(consumed_materials.map(async (material: any) => {
      const { material_id, material_type, consumed_quantity } = material;

      // Rezervasyonu bul
      const { data: reservation, error: reservationError } = await supabase
        .from('material_reservations')
        .select('*')
        .eq('order_id', order_id)
        .eq('material_id', material_id)
        .eq('material_type', material_type)
        .single();

      if (reservationError || !reservation) {
        throw new Error(`Rezervasyon bulunamadı: ${material_id}`);
      }

      // Tüketim miktarını güncelle
      const newConsumedQuantity = reservation.consumed_quantity + consumed_quantity;
      
      if (newConsumedQuantity > reservation.reserved_quantity) {
        throw new Error(`Tüketim miktarı rezerve miktarı aşıyor: ${material_id}`);
      }

      // Rezervasyonu güncelle
      const { error: updateError } = await supabase
        .from('material_reservations')
        .update({
          consumed_quantity: newConsumedQuantity,
          status: newConsumedQuantity >= reservation.reserved_quantity ? 'completed' : 'active'
        })
        .eq('id', reservation.id);

      if (updateError) {
        throw new Error(`Rezervasyon güncellenemedi: ${updateError.message}`);
      }

      // Rezervasyon log'u oluştur
      await supabase
        .from('reservation_logs')
        .insert({
          reservation_id: reservation.id,
          action: 'consumed',
          quantity_change: consumed_quantity,
          old_quantity: reservation.consumed_quantity,
          new_quantity: newConsumedQuantity,
          notes: `Malzeme tüketildi - ${consumed_quantity} adet`,
          created_by: payload.userId
        });

      // Stok tablosunda rezerve miktarı azalt, toplam stoku düş
      const stockTable = material_type === 'raw' ? 'raw_materials' : 
                        material_type === 'semi' ? 'semi_finished_products' : 
                        'finished_products';

      const { data: stockRow, error: stockError } = await supabase
        .from(stockTable)
        .select('reserved_quantity')
        .eq('id', material_id)
        .single();

      if (stockError || !stockRow) {
        throw new Error(`Stok bilgisi alınamadı: ${stockError?.message}`);
      }

      const updatedReserved = Math.max(Number(stockRow.reserved_quantity || 0) - consumed_quantity, 0);

      await supabase
        .from(stockTable)
        .update({
          reserved_quantity: updatedReserved
        })
        .eq('id', material_id);

      return {
        material_id,
        consumed_quantity,
        new_total_consumed: newConsumedQuantity
      };
    }));

    return NextResponse.json({ 
      message: 'Malzeme tüketimi başarıyla kaydedildi',
      data: results 
    }, { status: 200 });

  } catch (error: any) {
    logger.error('Reservation consumption error:', error);
    return NextResponse.json({ 
      error: error.message || 'Malzeme tüketimi kaydedilemedi' 
    }, { status: 500 });
  }
}
