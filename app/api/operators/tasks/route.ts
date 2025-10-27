import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    // Only operators can access their tasks
    if (payload.role !== 'operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operatorId = payload.userId;
    logger.log('🔍 Operator ID from token:', operatorId);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';

    logger.log('🔍 Query params:', { status, page, limit });

    const supabase = await createClient();

    // DEBUG: Önce tüm production plan'ları görelim
    const { data: allPlans } = await supabase
      .from('production_plans')
      .select('id, assigned_operator_id, status');
    
    logger.log('📊 All production plans:', JSON.stringify(allPlans, null, 2));
    logger.log('📊 Total plans count:', allPlans?.length || 0);

    let query = supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(
          id,
          order_number,
          customer_name,
          priority,
          delivery_date,
          status
        ),
        product:finished_products(
          id,
          name,
          code,
          barcode
        )
      `, { count: 'exact' })
      .eq('assigned_operator_id', operatorId);
    
    logger.log('🔍 Filtering by assigned_operator_id:', operatorId);

    // Filter by status if provided
    if (status) {
      if (status.includes(',')) {
        const statuses = status.split(',');
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status);
      }
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.error('❌ Error fetching operator tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    logger.log('✅ Tasks found:', data?.length || 0);
    logger.log('📦 Tasks data:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    logger.error('Operator tasks API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
