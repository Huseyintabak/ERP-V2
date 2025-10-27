import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
// Üretim tamamlandığında otomatik stok güncelleme
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
    const { 
      order_id, 
      order_type, 
      product_id, 
      product_type, 
      produced_quantity,
      consumed_materials 
    } = body;

    if (!order_id || !product_id || !produced_quantity) {
      return NextResponse.json({
        error: 'Missing required fields: order_id, product_id, produced_quantity'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Üretilen ürünün stokunu artır
    const productTable = product_type === 'semi' ? 'semi_finished_products' : 'finished_products';
    
    const { error: stockUpdateError } = await supabase
      .from(productTable)
      .update({
        quantity: supabase.raw(`quantity + ${produced_quantity}`)
      })
      .eq('id', product_id);

    if (stockUpdateError) {
      throw new Error(`Ürün stoku güncellenemedi: ${stockUpdateError.message}`);
    }

    // 2. Üretim stok hareketi kaydet
    await supabase
      .from('stock_movements')
      .insert({
        material_id: product_id,
        material_type: product_type,
        movement_type: 'production_output',
        quantity: produced_quantity,
        reference_id: order_id,
        reference_type: order_type,
        notes: `Üretim çıktısı - ${produced_quantity} adet`,
        created_by: payload.userId
      });

    // 3. Eğer consumed_materials verilmişse, malzeme tüketimini işle
    if (consumed_materials && Array.isArray(consumed_materials)) {
      const consumeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/reservations/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `thunder_token=${token}`
        },
        body: JSON.stringify({
          order_id,
          order_type,
          consumed_materials
        })
      });

      if (!consumeResponse.ok) {
        const errorData = await consumeResponse.json();
        throw new Error(`Malzeme tüketimi kaydedilemedi: ${errorData.error}`);
      }
    }

    // 4. Üretim planını güncelle (eğer varsa)
    if (order_type === 'production_plan') {
      await supabase
        .from('production_plans')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          actual_quantity: produced_quantity
        })
        .eq('id', order_id);
    }

    // 5. Üretim log'u kaydet
    await supabase
      .from('production_logs')
      .insert({
        order_id,
        order_type,
        product_id,
        product_type,
        planned_quantity: 0, // Bu bilgi order'dan gelecek
        produced_quantity,
        status: 'completed',
        completed_at: new Date().toISOString(),
        created_by: payload.userId
      });

    return NextResponse.json({ 
      message: 'Üretim başarıyla tamamlandı ve stoklar güncellendi',
      data: {
        order_id,
        product_id,
        produced_quantity,
        stock_updated: true
      }
    }, { status: 200 });

  } catch (error: any) {
    logger.error('Production completion error:', error);
    return NextResponse.json({ 
      error: error.message || 'Üretim tamamlanamadı' 
    }, { status: 500 });
  }
}