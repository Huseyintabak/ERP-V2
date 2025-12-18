import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import { getTraceTracker } from '@/lib/ai/utils/trace-tracker';

/**
 * GET /api/ai/traces/[id]
 * Get conversation trace by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    const conversationId = id;
    const traceTracker = getTraceTracker();
    
    // Try to get trace from memory first
    let trace = traceTracker.getTrace(conversationId);
    
    // If not in memory, try to load from database
    if (!trace) {
      const adminSupabase = createAdminClient();
      const { data: logEntry } = await adminSupabase
        .from('agent_logs')
        .select('trace_tree')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (logEntry?.trace_tree) {
        // Reconstruct trace from database
        trace = {
          conversationId,
          root: logEntry.trace_tree.root,
          totalDuration: logEntry.trace_tree.totalDuration,
          bottleneckAgent: logEntry.trace_tree.bottleneckAgent,
          bottleneckDuration: logEntry.trace_tree.bottleneckDuration,
          decisionPath: logEntry.trace_tree.decisionPath || [],
          timestamp: new Date(logEntry.trace_tree.timestamp || Date.now())
        };
      }
    }
    
    if (!trace) {
      return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      trace
    });

  } catch (error: any) {
    logger.error('Error fetching trace:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

