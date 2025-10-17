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
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, produced_quantity } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['planlandi', 'devam_ediyor', 'duraklatildi', 'tamamlandi', 'iptal'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current order
    const { data: currentOrder, error: fetchError } = await supabase
      .from('semi_production_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check permissions
    const canUpdate = payload.role === 'yonetici' || 
                     payload.role === 'planlama' ||
                     (payload.role === 'operator' && currentOrder.assigned_operator_id === payload.userId);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // If status is being changed to completed, set produced quantity
    if (status === 'tamamlandi') {
      updateData.produced_quantity = produced_quantity || currentOrder.planned_quantity;
    }

    // If status is being changed to in progress, set start time
    if (status === 'devam_ediyor' && currentOrder.status === 'planlandi') {
      updateData.started_at = new Date().toISOString();
    }

    // If status is being changed to completed, set completion time
    if (status === 'tamamlandi' && currentOrder.status === 'devam_ediyor') {
      updateData.completed_at = new Date().toISOString();
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('semi_production_orders')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      console.error('Error updating semi production order:', updateError);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // If order is completed, update stock
    if (status === 'tamamlandi') {
      const finalQuantity = updateData.produced_quantity;
      
      // First get current stock
      const { data: currentProduct, error: productError } = await supabase
        .from('semi_finished_products')
        .select('quantity')
        .eq('id', currentOrder.product_id)
        .single();

      if (!productError && currentProduct) {
        // Update semi finished products stock
        const { error: stockError } = await supabase
          .from('semi_finished_products')
          .update({
            quantity: currentProduct.quantity + finalQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentOrder.product_id);

        if (stockError) {
          console.error('Error updating stock:', stockError);
          // Don't fail the request, just log the error
        }
      }
    }

    return NextResponse.json({ data: updatedOrder });
  } catch (error) {
    console.error('Error in semi production order status update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
