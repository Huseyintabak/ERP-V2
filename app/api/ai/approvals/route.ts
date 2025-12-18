/**
 * Human Approvals API
 * Onay bekleyen kararları listele
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createAdminClient } from '@/lib/supabase/server';
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

    // Only planlama and yonetici can view approvals
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      logger.error('NEXT_PUBLIC_SUPABASE_URL is not set');
      return NextResponse.json(
        { error: 'Server configuration error: Supabase URL not configured' },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.error('SUPABASE_SERVICE_ROLE_KEY is not set');
      return NextResponse.json(
        { error: 'Server configuration error: Service role key not configured' },
        { status: 500 }
      );
    }

    // Use admin client to bypass RLS (we already checked role above)
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (clientError: any) {
      logger.error('Error creating Supabase admin client:', clientError);
      return NextResponse.json(
        { error: 'Failed to initialize database connection', details: clientError.message },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('human_approvals')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: approvals, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching approvals from database:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return NextResponse.json(
        { 
          error: 'Failed to fetch approvals',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    logger.log(`📊 Approvals API: status=${status}, found=${approvals?.length || 0}, total=${count || 0}`);
    if (approvals && approvals.length > 0) {
      logger.log(`📊 First approval:`, {
        id: approvals[0].id,
        agent: approvals[0].agent,
        status: approvals[0].status,
        expiry_at: approvals[0].expiry_at
      });
    }

    // Don't expire old approvals here - it interferes with fetching
    // Expiration should be handled by a separate background job or on-demand

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
    logger.error('Human approvals API error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

