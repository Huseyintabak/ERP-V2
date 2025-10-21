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
      try {
        const { data, error } = await supabase.rpc('get_yearly_average_price', {
          p_material_type: materialType,
          p_material_id: materialId,
          p_year: parseInt(year)
        });

        if (error) {
          console.error('Error getting yearly average price:', error);
          // Function bulunamadığında fallback olarak 0 döndür
          return NextResponse.json({ 
            yearly_average: 0,
            material_type: materialType,
            material_id: materialId,
            year: parseInt(year),
            error: 'Function not available'
          });
        }

        return NextResponse.json({ 
          yearly_average: data || 0,
          material_type: materialType,
          material_id: materialId,
          year: parseInt(year)
        });
      } catch (error) {
        console.error('Error in yearly average price calculation:', error);
        return NextResponse.json({ 
          yearly_average: 0,
          material_type: materialType,
          material_id: materialId,
          year: parseInt(year),
          error: 'Calculation failed'
        });
      }
    }

    // Fiyat trend analizi
    if (months && materialType && materialId) {
      try {
        const { data, error } = await supabase.rpc('get_price_trend', {
          p_material_type: materialType,
          p_material_id: materialId,
          p_months: parseInt(months)
        });

        if (error) {
          console.error('Error getting price trend:', error);
          // Function bulunamadığında fallback olarak boş array döndür
          return NextResponse.json({ 
            trend_data: [],
            material_type: materialType,
            material_id: materialId,
            months: parseInt(months),
            error: 'Function not available'
          });
        }

        return NextResponse.json({ 
          trend_data: data || [],
          material_type: materialType,
          material_id: materialId,
          months: parseInt(months)
        });
      } catch (error) {
        console.error('Error in price trend calculation:', error);
        return NextResponse.json({ 
          trend_data: [],
          material_type: materialType,
          material_id: materialId,
          months: parseInt(months),
          error: 'Calculation failed'
        });
      }
    }

    // Genel fiyat geçmişi listesi
    try {
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
        // Tablo yapısı farklıysa boş array döndür
        return NextResponse.json({ data: [] });
      }

      return NextResponse.json({ data: data || [] });
    } catch (error) {
      console.error('Error in price history query:', error);
      return NextResponse.json({ data: [] });
    }

  } catch (error: any) {
    console.error('Price history API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
