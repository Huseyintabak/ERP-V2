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

    const supabase = await createClient();

    // Build query
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        users!inner(
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.or(`description.ilike.%${search}%,table_name.ilike.%${search}%,users.name.ilike.%${search}%,users.email.ilike.%${search}%`);
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

    // Get total count for pagination
    const { count } = await query.select('*', { count: 'exact', head: true });
    const totalPages = Math.ceil((count || 0) / limit);

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format the response
    const formattedLogs = (logs || []).map(log => ({
      id: log.id,
      user_id: log.user_id,
      user_name: log.users?.name,
      user_email: log.users?.email,
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
    }));

    return NextResponse.json({
      logs: formattedLogs,
      totalPages,
      currentPage: page,
      totalCount: count || 0
    });

  } catch (error: any) {
    console.error('Error in audit logs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
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
      console.error('Error creating audit log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, log: data });

  } catch (error: any) {
    console.error('Error in audit log creation:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}