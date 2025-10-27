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
    if (!payload || (payload.role !== 'yonetici' && payload.role !== 'planlama')) {
      return NextResponse.json({ error: 'Yönetici or Planlama access required' }, { status: 403 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    let result;

    switch (action) {
      case 'metrics':
        const { data: metrics, error: metricsError } = await supabase
          .rpc('get_system_metrics');
        
        if (metricsError) {
          return NextResponse.json({ error: metricsError.message }, { status: 500 });
        }
        
        result = metrics;
        break;

      case 'health':
        const { data: health, error: healthError } = await supabase
          .rpc('check_system_health');
        
        if (healthError) {
          return NextResponse.json({ error: healthError.message }, { status: 500 });
        }
        
        result = health;
        break;

      case 'stats':
        const { data: stats, error: statsError } = await supabase
          .rpc('update_database_stats');
        
        if (statsError) {
          return NextResponse.json({ error: statsError.message }, { status: 500 });
        }
        
        result = stats;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ data: result });

  } catch (error: any) {
    logger.error('Error in system maintenance:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || (payload.role !== 'yonetici' && payload.role !== 'planlama')) {
      return NextResponse.json({ error: 'Yönetici or Planlama access required' }, { status: 403 });
    }

    const body = await request.json();
    const { action, params = {} } = body;

    const supabase = await createClient();
    let result;

    switch (action) {
      case 'clean_audit_logs':
        const { data: auditResult, error: auditError } = await supabase
          .rpc('clean_old_audit_logs', { p_days_to_keep: params.days || 90 });
        
        if (auditError) {
          return NextResponse.json({ error: auditError.message }, { status: 500 });
        }
        
        result = auditResult;
        break;

      case 'clean_notifications':
        const { data: notificationResult, error: notificationError } = await supabase
          .rpc('clean_old_notifications', { p_days_to_keep: params.days || 30 });
        
        if (notificationError) {
          return NextResponse.json({ error: notificationError.message }, { status: 500 });
        }
        
        result = notificationResult;
        break;

      case 'full_cleanup':
        const { data: cleanupResult, error: cleanupError } = await supabase
          .rpc('full_system_cleanup', { 
            p_audit_days: params.audit_days || 90,
            p_notification_days: params.notification_days || 30
          });
        
        if (cleanupError) {
          return NextResponse.json({ error: cleanupError.message }, { status: 500 });
        }
        
        result = cleanupResult;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ data: result });

  } catch (error: any) {
    logger.error('Error in system maintenance:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}