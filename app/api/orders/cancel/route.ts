import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { orderId, reason } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get order details
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        production_plans!inner(
          id,
          status,
          produced_quantity,
          target_quantity
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderData;
    const plans = order.production_plans;

    // Check if user has permission to cancel
    const isAdmin = payload.role === 'yonetici' || payload.role === 'planlama';
    const isOrderOwner = order.created_by === payload.userId;

    // Check order status
    if (order.status === 'tamamlandi') {
      return NextResponse.json({ 
        error: 'Tamamlanan siparişler iptal edilemez' 
      }, { status: 400 });
    }

    if (order.status === 'iptal') {
      return NextResponse.json({ 
        error: 'Sipariş zaten iptal edilmiş' 
      }, { status: 400 });
    }

    // Check if any plan is completed
    const hasCompletedPlans = plans.some((plan: any) => plan.status === 'tamamlandi');
    if (hasCompletedPlans) {
      return NextResponse.json({ 
        error: 'Tamamlanan planları olan siparişler iptal edilemez' 
      }, { status: 400 });
    }

    // Check if any plan has production
    const hasProduction = plans.some((plan: any) => plan.produced_quantity > 0);
    if (hasProduction && !isAdmin) {
      return NextResponse.json({ 
        error: 'Üretim başlamış siparişler sadece yöneticiler tarafından iptal edilebilir' 
      }, { status: 403 });
    }

    // Start transaction
    const { data: cancelResult, error: cancelError } = await supabase.rpc('cancel_order_with_plans', {
      p_order_id: orderId,
      p_reason: reason || 'Order cancelled',
      p_user_id: payload.userId
    });

    if (cancelError) {
      logger.error('Cancel error:', cancelError);
      return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sipariş başarıyla iptal edildi',
      data: cancelResult 
    });

  } catch (error: any) {
    logger.error('Error in order cancel:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
