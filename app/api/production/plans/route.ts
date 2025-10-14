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
        product:finished_products(id, name, code, barcode)
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

    if (error) {
      console.error('❌ Production plans query error:', error);
      throw error;
    }

    // Operatör bilgilerini ekle (assigned_operator_id üzerinden)
    if (data && data.length > 0) {
      const operatorIds = data
        .filter(plan => plan.assigned_operator_id)
        .map(plan => plan.assigned_operator_id);

      if (operatorIds.length > 0) {
        // operators.id == users.id (one-to-one relationship)
        const { data: operators } = await supabase
          .from('operators')
          .select('id, series, user:users(id, name, email)')
          .in('id', operatorIds);

        // Her plana operator bilgisini ekle
        data.forEach(plan => {
          if (plan.assigned_operator_id) {
            const operator = operators?.find(op => op.id === plan.assigned_operator_id);
            if (operator) {
              plan.operator = {
                id: operator.id,
                series: operator.series,
                name: operator.user?.name || '',
                user: operator.user
              };
            }
          }
        });
      }
    }

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
    console.error('❌ Production plans GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}