import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const materialType = searchParams.get('material_type');
    const materialId = searchParams.get('material_id');
    const year = searchParams.get('year');
    const months = searchParams.get('months');

    const supabase = await createClient();

    // Yıllık ortalama fiyat
    if (year && materialType && materialId) {
      const { data, error } = await supabase.rpc('get_yearly_average_price', {
        p_material_type: materialType,
        p_material_id: materialId,
        p_year: parseInt(year)
      });

      if (error) {
        console.error('Error getting yearly average price:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        yearly_average: data,
        material_type: materialType,
        material_id: materialId,
        year: parseInt(year)
      });
    }

    // Fiyat trend analizi
    if (months && materialType && materialId) {
      const { data, error } = await supabase.rpc('get_price_trend', {
        p_material_type: materialType,
        p_material_id: materialId,
        p_months: parseInt(months)
      });

      if (error) {
        console.error('Error getting price trend:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ 
        trend_data: data,
        material_type: materialType,
        material_id: materialId,
        months: parseInt(months)
      });
    }

    // Genel fiyat geçmişi listesi
    let query = supabase
      .from('price_history')
      .select(`
        *,
        user:users(name, email)
      `)
      .order('effective_date', { ascending: false })
      .limit(100);

    if (materialType) {
      query = query.eq('material_type', materialType);
    }

    if (materialId) {
      query = query.eq('material_id', materialId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching price history:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });

  } catch (error: any) {
    console.error('Price history API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
