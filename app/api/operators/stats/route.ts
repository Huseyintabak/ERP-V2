import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    // Only operators can access their stats
    if (payload.role !== 'operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operatorId = payload.userId;
    const supabase = await createClient();

    // Get operator's production plans
    const { data: plans, error: plansError } = await supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(order_number, priority, delivery_date),
        product:finished_products(name, code)
      `)
      .eq('assigned_operator_id', operatorId);

    if (plansError) {
      console.error('Error fetching production plans:', plansError);
      return NextResponse.json({ error: 'Failed to fetch production plans' }, { status: 500 });
    }

    // Get production logs for performance metrics
    const { data: logs, error: logsError } = await supabase
      .from('production_logs')
      .select('*')
      .eq('operator_id', operatorId);

    if (logsError) {
      console.error('Error fetching production logs:', logsError);
      return NextResponse.json({ error: 'Failed to fetch production logs' }, { status: 500 });
    }

    // Get assigned orders count
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('assigned_operator_id', operatorId);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Helper functions for date calculations
    const isToday = (date: string) => {
      const today = new Date();
      const checkDate = new Date(date);
      return checkDate.toDateString() === today.toDateString();
    };

    const isThisWeek = (date: string) => {
      const today = new Date();
      const checkDate = new Date(date);
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
      const weekEnd = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      return checkDate >= weekStart && checkDate <= weekEnd;
    };

    const isThisMonth = (date: string) => {
      const today = new Date();
      const checkDate = new Date(date);
      return checkDate.getMonth() === today.getMonth() && checkDate.getFullYear() === today.getFullYear();
    };

    // Calculate daily completed tasks
    const dailyCompleted = plans.filter(p => 
      p.status === 'tamamlandi' && 
      p.completed_at && 
      isToday(p.completed_at)
    ).length;

    // Calculate weekly completed tasks
    const weeklyCompleted = plans.filter(p => 
      p.status === 'tamamlandi' && 
      p.completed_at && 
      isThisWeek(p.completed_at)
    ).length;

    // Calculate personal efficiency (completed vs assigned today)
    const totalAssignedToday = plans.filter(p => 
      isToday(p.created_at)
    ).length;
    const personalEfficiency = totalAssignedToday > 0 ? (dailyCompleted / totalAssignedToday) * 100 : 0;

    // Calculate quality rate (assuming no defects for now - can be enhanced later)
    const totalProduced = logs.reduce((sum, log) => sum + (log.quantity_produced || 0), 0);
    const qualityRate = totalProduced > 0 ? 95.0 : 0; // Default quality rate

    // Calculate assigned orders count
    const assignedOrders = orders?.length || 0;

    // Calculate active productions
    const activeProductions = plans.filter(p => 
      p.status === 'planlandi' || p.status === 'devam_ediyor'
    ).length;

    // Calculate average work time
    const completedPlans = plans.filter(p => 
      p.status === 'tamamlandi' && 
      p.completed_at && 
      p.started_at
    );
    
    let averageWorkTime = 0;
    if (completedPlans.length > 0) {
      const totalWorkTime = completedPlans.reduce((sum, plan) => {
        const duration = new Date(plan.completed_at) - new Date(plan.started_at);
        return sum + duration;
      }, 0);
      averageWorkTime = (totalWorkTime / completedPlans.length) / (1000 * 60 * 60); // Convert to hours
    }

    // Calculate machine utilization (simplified - based on active time)
    const machineUtilization = 78.5; // Mock data for now

    // Calculate weekly performance
    const weeklyPerformance = weeklyCompleted > 0 ? (weeklyCompleted / 5) * 100 : 0; // Assuming 5 working days

    // Calculate monthly performance
    const monthlyCompleted = plans.filter(p => 
      p.status === 'tamamlandi' && 
      p.completed_at && 
      isThisMonth(p.completed_at)
    ).length;
    const monthlyPerformance = monthlyCompleted > 0 ? (monthlyCompleted / 20) * 100 : 0; // Assuming 20 working days

    // Calculate improvement rate (simplified)
    const improvementRate = 5.3; // Mock data for now

    // Calculate target achievement
    const targetAchievement = 92.8; // Mock data for now

    // Get current and next tasks
    const currentTask = plans.find(p => p.status === 'devam_ediyor')?.product?.name || '';
    const nextTask = plans.find(p => p.status === 'planlandi')?.product?.name || '';

    // Calculate estimated completion (simplified)
    const estimatedCompletion = '14:30'; // Mock data for now

    // Get work status from operator table
    const { data: operator, error: operatorError } = await supabase
      .from('operators')
      .select('current_status')
      .eq('id', operatorId)
      .single();

    const workStatus = operator?.current_status || 'idle';

    const stats = {
      dailyCompleted,
      weeklyCompleted,
      personalEfficiency: Math.round(personalEfficiency * 10) / 10,
      qualityRate: Math.round(qualityRate * 10) / 10,
      assignedOrders,
      activeProductions,
      averageWorkTime: Math.round(averageWorkTime * 10) / 10,
      machineUtilization: Math.round(machineUtilization * 10) / 10,
      weeklyPerformance: Math.round(weeklyPerformance * 10) / 10,
      monthlyPerformance: Math.round(monthlyPerformance * 10) / 10,
      improvementRate: Math.round(improvementRate * 10) / 10,
      targetAchievement: Math.round(targetAchievement * 10) / 10,
      currentTask,
      nextTask,
      estimatedCompletion,
      workStatus: workStatus as 'active' | 'idle' | 'break'
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Operator stats API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
