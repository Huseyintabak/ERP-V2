import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      setting_key,
      setting_value,
      change_type = 'updated',
      broadcast_to = 'all',
      target_roles = null,
      target_users = null,
      message = null,
      expires_at = null
    } = body;

    if (!setting_key || !setting_value) {
      return NextResponse.json({ error: 'Setting key and value are required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Broadcast oluştur
    const { data: broadcastId, error } = await supabase
      .rpc('broadcast_setting_change', {
        p_setting_key: setting_key,
        p_setting_value: setting_value,
        p_changed_by: payload.userId,
        p_change_type: change_type,
        p_broadcast_to: broadcast_to,
        p_target_roles: target_roles,
        p_target_users: target_users,
        p_message: message,
        p_expires_at: expires_at
      });

    if (error) {
      logger.error('Error creating broadcast:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      broadcast_id: broadcastId,
      message: 'Ayar değişikliği tüm kullanıcılara bildirildi'
    });

  } catch (error: any) {
    logger.error('Error in settings broadcast:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
