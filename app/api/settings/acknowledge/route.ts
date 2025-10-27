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
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { setting_key } = body;

    if (!setting_key) {
      return NextResponse.json({ error: 'Setting key is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Ayar güncellemesini onayla
    const { data: result, error } = await supabase
      .rpc('acknowledge_settings_update', {
        p_user_id: payload.userId,
        p_setting_key: setting_key
      });

    if (error) {
      logger.error('Error acknowledging update:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result });

  } catch (error: any) {
    logger.error('Error in acknowledge settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
