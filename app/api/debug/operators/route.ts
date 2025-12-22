import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * GET /api/debug/operators
 * 
 * Debug endpoint to check operators in database
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    // Tüm operatörleri çek (users ile join)
    const { data: allOperators, error: allError } = await supabase
      .from('operators')
      .select(`
        id,
        series,
        daily_capacity,
        location,
        hourly_rate,
        user:users(id, name, email, is_active)
      `)
      .limit(20);

    // Active operatörleri çek (users.is_active = true)
    const { data: activeOperators, error: activeError } = await supabase
      .from('operators')
      .select(`
        id,
        series,
        daily_capacity,
        location,
        hourly_rate,
        user:users(id, name, email, is_active)
      `)
      .eq('user.is_active', true);

    // Status dağılımını kontrol et (users.is_active kullanarak)
    const { data: statusCounts } = await supabase
      .from('operators')
      .select('user:users(is_active)')
      .limit(100);

    const statusDistribution: Record<string, number> = {
      active: 0,
      inactive: 0
    };
    statusCounts?.forEach(op => {
      if (op.user?.is_active) {
        statusDistribution.active++;
      } else {
        statusDistribution.inactive++;
      }
    });

    return NextResponse.json({
      success: true,
      all_operators: {
        count: allOperators?.length || 0,
        data: allOperators || [],
        error: allError?.message
      },
      active_operators: {
        count: activeOperators?.length || 0,
        data: activeOperators || [],
        error: activeError?.message
      },
      status_distribution: statusDistribution,
      total_daily_capacity: activeOperators?.reduce((sum, op) => sum + (op.daily_capacity || 0), 0) || 0
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

