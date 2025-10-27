import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
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

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const userId = searchParams.get('user_id');

    // Hata istatistiklerini al
    const { data: stats, error } = await supabase
      .rpc('get_excel_error_stats', {
        p_user_id: userId || null,
        p_days: days
      });

    if (error) {
      logger.error('Error fetching excel error stats:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: stats });

  } catch (error: any) {
    logger.error('Error in excel error stats:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
