import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operatorId = payload.userId;
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('plan_id');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!planId) {
      return NextResponse.json({ error: 'plan_id gerekli' }, { status: 400 });
    }

    // Plan'ın operatöre atanmış olduğunu kontrol et
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .select('assigned_operator_id')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Plan bulunamadı' }, { status: 404 });
    }

    if (plan.assigned_operator_id !== operatorId) {
      return NextResponse.json({ error: 'Bu plan size atanmamış' }, { status: 403 });
    }

    // Production logs'ları getir
    const { data: logs, error: logsError } = await supabase
      .from('production_logs')
      .select('*')
      .eq('plan_id', planId)
      .eq('operator_id', operatorId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (logsError) {
      logger.error('Production logs fetch error:', logsError);
      return NextResponse.json({ error: 'Production logs alınamadı' }, { status: 500 });
    }

    return NextResponse.json({
      data: logs || [],
      total: logs?.length || 0
    });

  } catch (error) {
    logger.error('Production Logs API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}