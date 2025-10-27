import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    // Only managers and planlama can assign operators
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { operator_id } = await request.json();

    if (!operator_id) {
      return NextResponse.json({ error: 'Operator ID is required' }, { status: 400 });
    }

    // Verify operator exists and is active
    const { data: operator, error: operatorError } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .eq('id', operator_id)
      .eq('role', 'operator')
      .eq('is_active', true)
      .single();

    if (operatorError || !operator) {
      return NextResponse.json({ error: 'Invalid or inactive operator' }, { status: 400 });
    }

    // Update production plan with assigned operator
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .update({
        assigned_operator: operator_id,
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        orders!production_plans_order_id_fkey (
          id,
          order_number,
          customer_name,
          status
        ),
        users!production_plans_assigned_operator_fkey (
          id,
          name,
          email
        )
      `)
      .single();

    if (planError) {
      return NextResponse.json({ error: 'Failed to assign operator' }, { status: 400 });
    }

    // Create notification for the operator
    await supabase
      .from('notifications')
      .insert({
        user_id: operator_id,
        title: 'Yeni Üretim Planı Atandı',
        message: `Size yeni bir üretim planı atandı: ${plan.orders?.order_number || 'Bilinmeyen Sipariş'}`,
        type: 'assignment',
        is_read: false
      });

    return NextResponse.json(plan);
  } catch (error) {
    logger.error('Error assigning operator:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}