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

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const errorType = searchParams.get('error_type');
    const severity = searchParams.get('severity');
    const status = searchParams.get('status');
    const userId = searchParams.get('user_id');

    let query = supabase
      .from('excel_error_logs')
      .select(`
        id,
        file_name,
        file_type,
        operation_type,
        error_type,
        error_code,
        error_message,
        error_details,
        row_number,
        column_name,
        cell_value,
        expected_format,
        solution_suggestion,
        severity,
        status,
        created_at,
        resolved_at,
        resolution_notes,
        users!excel_error_logs_user_id_fkey(
          id,
          name,
          email
        ),
        resolved_user:users!excel_error_logs_resolved_by_fkey(
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    // Filtreler
    if (errorType) {
      query = query.eq('error_type', errorType);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Sayfalama
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: errors, error } = await query;

    if (error) {
      console.error('Error fetching excel errors:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Toplam sayıyı al
    let countQuery = supabase
      .from('excel_error_logs')
      .select('id', { count: 'exact', head: true });

    if (errorType) {
      countQuery = countQuery.eq('error_type', errorType);
    }
    if (severity) {
      countQuery = countQuery.eq('severity', severity);
    }
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      data: errors,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Error in excel errors:', error);
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

    const body = await request.json();
    const {
      file_name,
      file_type,
      operation_type,
      error_code,
      error_message,
      error_details,
      row_number,
      column_name,
      cell_value,
      expected_format
    } = body;

    const supabase = await createClient();

    // Hata logla
    const { data: errorId, error } = await supabase
      .rpc('log_excel_error', {
        p_user_id: payload.userId,
        p_file_name: file_name,
        p_file_type: file_type,
        p_operation_type: operation_type,
        p_error_code: error_code,
        p_error_message: error_message,
        p_error_details: error_details,
        p_row_number: row_number,
        p_column_name: column_name,
        p_cell_value: cell_value,
        p_expected_format: expected_format
      });

    if (error) {
      console.error('Error logging excel error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      error_id: errorId,
      message: 'Hata başarıyla loglandı' 
    });

  } catch (error: any) {
    console.error('Error in excel error logging:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
