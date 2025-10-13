import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

// Support both POST and PATCH for flexibility
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApprove(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApprove(request, params);
}

async function handleApprove(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    // Allow both managers and planning personnel to approve orders
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // No need for status in request body - approval always sets status to 'uretimde'
    const body = await request.json().catch(() => ({}));
    const notes = body.notes;
    
    // Approval always sets status to 'uretimde' (in production)
    const status = 'uretimde';

    // Update order status
    console.log('🔍 Updating order:', id, 'to status:', status);
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (orderError) {
      console.error('❌ Order update error:', orderError);
      console.error('Error details:', JSON.stringify(orderError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to update order status', 
        details: orderError.message,
        code: orderError.code
      }, { status: 400 });
    }

    console.log('✅ Order updated successfully:', order.order_number);

    // If status is 'uretimde' (approved), create production plans and BOM snapshot
    if (status === 'uretimde') {
      // Fetch order_items from separate table (order_items is a separate table, not JSONB)
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', id);

      if (itemsError) {
        console.error('❌ Error fetching order items:', itemsError);
        return NextResponse.json({ 
          error: 'Failed to fetch order items', 
          details: itemsError.message 
        }, { status: 400 });
      }

      console.log('📦 Order items:', JSON.stringify(orderItems, null, 2));

      if (orderItems && orderItems.length > 0) {
        // Create production plans for each product
        for (const item of orderItems) {
          console.log('🏭 Creating production plan for product:', item.product_id, 'quantity:', item.quantity);
          
          // Create production plan
          const { data: plan, error: planError } = await supabase
            .from('production_plans')
            .insert({
              order_id: id,
              product_id: item.product_id,
              planned_quantity: item.quantity,
              produced_quantity: 0,
              status: 'planlandi',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (planError) {
            console.error('❌ Error creating production plan:', planError);
            console.error('Plan error details:', JSON.stringify(planError, null, 2));
            continue;
          }

          console.log('✅ Production plan created:', plan.id);
          // BOM snapshot will be created automatically by database trigger (create_bom_snapshot)
          // This is the MIGRATION TEST - snapshot should be created from production_plans INSERT trigger
        }
      } else {
        console.warn('⚠️ No order items found in order!');
      }
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}