import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    // Only depo, mobil and yonetici can view activities
    if (!['depo', 'mobil', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Get limit from query params (default 10, max 50)
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '10'), 50);

    // Fetch recent stock movements with related product info
    const { data: movements, error } = await supabase
      .from('stock_movements')
      .select(`
        id,
        movement_type,
        quantity,
        created_at,
        description,
        material_id,
        material_type
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching movements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch activities' },
        { status: 500 }
      );
    }

    // Enrich movements with product information
    const enrichedActivities = await Promise.all(
      (movements || []).map(async (movement) => {
        let productName = 'Unknown Product';
        let productCode = 'N/A';

        if (movement.material_id && movement.material_type) {
          let tableName = '';

          switch (movement.material_type) {
            case 'raw':
              tableName = 'raw_materials';
              break;
            case 'semi':
              tableName = 'semi_finished_products';
              break;
            case 'finished':
              tableName = 'finished_products';
              break;
          }

          if (tableName) {
            const { data: product } = await supabase
              .from(tableName)
              .select('name, code')
              .eq('id', movement.material_id)
              .single();

            if (product) {
              productName = product.name;
              productCode = product.code;
            }
          }
        }

        return {
          id: movement.id,
          type: movement.movement_type,
          productName,
          productCode,
          quantity: movement.quantity,
          description: movement.description,
          createdAt: movement.created_at,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedActivities,
      count: enrichedActivities.length,
    });

  } catch (error: any) {
    console.error('GET /api/dashboard/recent-activities error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}
