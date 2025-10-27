import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sql } = await request.json();
    if (!sql) {
      return NextResponse.json({ error: 'SQL query required' }, { status: 400 });
    }

    const supabase = await createClient();

    // SQL'i çalıştır
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      logger.error('SQL execution error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      message: 'SQL executed successfully' 
    });

  } catch (error) {
    logger.error('SQL execution API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
