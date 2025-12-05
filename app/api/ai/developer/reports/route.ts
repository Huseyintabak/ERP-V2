import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/ai/developer/reports
 * Developer Agent'ın sistem iyileştirme raporlarını getir (agent_logs'tan)
 */
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

    // Only yonetici and planlama roles can access reports
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const severity = searchParams.get('severity') || '';
    const priority = searchParams.get('priority') || '';

    const adminSupabase = createAdminClient();

    // agent_logs tablosundan Developer Agent raporlarını çek
    let query = adminSupabase
      .from('agent_logs')
      .select('*')
      .eq('agent', 'Developer Agent')
      .in('action', ['process_request', 'system_analysis_completed', 'report_to_manager'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.contains('context', { severity });
    }

    const { data: reports, error } = await query;

    if (error) {
      logger.error('Error fetching developer reports:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    // Reports'u parse et ve formatla
    const formattedReports = reports?.map(report => ({
      id: report.id,
      conversationId: report.conversation_id,
      findings: report.context?.findings || report.data?.findings || [],
      summary: report.context?.summary || report.data?.summary || {},
      recommendations: report.context?.recommendations || report.data?.recommendations || [],
      issues: report.context?.issues || report.data?.issues || [],
      timestamp: report.created_at,
      action: report.action,
      reasoning: report.data?.reasoning || report.context?.reasoning
    })) || [];

    return NextResponse.json({
      success: true,
      reports: formattedReports,
      total: formattedReports.length
    });

  } catch (error: any) {
    logger.error('Error in developer reports API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/developer/reports
 * Developer Agent'a manuel analiz isteği gönder
 * (Mevcut /api/ai/developer/report endpoint'ini kullanır)
 */
export async function POST(request: NextRequest) {
  // Mevcut endpoint'e redirect et
  const response = await fetch(`${request.nextUrl.origin}/api/ai/developer/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': request.headers.get('Cookie') || ''
    },
    body: JSON.stringify(await request.json())
  });
  
  return response;
}

