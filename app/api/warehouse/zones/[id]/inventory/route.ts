import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only depo and yonetici can access zone inventory
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: zoneId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const materialType = searchParams.get('material_type');
    const materialId = searchParams.get('material_id');

    logger.info('Zone inventory request:', { zoneId, startDate, endDate, materialType, materialId });

    const adminSupabase = await createAdminClient();

    // If material_type and material_id are provided, fetch specific inventory item
    if (materialType && materialId) {
      const { data: inventoryRecord, error: invError } = await adminSupabase
        .from('zone_inventories')
        .select('*')
        .eq('zone_id', zoneId)
        .eq('material_type', materialType)
        .eq('material_id', materialId)
        .maybeSingle();

      if (invError) {
        logger.error('Error fetching zone inventory:', invError);
        return NextResponse.json({ error: invError.message }, { status: 500 });
      }

      return NextResponse.json({
        data: inventoryRecord,
        quantity: inventoryRecord?.quantity || 0
      });
    }

    // Fetch zone inventory (polymorphic - cannot join directly, use admin client for RLS bypass)
    const { data: inventoryRecords, error: invError } = await adminSupabase
      .from('zone_inventories')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('material_type', 'finished')
      .order('quantity', { ascending: false });

    if (invError) {
      logger.error('Error fetching zone inventory:', invError);
      return NextResponse.json({ error: invError.message }, { status: 500 });
    }

    if (!inventoryRecords || inventoryRecords.length === 0) {
      return NextResponse.json({ data: [], zone: null, transfers: [] }, { status: 200 });
    }

    // Fetch product details separately
    const productIds = inventoryRecords.map(inv => inv.material_id);
    const productQuery = adminSupabase
      .from('finished_products')
      .select('id, name, code, sale_price, unit')
      .in('id', productIds);

    const { data: products, error: prodError } = await productQuery;

    if (prodError) {
      logger.error('Error fetching products:', prodError);
      return NextResponse.json({ error: prodError.message }, { status: 500 });
    }

    // Fetch transfer history for this zone (products transferred TO this zone)
    let transferQuery = adminSupabase
      .from('zone_transfers')
      .select(`
        id,
        from_zone_id,
        to_zone_id,
        product_id,
        quantity,
        transfer_date,
        from_zone:warehouse_zones!zone_transfers_from_zone_id_fkey(name),
        to_zone:warehouse_zones!zone_transfers_to_zone_id_fkey(name)
      `)
      .eq('to_zone_id', zoneId)
      .in('product_id', productIds);

    // Apply date filters if provided
    if (startDate) {
      transferQuery = transferQuery.gte('transfer_date', startDate);
    }
    if (endDate) {
      // Add 1 day to endDate to include the entire day
      const endDatePlusOne = new Date(endDate);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      transferQuery = transferQuery.lt('transfer_date', endDatePlusOne.toISOString());
    }

    const { data: transfers, error: transferError } = await transferQuery
      .order('transfer_date', { ascending: false });

    if (transferError) {
      logger.error('Error fetching transfers:', transferError);
      // Don't fail the entire request if transfers fail
    }

    // If date filters are applied, filter inventory to only show products that were transferred in that date range
    let filteredInventoryRecords = inventoryRecords;
    if (startDate || endDate) {
      // Get product IDs that were transferred in the date range
      const transferredProductIds = transfers?.map(t => t.product_id) || [];
      logger.info('Filtering by date range:', {
        totalInventory: inventoryRecords.length,
        transferredProductIds: transferredProductIds.length,
        startDate,
        endDate
      });

      // Filter inventory to only show products that were transferred in the date range
      filteredInventoryRecords = inventoryRecords.filter(inv =>
        transferredProductIds.includes(inv.material_id)
      );

      logger.info('Filtered inventory count:', {
        before: inventoryRecords.length,
        after: filteredInventoryRecords.length
      });
    }

    // Combine inventory with product details and latest transfer date
    const inventory = filteredInventoryRecords.map(inv => {
      const product = products?.find(p => p.id === inv.material_id);

      // Find latest transfer for this product to this zone
      const productTransfers = transfers?.filter(t =>
        t.product_id === inv.material_id &&
        t.to_zone_id === zoneId
      ) || [];

      const latestTransfer = productTransfers.length > 0
        ? productTransfers[0] // Already sorted by date descending
        : null;

      return {
        ...inv,
        product: product ? {
          ...product,
          unit_price: product.sale_price // Map sale_price to unit_price
        } : null,
        latest_transfer_date: latestTransfer?.transfer_date || null,
        latest_transfer_from: latestTransfer?.from_zone?.name || null
      };
    });

    // Also get zone info
    const { data: zone, error: zoneError } = await adminSupabase
      .from('warehouse_zones')
      .select(`
        *,
        customer:customers(
          id,
          name,
          email
        )
      `)
      .eq('id', zoneId)
      .single();

    if (zoneError) {
      logger.error('Error fetching zone info:', zoneError);
      return NextResponse.json({ error: zoneError.message }, { status: 500 });
    }

    logger.info('Returning inventory data:', {
      inventoryCount: inventory?.length || 0,
      filteredCount: filteredInventoryRecords.length,
      hasDateFilter: !!(startDate || endDate),
      startDate,
      endDate
    });

    return NextResponse.json({
      data: inventory || [],
      zone: zone,
      transfers: transfers || []
    });

  } catch (error) {
    logger.error('Zone inventory API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only depo and yonetici can manage zone inventory
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: zoneId } = params;
    const { product_id, quantity } = await request.json();

    if (!product_id || quantity === undefined) {
      return NextResponse.json({
        error: 'Product ID and quantity are required'
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Update or insert zone inventory
    const { data, error } = await supabase
      .from('zone_inventories')
      .upsert({
        zone_id: zoneId,
        material_type: 'finished',
        material_id: product_id,
        quantity
      }, {
        onConflict: 'zone_id,material_type,material_id'
      })
      .select()
      .single();

    if (error) {
      logger.error('Error updating zone inventory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    logger.error('Update zone inventory API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
