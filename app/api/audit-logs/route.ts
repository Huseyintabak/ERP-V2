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
    
    // Only admin can access audit logs
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const table_name = searchParams.get('table_name');
    const action = searchParams.get('action');
    const user_id = searchParams.get('user_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    const supabase = await createClient();

    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        table_name,
        action,
        old_values,
        new_values,
        user_id,
        created_at,
        users!audit_logs_user_id_fkey (
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (table_name) {
      query = query.eq('table_name', table_name);
    }

    if (action) {
      query = query.eq('action', action);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Get total count for pagination
    const { count } = await query;

    // Apply pagination
    const { data: auditLogs, error } = await query
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique tables and actions for filter options
    const { data: tables } = await supabase
      .from('audit_logs')
      .select('table_name')
      .order('table_name');

    const { data: actions } = await supabase
      .from('audit_logs')
      .select('action')
      .order('action');

    const uniqueTables = [...new Set(tables?.map(t => t.table_name) || [])];
    const uniqueActions = [...new Set(actions?.map(a => a.action) || [])];

    return NextResponse.json({
      data: auditLogs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
      filters: {
        tables: uniqueTables,
        actions: uniqueActions,
      },
    });
  } catch (error: any) {
    console.error('Unexpected error fetching audit logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

