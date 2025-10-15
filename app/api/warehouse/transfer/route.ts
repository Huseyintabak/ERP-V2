import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    const { fromZoneId, toZoneId, productId, quantity } = await request.json();

    // Validation
    if (!fromZoneId || !toZoneId || !productId || !quantity) {
      return NextResponse.json({ 
        error: 'All fields are required: fromZoneId, toZoneId, productId, quantity' 
      }, { status: 400 });
    }

    if (fromZoneId === toZoneId) {
      return NextResponse.json({ 
        error: 'Source and destination zones cannot be the same' 
      }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ 
        error: 'Quantity must be greater than 0' 
      }, { status: 400 });
    }

    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    // Check if source zone has enough inventory
    let availableQuantity = 0;
    
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
    
    if (sourceZone.zone_type === 'center') {
      // For center zone, check finished_products table
      const { data: productInventory, error: productError } = await adminSupabase
        .from('finished_products')
        .select('quantity')
        .eq('id', productId)
        .single();
      
      if (productError) {
        console.error('Error checking product inventory:', productError);
        return NextResponse.json({ error: productError.message }, { status: 500 });
      }
      
      availableQuantity = productInventory?.quantity || 0;
    } else {
      // For other zones, check zone_inventories table
      const { data: sourceInventory, error: sourceError } = await adminSupabase
        .from('zone_inventories')
        .select('quantity')
        .eq('zone_id', fromZoneId)
        .eq('material_type', 'finished')
        .eq('material_id', productId)
        .single();

      if (sourceError && sourceError.code !== 'PGRST116') {
        console.error('Error checking source inventory:', sourceError);
        return NextResponse.json({ error: sourceError.message }, { status: 500 });
      }

      availableQuantity = sourceInventory?.quantity || 0;
    }

    if (availableQuantity < quantity) {
      return NextResponse.json({ 
        error: `Insufficient inventory. Available: ${availableQuantity}, Requested: ${quantity}` 
      }, { status: 400 });
    }

    // Call the transfer function (use admin client for RLS bypass)
    console.log('🔄 Calling transfer_between_zones with:', {
      from_zone: fromZoneId,
      to_zone: toZoneId,
      product: productId,
      qty: quantity,
      user_id: payload.userId
    });

    const { data, error } = await adminSupabase.rpc('transfer_between_zones', {
      from_zone: fromZoneId,
      to_zone: toZoneId,
      product: productId,
      qty: quantity,
      user_id: payload.userId
    });

    console.log('📊 Transfer function result:', { data, error });

    if (error) {
      console.error('❌ Transfer function error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if the function returned success
    if (!data || !data.success) {
      console.error('❌ Transfer failed:', data);
      return NextResponse.json({ 
        error: data?.error || 'Transfer failed' 
      }, { status: 400 });
    }

    console.log('✅ Transfer completed successfully');

    // Fetch updated inventory for both zones (use admin client for RLS bypass)
    const [sourceResult, destResult] = await Promise.all([
      adminSupabase
        .from('zone_inventories')
        .select(`
          *,
          product:finished_products(name, code)
        `)
        .eq('zone_id', fromZoneId)
        .eq('material_type', 'finished')
        .eq('material_id', productId),
      adminSupabase
        .from('zone_inventories')
        .select(`
          *,
          product:finished_products(name, code)
        `)
        .eq('zone_id', toZoneId)
        .eq('material_type', 'finished')
        .eq('material_id', productId)
    ]);

    console.log('📦 Updated inventories:', {
      source: sourceResult.data,
      destination: destResult.data
    });

    return NextResponse.json({ 
      success: true,
      message: 'Transfer completed successfully',
      sourceInventory: sourceResult.data?.[0] || null,
      destinationInventory: destResult.data?.[0] || null
    });

  } catch (error) {
    console.error('Zone transfer API error:', error);
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

    // Only depo and yonetici can view transfer history
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Fetch transfer history
    const { data: transfers, error } = await supabase
      .from('zone_transfers')
      .select(`
        *,
        from_zone:warehouse_zones!zone_transfers_from_zone_id_fkey(name),
        to_zone:warehouse_zones!zone_transfers_to_zone_id_fkey(name),
        product:finished_products(name, code)
      `)
      .order('transfer_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching transfer history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('zone_transfers')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      data: transfers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Transfer history API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
