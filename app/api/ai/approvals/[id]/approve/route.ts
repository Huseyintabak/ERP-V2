/**
 * Approve Human Approval
 * Onay bekleyen kararı onayla
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only yonetici can approve
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();

    // Get approval
    const { data: approval, error: fetchError } = await supabase
      .from('human_approvals')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !approval) {
      return NextResponse.json(
        { error: 'Approval not found' },
        { status: 404 }
      );
    }

    if (approval.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval is already ${approval.status}` },
        { status: 400 }
      );
    }

    // Check expiry
    if (approval.expiry_at && new Date(approval.expiry_at) < new Date()) {
      return NextResponse.json(
        { error: 'Approval has expired' },
        { status: 400 }
      );
    }

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('human_approvals')
      .update({
        status: 'approved',
        approved_by: payload.userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error approving:', updateError);
      return NextResponse.json(
        { error: 'Failed to approve' },
        { status: 500 }
      );
    }

    // Create notification
    await supabase.from('notifications').insert({
      type: 'order_update',
      title: 'AI Kararı Onaylandı',
      message: `${approval.agent} tarafından önerilen "${approval.action}" işlemi onaylandı.`,
      severity: approval.severity,
      user_id: approval.requested_by
    });

    logger.log(`✅ Approval ${id} approved by ${payload.userId}`);

    return NextResponse.json({
      success: true,
      approval: updatedApproval
    });
  } catch (error: any) {
    logger.error('Approve API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

