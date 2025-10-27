import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const supabase = await createClient();

    // Role bazlı istatistikler
    const role = payload.role;
    
    let stats = {};

    if (role === 'yonetici') {
      // Yönetici için genel istatistikler
      const [
        { count: totalOrders },
        { count: activeOrders },
        { count: totalProducts },
        { count: totalOperators },
        { count: totalNotifications }
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'uretimde'),
        supabase.from('finished_products').select('*', { count: 'exact', head: true }),
        supabase.from('operators').select('*', { count: 'exact', head: true }),
        supabase.from('notifications').select('*', { count: 'exact', head: true })
      ]);

      stats = {
        totalOrders: totalOrders || 0,
        activeOrders: activeOrders || 0,
        totalProducts: totalProducts || 0,
        totalOperators: totalOperators || 0,
        totalNotifications: totalNotifications || 0
      };
    } else if (role === 'depo') {
      // Depo için stok istatistikleri
      const [
        { count: rawMaterials },
        { count: semiProducts },
        { count: finishedProducts },
        { count: stockMovements }
      ] = await Promise.all([
        supabase.from('raw_materials').select('*', { count: 'exact', head: true }),
        supabase.from('semi_finished_products').select('*', { count: 'exact', head: true }),
        supabase.from('finished_products').select('*', { count: 'exact', head: true }),
        supabase.from('stock_movements').select('*', { count: 'exact', head: true })
      ]);

      stats = {
        rawMaterials: rawMaterials || 0,
        semiProducts: semiProducts || 0,
        finishedProducts: finishedProducts || 0,
        stockMovements: stockMovements || 0
      };
    } else if (role === 'planlama') {
      // Planlama için üretim istatistikleri
      const [
        { count: totalPlans },
        { count: activePlans },
        { count: completedPlans },
        { count: totalOrders }
      ] = await Promise.all([
        supabase.from('production_plans').select('*', { count: 'exact', head: true }),
        supabase.from('production_plans').select('*', { count: 'exact', head: true }).eq('status', 'devam_ediyor'),
        supabase.from('production_plans').select('*', { count: 'exact', head: true }).eq('status', 'tamamlandi'),
        supabase.from('orders').select('*', { count: 'exact', head: true })
      ]);

      stats = {
        totalPlans: totalPlans || 0,
        activePlans: activePlans || 0,
        completedPlans: completedPlans || 0,
        totalOrders: totalOrders || 0
      };
    } else if (role === 'operator') {
      // Operatör için görev istatistikleri
      const [
        { count: assignedTasks },
        { count: completedTasks },
        { count: activeTasks }
      ] = await Promise.all([
        supabase.from('production_plans').select('*', { count: 'exact', head: true }).eq('assigned_operator_id', payload.userId),
        supabase.from('production_plans').select('*', { count: 'exact', head: true }).eq('assigned_operator_id', payload.userId).eq('status', 'tamamlandi'),
        supabase.from('production_plans').select('*', { count: 'exact', head: true }).eq('assigned_operator_id', payload.userId).eq('status', 'devam_ediyor')
      ]);

      stats = {
        assignedTasks: assignedTasks || 0,
        completedTasks: completedTasks || 0,
        activeTasks: activeTasks || 0
      };
    }

    return NextResponse.json({
      success: true,
      data: stats,
      role: role
    });

  } catch (error) {
    logger.error('Dashboard stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
