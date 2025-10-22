import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

interface TransferItem {
  productId: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only depo and yonetici can transfer between zones
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fromZoneId, toZoneId, transferItems } = await request.json();

    // Validation
    if (!fromZoneId || !toZoneId || !transferItems || !Array.isArray(transferItems) || transferItems.length === 0) {
      return NextResponse.json({ 
        error: 'All fields are required: fromZoneId, toZoneId, transferItems' 
      }, { status: 400 });
    }

    if (fromZoneId === toZoneId) {
      return NextResponse.json({ 
        error: 'Source and destination zones cannot be the same' 
      }, { status: 400 });
    }

    // Validate transfer items
    for (const item of transferItems) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ 
          error: 'Each transfer item must have productId and quantity > 0' 
        }, { status: 400 });
      }
    }

    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Get source zone info to determine if it's center zone
    const { data: sourceZone, error: zoneError } = await adminSupabase
      .from('warehouse_zones')
      .select('zone_type')
      .eq('id', fromZoneId)
      .single();
    
    if (zoneError) {
      console.error('Error fetching source zone:', zoneError);
      return NextResponse.json({ error: zoneError.message }, { status: 500 });
    }

    // Check inventory for all products
    const inventoryChecks = await Promise.all(
      transferItems.map(async (item: TransferItem) => {
        let availableQuantity = 0;
        
        if (sourceZone.zone_type === 'center') {
          // For center zone, check finished_products table
          const { data: productInventory, error: productError } = await adminSupabase
            .from('finished_products')
            .select('quantity, name, code')
            .eq('id', item.productId)
            .single();
          
          if (productError) {
            return { productId: item.productId, error: productError.message };
          }
          
          availableQuantity = productInventory?.quantity || 0;
          return {
            productId: item.productId,
            productName: productInventory?.name,
            productCode: productInventory?.code,
            availableQuantity,
            requestedQuantity: item.quantity,
            hasEnough: availableQuantity >= item.quantity
          };
        } else {
          // For other zones, check zone_inventories table
          const { data: sourceInventory, error: sourceError } = await adminSupabase
            .from('zone_inventories')
            .select(`
              quantity,
              product:finished_products(name, code)
            `)
            .eq('zone_id', fromZoneId)
            .eq('material_type', 'finished')
            .eq('material_id', item.productId)
            .single();

          if (sourceError && sourceError.code !== 'PGRST116') {
            return { productId: item.productId, error: sourceError.message };
          }

          availableQuantity = sourceInventory?.quantity || 0;
          return {
            productId: item.productId,
            productName: sourceInventory?.product?.name,
            productCode: sourceInventory?.product?.code,
            availableQuantity,
            requestedQuantity: item.quantity,
            hasEnough: availableQuantity >= item.quantity
          };
        }
      })
    );

    // Check if any product has insufficient inventory
    const insufficientItems = inventoryChecks.filter(check => !check.hasEnough);
    if (insufficientItems.length > 0) {
      return NextResponse.json({ 
        error: 'Insufficient inventory for some products',
        insufficientItems: insufficientItems.map(item => ({
          productName: item.productName,
          productCode: item.productCode,
          available: item.availableQuantity,
          requested: item.requestedQuantity
        }))
      }, { status: 400 });
    }

    // Perform transfers for each product
    const transferResults = [];
    const errors = [];

    for (const item of transferItems) {
      try {
        console.log('🔄 Transferring product:', {
          from_zone: fromZoneId,
          to_zone: toZoneId,
          product: item.productId,
          qty: item.quantity,
          user_id: payload.userId
        });

        const { data, error } = await adminSupabase.rpc('transfer_between_zones', {
          from_zone: fromZoneId,
          to_zone: toZoneId,
          product: item.productId,
          qty: item.quantity,
          user_id: payload.userId
        });

        if (error) {
          console.error('❌ Transfer error for product:', item.productId, error);
          errors.push({
            productId: item.productId,
            error: error.message
          });
        } else if (!data || !data.success) {
          console.error('❌ Transfer failed for product:', item.productId, data);
          errors.push({
            productId: item.productId,
            error: data?.error || 'Transfer failed'
          });
        } else {
          console.log('✅ Transfer successful for product:', item.productId);
          transferResults.push({
            productId: item.productId,
            quantity: item.quantity,
            success: true
          });
        }
      } catch (error) {
        console.error('❌ Exception during transfer for product:', item.productId, error);
        errors.push({
          productId: item.productId,
          error: 'Transfer exception occurred'
        });
      }
    }

    // If all transfers failed, return error
    if (transferResults.length === 0) {
      return NextResponse.json({ 
        error: 'All transfers failed',
        errors
      }, { status: 500 });
    }

    // If some transfers failed, return partial success
    if (errors.length > 0) {
      return NextResponse.json({ 
        success: true,
        message: `Partial success: ${transferResults.length} products transferred, ${errors.length} failed`,
        transferResults,
        errors
      });
    }

    // All transfers successful
    return NextResponse.json({ 
      success: true,
      message: `All ${transferResults.length} products transferred successfully`,
      transferResults
    });

  } catch (error) {
    console.error('Multi-product transfer API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
