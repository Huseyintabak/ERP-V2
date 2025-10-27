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
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = await createClient();

    // Bekleyen ayar güncellemelerini al
    const { data: pendingUpdates, error } = await supabase
      .rpc('get_pending_settings_updates', {
        p_user_id: payload.userId
      });

    if (error) {
      logger.error('Error fetching pending updates:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: pendingUpdates });

  } catch (error: any) {
    logger.error('Error in pending settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
