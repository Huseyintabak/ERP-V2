import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { logger } from '@/lib/utils/logger';
// Test endpoint to check notifications without authentication
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if notifications table exists and has data
    const { data: notifications, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .limit(5);

    if (error) {
      return NextResponse.json({ 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: notifications || [],
      count: count || 0,
      message: 'Notifications table accessible'
    });
  } catch (error: any) {
    logger.error('🔔 Test notifications error:', error);
    return NextResponse.json({ 
      error: error.message,
      type: 'unexpected_error'
    }, { status: 500 });
  }
}
