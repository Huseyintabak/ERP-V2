import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

// GET - List BOM for a product
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: bomItems, error } = await supabase
      .from('bom')
      .select(`
        id,
        material_type,
        material_id,
        quantity_needed,
        raw_materials!bom_material_id_fkey(
          id,
          code,
          name,
          quantity,
          reserved_quantity
        ),
        semi_finished_products!bom_material_id_fkey(
          id,
          code,
          name,
          quantity,
          reserved_quantity
        )
      `)
      .eq('finished_product_id', productId);

    if (error) {
      console.error('BOM fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch BOM' }, { status: 500 });
    }

    return NextResponse.json({ data: bomItems });
  } catch (error: any) {
    console.error('BOM API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create BOM item
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only managers can create BOM
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { finished_product_id, material_type, material_id, quantity_needed } = body;

    if (!finished_product_id || !material_type || !material_id || !quantity_needed) {
      return NextResponse.json({ 
        error: 'Missing required fields: finished_product_id, material_type, material_id, quantity_needed' 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: bomItem, error } = await supabase
      .from('bom')
      .insert({
        finished_product_id,
        material_type,
        material_id,
        quantity_needed
      })
      .select()
      .single();

    if (error) {
      console.error('BOM creation error:', error);
      return NextResponse.json({ error: 'Failed to create BOM item' }, { status: 500 });
    }

    return NextResponse.json({ data: bomItem }, { status: 201 });
  } catch (error: any) {
    console.error('BOM creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}