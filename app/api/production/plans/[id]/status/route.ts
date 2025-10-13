import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    const { status, notes } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    // Valid statuses
    const validStatuses = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Check if user can update this plan
    const { data: existingPlan } = await supabase
      .from('production_plans')
      .select('assigned_operator')
      .eq('id', id)
      .single();

    // Only assigned operator or manager can update status
    if (payload.userId !== existingPlan?.assigned_operator && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update production plan status
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .update({
        status,
        notes: notes || null,
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
      return NextResponse.json({ error: 'Failed to update status' }, { status: 400 });
    }

    // Create notification for manager if operator updated status
    if (payload.role === 'operator' && existingPlan?.assigned_operator) {
      const { data: managers } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'yonetici')
        .eq('is_active', true);

      if (managers && managers.length > 0) {
        const notifications = managers.map(manager => ({
          user_id: manager.id,
          title: 'Üretim Planı Durumu Güncellendi',
          message: `Üretim planı durumu "${status}" olarak güncellendi: ${plan.orders?.order_number || 'Bilinmeyen Sipariş'}`,
          type: 'status_update',
          is_read: false
        }));

        await supabase
          .from('notifications')
          .insert(notifications);
      }
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating production plan status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}