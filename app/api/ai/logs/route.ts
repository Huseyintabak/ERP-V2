/**
 * AI Agent Logs API
 * Agent log kayıtlarını listele, filtrele ve analiz et
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only planlama and yonetici can view logs
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const agent = searchParams.get('agent') || '';
    const level = searchParams.get('level') || '';
    const action = searchParams.get('action') || '';
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const adminSupabase = createAdminClient();

    // Build query
    let query = adminSupabase.from('agent_logs').select('*', { count: 'exact' });

    // Apply filters
    if (agent) {
      query = query.eq('agent', agent);
    }

    if (level) {
      query = query.eq('level', level);
    }

    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Search in data field (JSONB)
    if (search) {
      // Search in action, agent, or data fields
      query = query.or(`action.ilike.%${search}%,agent.ilike.%${search}%`);
    }

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      logger.error('Error fetching agent logs:', logsError);
      return NextResponse.json(
        {
          success: false,
          error: logsError.message || 'Failed to fetch logs',
        },
        { status: 500 }
      );
    }

    // Get stats
    const { data: allLogs, error: statsError } = await adminSupabase
      .from('agent_logs')
      .select('agent, level, action, created_at');

    if (statsError) {
      logger.error('Error fetching stats:', statsError);
    }

    // Calculate stats
    const stats = {
      total: count || 0,
      byAgent: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
      dailyCounts: [] as Array<{ date: string; count: number }>,
    };

    if (allLogs) {
      // Count by agent
      allLogs.forEach((log) => {
        stats.byAgent[log.agent] = (stats.byAgent[log.agent] || 0) + 1;
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      });

      // Daily counts (last 30 days)
      const dailyMap = new Map<string, number>();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      allLogs
        .filter((log) => new Date(log.created_at) >= thirtyDaysAgo)
        .forEach((log) => {
          const date = new Date(log.created_at).toISOString().split('T')[0];
          dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
        });

      stats.dailyCounts = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    logger.error('Error in logs API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

