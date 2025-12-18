import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    // Service token kontrolü (Git hook için)
    const serviceToken = request.headers.get('x-service-token');
    const expectedServiceToken = process.env.BROADCAST_SERVICE_TOKEN;
    
    let payload: any = null;
    
    if (serviceToken && expectedServiceToken && serviceToken === expectedServiceToken) {
      // Service token ile authentication (Git hook için)
      payload = {
        userId: 'system',
        role: 'yonetici' // Service token ile gelen istekler için yönetici yetkisi
      };
    } else {
      // Normal JWT authentication
      const token = request.cookies.get('thunder_token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      payload = await verifyJWT(token);
      if (!payload || !['yonetici', 'planlama'].includes(payload.role)) {
        return NextResponse.json({ error: 'Yönetici veya planlama rolü gerekli' }, { status: 403 });
      }
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

    // Use admin client to bypass RLS (we already checked auth above)
    const supabase = createAdminClient();

    // Broadcast oluştur
    // Service token ile gelen istekler için ilk admin kullanıcısını bul
    let changedBy = payload.userId;
    if (payload.userId === 'system') {
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'yonetici')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (adminUser) {
        changedBy = adminUser.id;
      } else {
        // Fallback: Eğer admin kullanıcı yoksa hata döndür
        return NextResponse.json({ 
          error: 'Sistem kullanıcısı bulunamadı' 
        }, { status: 500 });
      }
    }
    
    const { data: broadcastId, error } = await supabase
      .rpc('broadcast_setting_change', {
        p_setting_key: setting_key,
        p_setting_value: setting_value,
        p_changed_by: changedBy,
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
