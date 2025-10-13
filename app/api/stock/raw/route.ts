import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rawMaterialSchema } from '@/types';

// GET - List Raw Materials (with pagination & filtering)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sort') || 'code';
    const sortOrder = searchParams.get('order') || 'asc';

    const supabase = await createClient();
    
    let query = supabase
      .from('raw_materials')
      .select('*', { count: 'exact' });

    // Search filter
    if (search) {
      query = query.or(`code.ilike.%${search}%,name.ilike.%${search}%,barcode.ilike.%${search}%`);
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('GET /api/stock/raw error:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası' },
      { status: 500 }
    );
  }
}

// POST - Create Raw Material
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = rawMaterialSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('raw_materials')
      .insert([validated])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/stock/raw error:', error);
    return NextResponse.json(
      { error: error.message || 'Oluşturma hatası' },
      { status: 400 }
    );
  }
}


