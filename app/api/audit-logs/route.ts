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

    // Check if user has permission to view audit logs
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const table = searchParams.get('table') || '';
    const severity = searchParams.get('severity') || '';
    const user = searchParams.get('user') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const statsRequest = searchParams.get('stats') === 'true';
    const analyticsRequest = searchParams.get('analytics') === 'true';

    const supabase = await createClient();

    // Return analytics if requested
    if (analyticsRequest) {
      // Get last 30 days of data for analytics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch audit logs for analytics
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('action, created_at, severity, user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        logger.error('Error fetching analytics data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Process analytics data
      const analytics = processAnalyticsData(logs || []);

      return NextResponse.json(analytics);
    }

    // Return stats if requested
    if (statsRequest) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayLogs } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: false })
        .gte('created_at', today.toISOString());
      
      const { data: criticalLogs } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: false })
        .eq('severity', 'high')
        .gte('created_at', today.toISOString());
      
      const { data: activeUsers } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true);
      
      return NextResponse.json({
        stats: {
          todayCount: todayLogs?.length || 0,
          criticalCount: criticalLogs?.length || 0,
          systemHealth: 98.5,
          activeUsers: activeUsers || 0
        }
      });
    }

    // Build query without join (we'll fetch users separately)
    // count: 'exact' → toplam kayıt sayısı aynı istekte döner (sayfalama için)
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      // PostgREST filtre sözdizimini bozabilecek karakterleri temizle (`,` `(` `)` ile
      // kullanıcı .or() içine kendi koşulunu ekleyebiliyordu)
      const safeSearch = search.replace(/[,()*\\]/g, ' ').trim();
      if (safeSearch) {
        query = query.or(`description.ilike.%${safeSearch}%,table_name.ilike.%${safeSearch}%`);
      }
    }

    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    if (table && table !== 'all') {
      query = query.eq('table_name', table);
    }

    if (severity && severity !== 'all') {
      query = query.eq('severity', severity);
    }

    if (user && user !== 'all') {
      query = query.eq('user_id', user);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply pagination
    // (Önceden filtrelerden sonra ayrı bir .select('*', { count }) çağrılıyordu; transform
    // builder'da count seçeneği yok sayıldığı için count hep undefined → totalPages 0'dı.)
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, count, error } = await query;
    const totalPages = Math.ceil((count || 0) / limit);

    if (error) {
      logger.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique user IDs and fetch users separately
    const userIds = [...new Set((logs || []).map((log: any) => log.user_id).filter(Boolean))];
    
    let usersMap = new Map();
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, email')
        .in('id', userIds);
      
      if (users) {
        usersMap = new Map(users.map((u: any) => [u.id, u]));
      }
    }

    // Format the response
    const formattedLogs = (logs || []).map((log: any) => {
      const user = usersMap.get(log.user_id);
      return {
        id: log.id,
        user_id: log.user_id,
        user_name: user?.name || 'Bilinmeyen',
        user_email: user?.email || '',
        action: log.action,
        table_name: log.table_name,
        record_id: log.record_id,
        old_values: log.old_values,
        new_values: log.new_values,
        description: log.description,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
        severity: log.severity || 'medium',
        category: log.category || 'general'
      };
    });

    return NextResponse.json({
      logs: formattedLogs,
      totalPages,
      currentPage: page,
      totalCount: count || 0
    });

  } catch (error: any) {
    logger.error('Error in audit logs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}


function processAnalyticsData(logs: any[]) {
  // Group by action type
  const actionCounts: { [key: string]: number } = {};
  const dailyActivity: { [key: string]: number } = {};
  const userActivity: { [key: string]: number } = {};
  const severityDistribution: { [key: string]: number } = {};

  logs.forEach(log => {
    // Action counts
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;

    // Daily activity
    const date = new Date(log.created_at).toISOString().split('T')[0];
    dailyActivity[date] = (dailyActivity[date] || 0) + 1;

    // User activity
    if (log.user_id) {
      userActivity[log.user_id] = (userActivity[log.user_id] || 0) + 1;
    }

    // Severity distribution
    const severity = log.severity || 'medium';
    severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
  });

  return {
    actionTrends: Object.entries(actionCounts).map(([action, count]) => ({ action, count })),
    dailyActivity: Object.entries(dailyActivity).map(([date, count]) => ({ date, count })),
    userActivity: Object.entries(userActivity).map(([userId, count]) => ({ userId, count })),
    severityDistribution: Object.entries(severityDistribution).map(([severity, count]) => ({ severity, count })),
    totalLogs: logs.length
  };
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { 
      action, 
      table_name, 
      record_id, 
      old_values, 
      new_values, 
      description, 
      severity = 'medium',
      category = 'general',
      ip_address,
      user_agent
    } = await request.json();

    if (!action || !table_name || !description) {
      return NextResponse.json({ error: 'Action, table_name, and description are required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: payload.userId,
        action,
        table_name,
        record_id: record_id || null,
        old_values: old_values || null,
        new_values: new_values || null,
        description,
        severity,
        category,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating audit log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data });

  } catch (error: any) {
    logger.error('Error in audit log creation:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}