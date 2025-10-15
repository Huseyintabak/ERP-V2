import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    // Only depo and yonetici can access zone inventory
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = await createAdminClient();

    // Merkez zone'u bul
    const { data: centerZone, error: zoneError } = await adminSupabase
      .from('warehouse_zones')
      .select('id, name, zone_type')
      .eq('zone_type', 'center')
      .single();

    if (zoneError || !centerZone) {
      console.error('Error fetching center zone:', zoneError);
      return NextResponse.json({ error: 'Merkez zone bulunamadı' }, { status: 404 });
    }

    // Tüm nihai ürünleri getir (merkez depoda)
    const { data: finishedProducts, error: productsError } = await adminSupabase
      .from('finished_products')
      .select('id, name, code, sale_price, unit, quantity')
      .gt('quantity', 0) // Sadece stokta olan ürünler
      .order('name');

    if (productsError) {
      console.error('Error fetching finished products:', productsError);
      return NextResponse.json({ error: productsError.message }, { status: 500 });
    }

    // Zone inventory formatına dönüştür
    const centerInventory = finishedProducts.map(product => ({
      id: `center-${product.id}`,
      zone_id: centerZone.id,
      material_type: 'finished',
      material_id: product.id,
      quantity: product.quantity,
      product: {
        id: product.id,
        name: product.name,
        code: product.code,
        unit_price: product.sale_price,
        unit: product.unit
      }
    }));

    return NextResponse.json({
      data: centerInventory,
      zone: centerZone
    });

  } catch (error) {
    console.error('Error fetching center zone inventory:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
