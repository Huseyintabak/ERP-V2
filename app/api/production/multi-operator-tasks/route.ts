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

    // Get production plans that can have multiple operators
    const { data: plans, error } = await supabase
      .from('production_plans')
      .select(`
        id,
        order_id,
        product_id,
        planned_quantity,
        produced_quantity,
        status,
        max_operators,
        created_at,
        finished_products!inner(
          name,
          code
        ),
        orders!inner(
          id,
          customer_name
        )
      `)
      .in('status', ['planlandi', 'devam_ediyor', 'duraklatildi'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching multi-operator tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get assigned operators for each plan
    const planIds = plans?.map(plan => plan.id) || [];
    const { data: assignments, error: assignmentError } = await supabase
      .from('production_plan_operators')
      .select(`
        plan_id,
        operator_id,
        status,
        started_at,
        users!production_plan_operators_assigned_by_fkey(
          id,
          name,
          email
        )
      `)
      .in('plan_id', planIds);

    if (assignmentError) {
      console.error('Error fetching operator assignments:', assignmentError);
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    // Group assignments by plan_id
    const assignmentsByPlan = (assignments || []).reduce((acc, assignment) => {
      if (!acc[assignment.plan_id]) {
        acc[assignment.plan_id] = [];
      }
      acc[assignment.plan_id].push(assignment);
      return acc;
    }, {} as Record<string, any[]>);

    // Format the response
    const tasks = (plans || []).map(plan => ({
      id: plan.id,
      order_id: plan.order_id,
      product_name: plan.finished_products.name,
      product_code: plan.finished_products.code,
      target_quantity: plan.planned_quantity,
      produced_quantity: plan.produced_quantity,
      status: plan.status,
      priority: 'orta', // Default priority
      max_operators: plan.max_operators || 1,
      assigned_operators: (assignmentsByPlan[plan.id] || []).map(a => a.operator_id),
      assigned_operator_details: (assignmentsByPlan[plan.id] || []).map(a => ({
        id: a.operator_id,
        name: a.users.name,
        email: a.users.email,
        series: 'thunder', // Default series since we're using users table
        status: a.status,
        started_at: a.started_at
      })),
      created_at: plan.created_at
    }));

    return NextResponse.json({ data: tasks });

  } catch (error: any) {
    console.error('Error in multi-operator tasks:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
