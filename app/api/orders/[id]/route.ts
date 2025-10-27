import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
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
    logger.error('Error fetching order:', error);
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

    // Only managers and planlama can update orders
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
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
    logger.error('Error updating order:', error);
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

    // Only managers and planlama can delete orders
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First, release reserved materials before deleting the order
    logger.log('🔄 Releasing reserved materials for order:', id);
    
    // Get order items to release reservations
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        logger.log(`🔍 Releasing reservations for: ${item.product_name} (${item.quantity} units)`);

        // Get BOM for this product
        const { data: bomItems, error: bomError } = await supabase
          .from('bom')
          .select(`
            material_type,
            material_id,
            quantity_needed
          `)
          .eq('finished_product_id', item.product_id);

        if (bomError) {
          logger.error('❌ Error fetching BOM:', bomError);
          continue;
        }

        if (bomItems && bomItems.length > 0) {
          for (const bomItem of bomItems) {
            const needed = bomItem.quantity_needed * item.quantity;
            
            // Get material details
            const tableName = bomItem.material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
            const { data: material, error: materialError } = await supabase
              .from(tableName)
              .select('id, code, name, quantity, reserved_quantity')
              .eq('id', bomItem.material_id)
              .single();
            
            if (materialError) {
              logger.error('❌ Error fetching material:', materialError);
              continue;
            }
            
            if (material) {
              // Release reserved quantity
              const newReservedQuantity = Math.max(0, material.reserved_quantity - needed);
              const { error: updateError } = await supabase
                .from(tableName)
                .update({ 
                  reserved_quantity: newReservedQuantity,
                  updated_at: new Date().toISOString()
                })
                .eq('id', bomItem.material_id);

              if (updateError) {
                logger.error('❌ Error releasing reserved quantity:', updateError);
                continue;
              }

              logger.log('✅ Released', needed, 'units of', material.code, '(was reserved:', material.reserved_quantity, 'now:', newReservedQuantity, ')');
            }
          }
        }
      }
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

      // Delete BOM snapshots first
      const { error: snapshotsError } = await supabase
        .from('production_plan_bom_snapshot')
        .delete()
        .in('plan_id', productionPlans.map(plan => plan.id));

      if (snapshotsError) {
        logger.error('Error deleting BOM snapshots:', snapshotsError);
        return NextResponse.json({ 
          error: 'Failed to delete BOM snapshots', 
          details: snapshotsError.message 
        }, { status: 400 });
      }

      // Delete production plans
      const { error: plansError } = await supabase
        .from('production_plans')
        .delete()
        .eq('order_id', id);

      if (plansError) {
        logger.error('Error deleting production plans:', plansError);
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
      logger.error('Error deleting order items:', itemsError);
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
      logger.error('Delete error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete order', 
        details: error.message 
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Order deleted successfully' });
  } catch (error) {
    logger.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}