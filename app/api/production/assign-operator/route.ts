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

    const { taskId, operatorId, assignedBy } = await request.json();

    if (!taskId || !operatorId) {
      return NextResponse.json({ error: 'Task ID and Operator ID are required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if operator is already assigned to this task
    const { data: existingAssignment, error: checkError } = await supabase
      .from('production_plan_operators')
      .select('id')
      .eq('plan_id', taskId)
      .eq('operator_id', operatorId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing assignment:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existingAssignment) {
      return NextResponse.json({ error: 'Operatör zaten bu göreve atanmış' }, { status: 400 });
    }

    // Check if operator is available (not assigned to another active task)
    const { data: activeAssignment, error: activeError } = await supabase
      .from('production_plan_operators')
      .select('id, plan_id')
      .eq('operator_id', operatorId)
      .in('status', ['assigned', 'active'])
      .single();

    if (activeError && activeError.code !== 'PGRST116') {
      console.error('Error checking active assignment:', activeError);
      return NextResponse.json({ error: activeError.message }, { status: 500 });
    }

    if (activeAssignment) {
      return NextResponse.json({ error: 'Operatör başka bir görevde aktif' }, { status: 400 });
    }

    // Check max operators limit
    const { data: currentAssignments, error: countError } = await supabase
      .from('production_plan_operators')
      .select('id')
      .eq('plan_id', taskId)
      .in('status', ['assigned', 'active']);

    if (countError) {
      console.error('Error counting current assignments:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    const { data: planData, error: planError } = await supabase
      .from('production_plans')
      .select('max_operators')
      .eq('id', taskId)
      .single();

    if (planError) {
      console.error('Error fetching plan data:', planError);
      return NextResponse.json({ error: planError.message }, { status: 500 });
    }

    const maxOperators = planData.max_operators || 1;
    if (currentAssignments.length >= maxOperators) {
      return NextResponse.json({ 
        error: `Bu görev için maksimum ${maxOperators} operatör atanabilir` 
      }, { status: 400 });
    }

    // Assign operator
    const { data: assignment, error: assignError } = await supabase
      .from('production_plan_operators')
      .insert({
        plan_id: taskId,
        operator_id: operatorId,
        status: 'assigned',
        assigned_by: assignedBy,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assignError) {
      console.error('Error assigning operator:', assignError);
      return NextResponse.json({ error: assignError.message }, { status: 500 });
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        user_id: assignedBy,
        action: 'INSERT',
        table_name: 'production_plan_operators',
        record_id: assignment.id,
        new_values: {
          plan_id: taskId,
          operator_id: operatorId,
          status: 'assigned'
        },
        description: `Operatör göreve atandı: ${operatorId}`,
        created_at: new Date().toISOString()
      });

    return NextResponse.json({ 
      success: true, 
      message: 'Operatör başarıyla atandı',
      assignment 
    });

  } catch (error: any) {
    console.error('Error in assign operator:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
