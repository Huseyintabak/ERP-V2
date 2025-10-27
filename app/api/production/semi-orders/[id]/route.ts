import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only managers and planlama can update semi production orders
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { product_id, planned_quantity, priority, assigned_operator_id, notes } = body;

    if (!product_id || !planned_quantity || planned_quantity <= 0) {
      return NextResponse.json({ error: 'Product ID and valid quantity required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Update semi production order
    const { data: order, error } = await supabase
      .from('semi_production_orders')
      .update({
        product_id,
        planned_quantity,
        priority: priority || 'orta',
        assigned_operator_id: assigned_operator_id || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select(`
        *,
        product:semi_finished_products(
          id,
          name,
          code,
          unit
        ),
        assigned_operator:users!semi_production_orders_assigned_operator_id_fkey(
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      logger.error('Error updating semi production order:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    logger.error('Error in semi production orders PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only managers and planlama can delete semi production orders
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Delete semi production order
    const { error } = await supabase
      .from('semi_production_orders')
      .delete()
      .eq('id', params.id);

    if (error) {
      logger.error('Error deleting semi production order:', error);
      return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    logger.error('Error in semi production orders DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
