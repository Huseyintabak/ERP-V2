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

    // Get multi-operator statistics
    const { data: stats, error } = await supabase.rpc('get_multi_operator_statistics', {
      p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      p_end_date: new Date().toISOString()
    });

    if (error) {
      console.error('Error fetching multi-operator stats:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get additional operator performance data
    const { data: operators, error: operatorsError } = await supabase
      .from('operators')
      .select('id, name, is_active, active_productions_count')
      .eq('is_active', true);

    if (operatorsError) {
      console.error('Error fetching operators:', operatorsError);
      return NextResponse.json({ error: operatorsError.message }, { status: 500 });
    }

    // Calculate additional metrics
    const activeOperators = operators?.filter(op => op.active_productions_count > 0).length || 0;
    const totalOperators = operators?.length || 0;

    // Get recent production data
    const { data: recentProduction, error: productionError } = await supabase
      .from('multi_operator_production_logs')
      .select('quantity_produced')
      .eq('action', 'log_production')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    if (productionError) {
      console.error('Error fetching recent production:', productionError);
    }

    const recentProductionTotal = recentProduction?.reduce((sum, log) => sum + (log.quantity_produced || 0), 0) || 0;

    // Calculate average efficiency
    const { data: efficiencyData, error: efficiencyError } = await supabase
      .from('production_plan_operators')
      .select(`
        plan_id,
        status,
        production_plans!inner(
          target_quantity,
          produced_quantity
        )
      `)
      .eq('status', 'completed')
      .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    let averageEfficiency = 0;
    if (efficiencyData && efficiencyData.length > 0) {
      const efficiencies = efficiencyData.map(item => {
        const plan = item.production_plans;
        if (plan.target_quantity > 0) {
          return (plan.produced_quantity / plan.target_quantity) * 100;
        }
        return 0;
      });
      averageEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    }

    const result = {
      totalOperators,
      activeOperators,
      totalTasks: stats?.total_tasks || 0,
      multiOperatorTasks: stats?.multi_operator_tasks || 0,
      totalProduction: stats?.total_production || 0,
      recentProduction: recentProductionTotal,
      averageEfficiency: Math.round(averageEfficiency * 10) / 10,
      averageOperatorsPerTask: stats?.average_operators_per_task || 0,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      }
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error in multi-operator stats:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
