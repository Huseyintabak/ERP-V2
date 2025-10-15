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

    const { taskId, operatorId, removedBy } = await request.json();

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

    // Remove assignment
    const { error: removeError } = await supabase
      .from('production_plan_operators')
      .delete()
      .eq('id', assignment.id);

    if (removeError) {
      console.error('Error removing assignment:', removeError);
      return NextResponse.json({ error: removeError.message }, { status: 500 });
    }

    // Check if there are any remaining active operators for this task
    const { data: remainingAssignments, error: remainingError } = await supabase
      .from('production_plan_operators')
      .select('id')
      .eq('plan_id', taskId)
      .in('status', ['assigned', 'active']);

    if (remainingError) {
      console.error('Error checking remaining assignments:', remainingError);
      return NextResponse.json({ error: remainingError.message }, { status: 500 });
    }

    // If no remaining active operators, update plan status
    if (remainingAssignments.length === 0) {
      const { error: planUpdateError } = await supabase
        .from('production_plans')
        .update({ status: 'planlandi' })
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
        user_id: removedBy,
        action: 'DELETE',
        table_name: 'production_plan_operators',
        record_id: assignment.id,
        old_values: {
          plan_id: taskId,
          operator_id: operatorId,
          status: assignment.status
        },
        description: `Operatör görevden kaldırıldı: ${operatorId}`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Operatör başarıyla kaldırıldı'
    });

  } catch (error: any) {
    console.error('Error in remove operator:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
