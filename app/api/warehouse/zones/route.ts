import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

const warehouseZoneSchema = z.object({
  name: z.string().min(1, 'Zone adı boş olamaz.'),
  customer_id: z.string().uuid().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);

    const supabase = await createClient();
    const { data: zones, error } = await supabase
      .from('warehouse_zones')
      .select('*, customers(id, name)');

    if (error) {
      console.error('Error fetching warehouse zones:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Admin client ile inventory count (RLS bypass için)
    const adminSupabase = await createAdminClient();
    
    // Her zone için ürün sayısını hesapla
    const zonesWithCounts = await Promise.all(
      (zones || []).map(async (zone) => {
        let productCount = 0;
        
        if (zone.zone_type === 'center') {
          // Merkez zone için tüm nihai ürünleri say
          const { count } = await adminSupabase
            .from('finished_products')
            .select('*', { count: 'exact', head: true })
            .gt('quantity', 0);
          
          productCount = count || 0;
        } else {
          // Diğer zone'lar için zone_inventories tablosundan say
          const { count } = await adminSupabase
            .from('zone_inventories')
            .select('*', { count: 'exact', head: true })
            .eq('zone_id', zone.id);
          
          productCount = count || 0;
        }
        
        return {
          ...zone,
          inventory_count: productCount,
          total_products: productCount
        };
      })
    );

    return NextResponse.json({ data: zonesWithCounts }, { status: 200 });
  } catch (error) {
    console.error('Error in warehouse zones GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);

    // Check if user has 'yonetici' or 'depo' role
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', payload.userId)
      .single();

    if (userError || !userData || !['yonetici', 'depo'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Set user context for RLS
    await supabase.rpc('set_user_context', { user_id: payload.userId });

    const body = await request.json();
    const validatedData = warehouseZoneSchema.parse(body);

    // Use admin client to bypass RLS since we already checked permissions
    const adminSupabase = await createAdminClient();
    const { data, error } = await adminSupabase
      .from('warehouse_zones')
      .insert(validatedData)
      .select()
      .single();

    if (error) {
      console.error('Error creating warehouse zone:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Validation or processing error:', error);
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
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

    // Check if user exists and has correct role
    const supabase = await createClient();
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', payload.userId)
      .single();

    if (userError || !userData || !['yonetici', 'depo'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get('id');

    if (!zoneId) {
      return NextResponse.json({ error: 'Zone ID is required' }, { status: 400 });
    }

    // Use admin client to bypass RLS since we already checked permissions
    const adminSupabase = await createAdminClient();
    const { error } = await adminSupabase
      .from('warehouse_zones')
      .delete()
      .eq('id', zoneId);

    if (error) {
      console.error('Error deleting warehouse zone:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Zone deleted successfully' });

  } catch (error) {
    console.error('Delete warehouse zone API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}