import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: zoneId } = await params;
    const adminSupabase = await createAdminClient();

    // Fetch zone inventory (polymorphic - cannot join directly, use admin client for RLS bypass)
    const { data: inventoryRecords, error: invError } = await adminSupabase
      .from('zone_inventories')
      .select('*')
      .eq('zone_id', zoneId)
      .eq('material_type', 'finished')
      .order('quantity', { ascending: false });

    if (invError) {
      console.error('Error fetching zone inventory:', invError);
      return NextResponse.json({ error: invError.message }, { status: 500 });
    }

    if (!inventoryRecords || inventoryRecords.length === 0) {
      return NextResponse.json({ data: [], zone: null }, { status: 200 });
    }

    // Fetch product details separately
    const productIds = inventoryRecords.map(inv => inv.material_id);
    const { data: products, error: prodError } = await adminSupabase
      .from('finished_products')
      .select('id, name, code, sale_price, unit')
      .in('id', productIds);

    if (prodError) {
      console.error('Error fetching products:', prodError);
      return NextResponse.json({ error: prodError.message }, { status: 500 });
    }

    // Combine inventory with product details (map sale_price to unit_price for consistency)
    const inventory = inventoryRecords.map(inv => {
      const product = products?.find(p => p.id === inv.material_id);
      return {
        ...inv,
        product: product ? {
          ...product,
          unit_price: product.sale_price // Map sale_price to unit_price
        } : null
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
      console.error('Error fetching zone info:', zoneError);
      return NextResponse.json({ error: zoneError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data: inventory || [],
      zone: zone
    });

  } catch (error) {
    console.error('Zone inventory API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: zoneId } = await params;
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
      console.error('Error updating zone inventory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error) {
    console.error('Update zone inventory API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
