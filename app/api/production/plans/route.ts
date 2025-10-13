import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - List Production Plans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const operatorId = searchParams.get('operator_id') || '';
    const assignedOperatorId = searchParams.get('assigned_operator_id') || '';
    const unassigned = searchParams.get('unassigned') === 'true';
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';

    const supabase = await createClient();
    
    let query = supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(order_number, customer_name, priority, delivery_date),
        product:finished_products(id, name, code, barcode),
        assigned_operator:users!production_plans_assigned_operator_id_fkey(id, name, email)
      `, { count: 'exact' });

    if (status) {
      // Virgülle ayrılmış status değerlerini destekle
      if (status.includes(',')) {
        const statuses = status.split(',');
        query = query.in('status', statuses);
      } else {
        query = query.eq('status', status);
      }
    }

    if (operatorId) {
      query = query.eq('assigned_operator_id', operatorId);
    }

    if (assignedOperatorId) {
      query = query.eq('assigned_operator_id', assignedOperatorId);
    }

    if (unassigned) {
      query = query.is('assigned_operator_id', null);
    }

    if (search) {
      query = query.or(`order.order_number.ilike.%${search}%,product.code.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}