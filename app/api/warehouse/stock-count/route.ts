import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
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

    // Only depo and yonetici can perform stock count
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { countItems, zoneId } = await request.json();

    // Validation
    if (!countItems || !Array.isArray(countItems) || countItems.length === 0) {
      return NextResponse.json({
        error: 'countItems array is required'
      }, { status: 400 });
    }

    if (!zoneId) {
      return NextResponse.json({
        error: 'zoneId is required'
      }, { status: 400 });
    }

    const adminSupabase = await createAdminClient();

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

    logger.log('📊 Stock Count Request:', {
      zoneId,
      zoneName: zone.name,
      itemCount: countItems.length,
      userId: payload.userId
    });

    const results = [];
    let totalAdjustments = 0;

    for (const item of countItems) {
      const { productId, materialType, actualQuantity, systemQuantity } = item;

      if (!productId || !materialType || actualQuantity === undefined || systemQuantity === undefined) {
        logger.error('Invalid count item:', item);
        continue;
      }

      const difference = actualQuantity - systemQuantity;

      // Skip if no difference
      if (difference === 0) {
        results.push({
          productId,
          materialType,
          status: 'no_change',
          difference: 0
        });
        continue;
      }

      // Determine table name
      const typeTableMap: Record<string, string> = {
        finished: 'finished_products',
        semi: 'semi_finished_products',
        raw: 'raw_materials',
      };
      const tableName = typeTableMap[materialType] || 'finished_products';

      try {
        // Update product total quantity
        const { data: currentProduct, error: productError } = await adminSupabase
          .from(tableName)
          .select('quantity')
          .eq('id', productId)
          .single();

        if (productError) {
          logger.error('Error fetching product:', productError);
          results.push({
            productId,
            materialType,
            status: 'error',
            error: 'Product not found'
          });
          continue;
        }

        const newTotalQuantity = (currentProduct?.quantity || 0) + difference;

        const { error: updateProductError } = await adminSupabase
          .from(tableName)
          .update({ quantity: newTotalQuantity })
          .eq('id', productId);

        if (updateProductError) {
          logger.error('Error updating product quantity:', updateProductError);
          results.push({
            productId,
            materialType,
            status: 'error',
            error: 'Failed to update product'
          });
          continue;
        }

        // Update zone inventory
        const { data: existingInventory } = await adminSupabase
          .from('zone_inventories')
          .select('quantity')
          .eq('zone_id', zoneId)
          .eq('material_type', materialType)
          .eq('material_id', productId)
          .single();

        if (existingInventory) {
          // Update existing inventory to actual count
          const { error: updateError } = await adminSupabase
            .from('zone_inventories')
            .update({
              quantity: actualQuantity
            })
            .eq('zone_id', zoneId)
            .eq('material_type', materialType)
            .eq('material_id', productId);

          if (updateError) {
            logger.error('Error updating zone inventory:', updateError);
            results.push({
              productId,
              materialType,
              status: 'error',
              error: 'Failed to update zone inventory'
            });
            continue;
          }
        } else {
          // Insert new inventory record
          const { error: insertError } = await adminSupabase
            .from('zone_inventories')
            .insert({
              zone_id: zoneId,
              material_type: materialType,
              material_id: productId,
              quantity: actualQuantity,
            });

          if (insertError) {
            logger.error('Error inserting zone inventory:', insertError);
            results.push({
              productId,
              materialType,
              status: 'error',
              error: 'Failed to create zone inventory'
            });
            continue;
          }
        }

        // Record stock movement
        const movementType = difference > 0 ? 'sayim_artis' : 'sayim_eksilme';
        const { error: movementError } = await adminSupabase
          .from('stock_movements')
          .insert({
            material_type: materialType,
            material_id: productId,
            movement_type: movementType,
            quantity: Math.abs(difference),
            zone_id: zoneId,
            user_id: payload.userId,
            description: `Stok sayım düzeltmesi - ${zone.name} (Sistem: ${systemQuantity}, Sayım: ${actualQuantity}, Fark: ${difference > 0 ? '+' : ''}${difference})`,
          });

        if (movementError) {
          logger.error('Error recording stock movement:', movementError);
          // Don't fail the request, just log the error
        }

        totalAdjustments++;
        results.push({
          productId,
          materialType,
          status: 'success',
          difference,
          systemQuantity,
          actualQuantity,
          newTotalQuantity
        });

      } catch (error) {
        logger.error('Error processing count item:', error);
        results.push({
          productId,
          materialType,
          status: 'error',
          error: 'Processing failed'
        });
      }
    }

    logger.log('✅ Stock count completed:', {
      totalItems: countItems.length,
      totalAdjustments,
      zone: zone.name
    });

    return NextResponse.json({
      success: true,
      message: `Stok sayımı tamamlandı. ${totalAdjustments} üründe düzeltme yapıldı.`,
      results,
      summary: {
        totalItems: countItems.length,
        adjustedItems: totalAdjustments,
        unchangedItems: countItems.length - totalAdjustments
      }
    });

  } catch (error) {
    logger.error('Stock count API error:', error);
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

    // Only depo and yonetici can view stock count history
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const adminSupabase = await createAdminClient();

    // Fetch stock count history (movements with type 'sayim_artis' or 'sayim_eksilme')
    const { data: movements, error } = await adminSupabase
      .from('stock_movements')
      .select(`
        *,
        zone:warehouse_zones(name),
        user:users(full_name)
      `)
      .in('movement_type', ['sayim_artis', 'sayim_eksilme'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching stock count history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await adminSupabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .in('movement_type', ['sayim_artis', 'sayim_eksilme']);

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
    logger.error('Stock count history API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
