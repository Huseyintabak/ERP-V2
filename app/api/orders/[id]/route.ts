import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(
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

    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          finished_products (
            id,
            name,
            code
          ),
          semi_finished_products (
            id,
            name,
            code
          ),
          raw_materials (
            id,
            name,
            code
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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

    // Only managers can update orders
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = await request.json();

    const { data: order, error } = await supabase
      .from('orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update order' }, { status: 400 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Only managers can delete orders
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if order has production plans and delete them
    const { data: productionPlans } = await supabase
      .from('production_plans')
      .select('id, status')
      .eq('order_id', id);

    if (productionPlans && productionPlans.length > 0) {
      // Check if any production plan is in progress
      const inProgressPlans = productionPlans.filter(plan => 
        ['assigned', 'in_progress'].includes(plan.status)
      );

      if (inProgressPlans.length > 0) {
        return NextResponse.json({ 
          error: 'Bu siparişin devam eden üretim planları var. Önce üretim planlarını durdurun.' 
        }, { status: 400 });
      }

      // Delete production plans
      const { error: plansError } = await supabase
        .from('production_plans')
        .delete()
        .eq('order_id', id);

      if (plansError) {
        console.error('Error deleting production plans:', plansError);
        return NextResponse.json({ 
          error: 'Failed to delete production plans', 
          details: plansError.message 
        }, { status: 400 });
      }
    }

    // Delete order items first
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', id);

    if (itemsError) {
      console.error('Error deleting order items:', itemsError);
      return NextResponse.json({ 
        error: 'Failed to delete order items', 
        details: itemsError.message 
      }, { status: 400 });
    }

    // Delete the order
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete order', 
        details: error.message 
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}