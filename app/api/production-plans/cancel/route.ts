import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    const { planId, reason } = await request.json();

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get plan details
    const { data: planData, error: planError } = await supabase
      .from('production_plans')
      .select(`
        *,
        orders!inner(
          id,
          status,
          created_by
        )
      `)
      .eq('id', planId)
      .single();

    if (planError || !planData) {
      return NextResponse.json({ error: 'Production plan not found' }, { status: 404 });
    }

    const plan = planData;
    const order = plan.orders;

    // Check if user has permission to cancel
    const isAdmin = payload.role === 'yonetici' || payload.role === 'planlama';
    const isOrderOwner = order.created_by === payload.userId;

    // Check plan status
    if (plan.status === 'tamamlandi') {
      return NextResponse.json({ 
        error: 'Tamamlanan planlar iptal edilemez' 
      }, { status: 400 });
    }

    if (plan.status === 'iptal') {
      return NextResponse.json({ 
        error: 'Plan zaten iptal edilmiş' 
      }, { status: 400 });
    }

    // Check if plan has production
    if (plan.produced_quantity > 0 && !isAdmin) {
      return NextResponse.json({ 
        error: 'Üretim başlamış planlar sadece yöneticiler tarafından iptal edilebilir' 
      }, { status: 403 });
    }

    // Check order status
    if (order.status === 'tamamlandi') {
      return NextResponse.json({ 
        error: 'Tamamlanan siparişlerin planları iptal edilemez' 
      }, { status: 400 });
    }

    // Start transaction
    const { data: cancelResult, error: cancelError } = await supabase.rpc('cancel_production_plan', {
      p_plan_id: planId,
      p_reason: reason || 'Production plan cancelled',
      p_user_id: payload.userId
    });

    if (cancelError) {
      console.error('Cancel error:', cancelError);
      return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Üretim planı başarıyla iptal edildi',
      data: cancelResult 
    });

  } catch (error: any) {
    console.error('Error in production plan cancel:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
