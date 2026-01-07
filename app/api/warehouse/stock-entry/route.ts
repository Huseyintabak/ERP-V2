import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { logger } from '@/lib/utils/logger';

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

    // Only depo and yonetici can add stock
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { productId, zoneId, quantity, material_type } = await request.json();

    // Validation
    if (!productId || !zoneId || !quantity) {
      return NextResponse.json({
        error: 'All fields are required: productId, zoneId, quantity'
      }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({
        error: 'Quantity must be greater than 0'
      }, { status: 400 });
    }

    const adminSupabase = await createAdminClient();

    // Determine material type if not provided
    let materialType = material_type || 'finished';
    let tableName = 'finished_products';

    if (!material_type) {
      // Try to determine from product
      const { data: product } = await adminSupabase
        .from('finished_products')
        .select('id')
        .eq('id', productId)
        .single();

      if (!product) {
        // Check semi-finished
        const { data: semiProduct } = await adminSupabase
          .from('semi_finished_products')
          .select('id')
          .eq('id', productId)
          .single();

        if (semiProduct) {
          materialType = 'semi';
          tableName = 'semi_finished_products';
        } else {
          // Check raw materials
          const { data: rawProduct } = await adminSupabase
            .from('raw_materials')
            .select('id')
            .eq('id', productId)
            .single();

          if (rawProduct) {
            materialType = 'raw';
            tableName = 'raw_materials';
          } else {
            return NextResponse.json({
              error: 'Product not found'
            }, { status: 404 });
          }
        }
      }
    } else {
      // Map material type to table name
      const typeTableMap: Record<string, string> = {
        finished: 'finished_products',
        semi: 'semi_finished_products',
        raw: 'raw_materials',
      };
      tableName = typeTableMap[materialType] || 'finished_products';
    }

    logger.log('📦 Stock Entry Request:', {
      productId,
      zoneId,
      quantity,
      materialType,
      tableName,
      userId: payload.userId
    });

    // Check if zone exists
    const { data: zone, error: zoneError } = await adminSupabase
      .from('warehouse_zones')
      .select('id, name, zone_type')
      .eq('id', zoneId)
      .single();

    if (zoneError || !zone) {
      return NextResponse.json({
        error: 'Zone not found'
      }, { status: 404 });
    }

    // Update product total quantity
    const { data: currentProduct, error: productError } = await adminSupabase
      .from(tableName)
      .select('quantity')
      .eq('id', productId)
      .single();

    if (productError) {
      logger.error('Error fetching product:', productError);
      return NextResponse.json({ error: productError.message }, { status: 500 });
    }

    const newTotalQuantity = (currentProduct?.quantity || 0) + quantity;

    const { error: updateProductError } = await adminSupabase
      .from(tableName)
      .update({ quantity: newTotalQuantity })
      .eq('id', productId);

    if (updateProductError) {
      logger.error('Error updating product quantity:', updateProductError);
      return NextResponse.json({ error: updateProductError.message }, { status: 500 });
    }

    // Update or insert zone inventory
    const { data: existingInventory } = await adminSupabase
      .from('zone_inventories')
      .select('quantity')
      .eq('zone_id', zoneId)
      .eq('material_type', materialType)
      .eq('material_id', productId)
      .single();

    if (existingInventory) {
      // Update existing inventory
      const newZoneQuantity = existingInventory.quantity + quantity;
      const { error: updateError } = await adminSupabase
        .from('zone_inventories')
        .update({
          quantity: newZoneQuantity
        })
        .eq('zone_id', zoneId)
        .eq('material_type', materialType)
        .eq('material_id', productId);

      if (updateError) {
        logger.error('Error updating zone inventory:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Insert new inventory record
      const { error: insertError } = await adminSupabase
        .from('zone_inventories')
        .insert({
          zone_id: zoneId,
          material_type: materialType,
          material_id: productId,
          quantity: quantity,
        });

      if (insertError) {
        logger.error('Error inserting zone inventory:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    // Record stock movement
    const { error: movementError } = await adminSupabase
      .from('stock_movements')
      .insert({
        material_type: materialType,
        material_id: productId,
        movement_type: 'giris',
        quantity: quantity,
        zone_id: zoneId,
        user_id: payload.userId,
        description: `Stok girişi - ${zone.name}`,
      });

    if (movementError) {
      logger.error('Error recording stock movement:', movementError);
      // Don't fail the request, just log the error
    }

    logger.log('✅ Stock entry completed successfully');

    // Fetch updated inventory
    const { data: updatedInventory } = await adminSupabase
      .from('zone_inventories')
      .select(`
        *,
        zone:warehouse_zones(name)
      `)
      .eq('zone_id', zoneId)
      .eq('material_type', materialType)
      .eq('material_id', productId)
      .single();

    return NextResponse.json({
      success: true,
      message: 'Stock entry completed successfully',
      inventory: updatedInventory,
      newTotalQuantity
    });

  } catch (error) {
    logger.error('Stock entry API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    // Only depo and yonetici can view stock entry history
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Fetch stock entry history (movements with type 'giris')
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select(`
        *,
        zone:warehouse_zones(name),
        user:users(full_name)
      `)
      .eq('movement_type', 'giris')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching stock entry history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .eq('movement_type', 'giris');

    return NextResponse.json({
      data: movements || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    logger.error('Stock entry history API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
