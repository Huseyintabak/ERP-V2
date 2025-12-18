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

    // Use admin client to bypass RLS (we already checked auth above)
    const { createAdminClient } = await import('@/lib/supabase/server');
    const supabase = createAdminClient();

    // Bekleyen ayar güncellemelerini al
    const { data: pendingUpdates, error } = await supabase
      .rpc('get_pending_settings_updates', {
        p_user_id: payload.userId
      });

    if (error) {
      logger.error('Error fetching pending updates:', error);
      return NextResponse.json({ 
        data: { 
          success: false, 
          error: error.message,
          pending_updates: [],
          count: 0,
          message: 'Bekleyen güncellemeler alınamadı'
        } 
      }, { status: 500 });
    }

    // RPC fonksiyonu zaten { success, pending_updates, count } formatında döndürüyor
    // Eğer NULL dönerse veya success false ise, boş array döndür
    if (!pendingUpdates) {
      logger.warn('RPC returned null, returning empty result');
      return NextResponse.json({ 
        data: { 
          success: true, 
          pending_updates: [], 
          count: 0 
        } 
      });
    }

    // RPC fonksiyonu JSONB döndürüyor, direkt kullanabiliriz
    logger.log(`✅ Pending updates fetched: ${pendingUpdates.count || 0} items`);
    return NextResponse.json({ data: pendingUpdates });

  } catch (error: any) {
    logger.error('Error in pending settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
