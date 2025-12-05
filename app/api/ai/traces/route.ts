import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { getTraceTracker } from '@/lib/ai/utils/trace-tracker';

/**
 * GET /api/ai/traces
 * Get performance statistics and list of traces
 */
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

    // Only yonetici and planlama can view traces
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    
    const traceTracker = getTraceTracker();

    if (action === 'stats') {
      // Get performance statistics
      const stats = traceTracker.getPerformanceStats();
      
      return NextResponse.json({
        success: true,
        stats
      });
    }

    // List traces from database
    const adminSupabase = createAdminClient();
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const { data: logEntries, error } = await adminSupabase
      .from('agent_logs')
      .select('conversation_id, trace_tree, created_at')
      .not('trace_tree', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      logger.error('Error fetching traces:', error);
      return NextResponse.json({ error: 'Failed to fetch traces' }, { status: 500 });
    }

    const traces = logEntries?.map(entry => ({
      conversationId: entry.conversation_id,
      trace: entry.trace_tree,
      timestamp: entry.created_at
    })) || [];

    return NextResponse.json({
      success: true,
      traces,
      total: traces.length
    });

  } catch (error: any) {
    logger.error('Error in traces API:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

