import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    const { taskId, operatorId, startedBy } = await request.json();

    if (!taskId || !operatorId) {
      return NextResponse.json({ error: 'Task ID and Operator ID are required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if operator is assigned to this task
    const { data: assignment, error: assignmentError } = await supabase
      .from('production_plan_operators')
      .select('id, status')
      .eq('plan_id', taskId)
      .eq('operator_id', operatorId)
      .single();

    if (assignmentError) {
      console.error('Error fetching assignment:', assignmentError);
      return NextResponse.json({ error: 'Operatör bu göreve atanmamış' }, { status: 404 });
    }

    if (assignment.status === 'active') {
      return NextResponse.json({ error: 'Operatör zaten bu görevde aktif' }, { status: 400 });
    }

    // Update assignment status to active
    const { error: updateError } = await supabase
      .from('production_plan_operators')
      .update({
        status: 'active',
        started_at: new Date().toISOString(),
        started_by: startedBy
      })
      .eq('id', assignment.id);

    if (updateError) {
      console.error('Error updating assignment:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update production plan status if not already active
    const { data: planData, error: planError } = await supabase
      .from('production_plans')
      .select('status')
      .eq('id', taskId)
      .single();

    if (planError) {
      console.error('Error fetching plan status:', planError);
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    if (planData.status === 'planlandi') {
      const { error: planUpdateError } = await supabase
        .from('production_plans')
        .update({ status: 'devam_ediyor' })
        .eq('id', taskId);

      if (planUpdateError) {
        console.error('Error updating plan status:', planUpdateError);
        // Don't fail the whole operation for this
      }
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: startedBy,
        action: 'UPDATE',
        table_name: 'production_plan_operators',
        record_id: assignment.id,
        old_values: { status: assignment.status },
        new_values: { status: 'active', started_at: new Date().toISOString() },
        description: `Operatör üretimi başlattı: ${operatorId}`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Üretim başarıyla başlatıldı'
    });

  } catch (error: any) {
    console.error('Error in start multi production:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
