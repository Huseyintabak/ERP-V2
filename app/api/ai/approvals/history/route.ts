/**
 * Approval History API
 * Onay geçmişi
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

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

    // Only planlama and yonetici can view history
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const agent = searchParams.get('agent');
    const status = searchParams.get('status');

    // Build query
    let query = supabase
      .from('human_approvals')
      .select(`
        *,
        requested_by_user:users!human_approvals_requested_by_fkey(id, name, email),
        approved_by_user:users!human_approvals_approved_by_fkey(id, name, email),
        rejected_by_user:users!human_approvals_rejected_by_fkey(id, name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    if (agent) {
      query = query.eq('agent', agent);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: approvals, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching approval history:', error);
      return NextResponse.json(
        { error: 'Failed to fetch approval history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      approvals: approvals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    logger.error('Approval history API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

