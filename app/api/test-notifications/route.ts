import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Test endpoint to check notifications without authentication
export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Test notifications API called');
    const supabase = await createClient();

    // Check if notifications table exists and has data
    const { data: notifications, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .limit(5);

    console.log('🔔 Test query result:', { 
      notificationsCount: notifications?.length, 
      error: error?.message,
      count 
    });

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
    console.error('🔔 Test notifications error:', error);
    return NextResponse.json({ 
      error: error.message,
      type: 'unexpected_error'
    }, { status: 500 });
  }
}
