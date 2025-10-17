import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch orders with product and operator relationships
    const { data: orders, error } = await supabase
      .from('semi_production_orders')
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching semi production orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: orders });
  } catch (error) {
    console.error('Error in semi production orders GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Only managers and planlama can create semi production orders
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { product_id, planned_quantity, priority, assigned_operator_id, notes } = body;

    if (!product_id || !planned_quantity || planned_quantity <= 0) {
      return NextResponse.json({ error: 'Product ID and valid quantity required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Try to create order directly

    // Generate order number
    const { data: lastOrder } = await supabase
      .from('semi_production_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const orderNumber = lastOrder?.order_number 
      ? `SMP-${String(parseInt(lastOrder.order_number.split('-')[1]) + 1).padStart(4, '0')}`
      : 'SMP-0001';

    // Create semi production order
    const { data: order, error } = await supabase
      .from('semi_production_orders')
      .insert({
        order_number: orderNumber,
        product_id,
        planned_quantity,
        produced_quantity: 0,
        status: 'planlandi',
        priority: priority || 'orta',
        assigned_operator_id: assigned_operator_id || null,
        notes: notes || null,
        created_by: payload.userId
      })
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
      console.error('Error creating semi production order:', error);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error('Error in semi production orders POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
