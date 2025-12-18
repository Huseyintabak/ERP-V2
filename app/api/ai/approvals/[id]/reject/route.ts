/**
 * Reject Human Approval
 * Onay bekleyen kararı reddet
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Only yonetici can reject
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { reason } = body;

    // Use admin client to bypass RLS (we already checked role above)
    const supabase = createAdminClient();

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

    // Update approval
    const { data: updatedApproval, error: updateError } = await supabase
      .from('human_approvals')
      .update({
        status: 'rejected',
        rejected_by: payload.userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || 'No reason provided',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error rejecting:', updateError);
      return NextResponse.json(
        { error: 'Failed to reject' },
        { status: 500 }
      );
    }

    // Create notification
    await supabase.from('notifications').insert({
      type: 'order_update',
      title: 'AI Kararı Reddedildi',
      message: `${approval.agent} tarafından önerilen "${approval.action}" işlemi reddedildi.${reason ? ` Sebep: ${reason}` : ''}`,
      severity: approval.severity,
      user_id: approval.requested_by
    });

    logger.log(`❌ Approval ${id} rejected by ${payload.userId}`);

    return NextResponse.json({
      success: true,
      approval: updatedApproval
    });
  } catch (error: any) {
    logger.error('Reject API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

