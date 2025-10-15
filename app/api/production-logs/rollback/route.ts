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

    const { logId, reason } = await request.json();

    if (!logId) {
      return NextResponse.json({ error: 'Log ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get the production log details
    const { data: logData, error: logError } = await supabase
      .from('production_logs')
      .select(`
        *,
        production_plans!inner(
          id,
          order_id,
          product_id,
          target_quantity,
          produced_quantity,
          status
        )
      `)
      .eq('id', logId)
      .single();

    if (logError || !logData) {
      return NextResponse.json({ error: 'Production log not found' }, { status: 404 });
    }

    const plan = logData.production_plans;
    const log = logData;

    // Check if user has permission to rollback
    const isAdmin = payload.role === 'yonetici' || payload.role === 'planlama';
    const isOperator = payload.role === 'operator';
    const isLogOwner = log.operator_id === payload.userId;

    // Check time restrictions for operators
    if (isOperator && !isAdmin) {
      const logTime = new Date(log.created_at);
      const now = new Date();
      const timeDiffMinutes = (now.getTime() - logTime.getTime()) / (1000 * 60);

      if (timeDiffMinutes > 5) {
        return NextResponse.json({ 
          error: 'Operatörler sadece son 5 dakika içindeki kayıtları geri alabilir' 
        }, { status: 403 });
      }

      if (!isLogOwner) {
        return NextResponse.json({ 
          error: 'Sadece kendi kayıtlarınızı geri alabilirsiniz' 
        }, { status: 403 });
      }
    }

    // Check if plan is still active
    if (plan.status === 'tamamlandi') {
      return NextResponse.json({ 
        error: 'Tamamlanan planlardaki kayıtlar geri alınamaz' 
      }, { status: 400 });
    }

    // Start transaction
    const { data: rollbackResult, error: rollbackError } = await supabase.rpc('rollback_production_log', {
      p_log_id: logId,
      p_reason: reason || 'Production log rollback',
      p_user_id: payload.userId
    });

    if (rollbackError) {
      console.error('Rollback error:', rollbackError);
      return NextResponse.json({ error: rollbackError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Üretim kaydı başarıyla geri alındı',
      data: rollbackResult 
    });

  } catch (error: any) {
    console.error('Error in production log rollback:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
