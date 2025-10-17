import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!orderId) {
      return NextResponse.json({ error: 'order_id gerekli' }, { status: 400 });
    }

    // Yarı mamul üretim siparişinin operatöre atanmış olduğunu kontrol et
    const { data: order, error: orderError } = await supabase
      .from('semi_production_orders')
      .select('assigned_operator_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Yarı mamul üretim siparişi bulunamadı' }, { status: 404 });
    }

    if (order.assigned_operator_id !== operatorId) {
      return NextResponse.json({ error: 'Bu sipariş size atanmamış' }, { status: 403 });
    }

    // Yarı mamul üretim logs'ları getir (eğer tablo varsa)
    const { data: logs, error: logsError } = await supabase
      .from('semi_production_logs')
      .select('*')
      .eq('order_id', orderId)
      .eq('operator_id', operatorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (logsError) {
      console.error('Semi production logs fetch error:', logsError);
      // Logs tablosu yoksa boş array döndür
      return NextResponse.json({
        data: [],
        total: 0
      });
    }

    return NextResponse.json({
      data: logs || [],
      total: logs?.length || 0
    });

  } catch (error) {
    console.error('Semi Production Logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
