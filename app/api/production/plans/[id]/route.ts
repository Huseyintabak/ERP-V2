import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    const { data: plan, error } = await supabase
      .from('production_plans')
      .select(`
        *,
        orders!production_plans_order_id_fkey (
          id,
          order_number,
          customer_name,
          status
        ),
        users!production_plans_assigned_operator_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Production plan not found' }, { status: 404 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error fetching production plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH ve PUT - Partial update (operatör atama, status değişikliği vb.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    // Only planlama and yonetici can update production plans
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = await request.json();
    
    console.log('📝 Production plan PATCH:', { id, updateData });

    const { data: plan, error } = await supabase
      .from('production_plans')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Production plan update error:', error);
      return NextResponse.json({ error: 'Failed to update production plan' }, { status: 400 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating production plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    // Only managers and planlama can update production plans
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = await request.json();

    const { data: plan, error } = await supabase
      .from('production_plans')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update production plan' }, { status: 400 });
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error('Error updating production plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = await params;
    const supabase = await createClient();

    // Only managers and planlama can delete production plans
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if production plan has logs
    const { data: productionLogs } = await supabase
      .from('production_logs')
      .select('id')
      .eq('production_plan_id', id)
      .limit(1);

    if (productionLogs && productionLogs.length > 0) {
      return NextResponse.json({ 
        error: 'Bu üretim planının üretim kayıtları var. Önce üretim kayıtlarını silin.' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('production_plans')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete production plan' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Production plan deleted successfully' });
  } catch (error) {
    console.error('Error deleting production plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}