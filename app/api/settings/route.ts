import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
// Settings schema
const settingsSchema = z.object({
  default_operator_password: z.string().min(6).optional(),
  critical_stock_threshold: z.number().min(1).max(100).optional(),
  production_notification_enabled: z.boolean().optional(),
  email_notifications_enabled: z.boolean().optional(),
  system_maintenance_mode: z.boolean().optional(),
  auto_backup_enabled: z.boolean().optional(),
  backup_retention_days: z.number().min(7).max(365).optional(),
  max_login_attempts: z.number().min(1).max(10).optional(),
  session_timeout_minutes: z.number().min(30).max(1440).optional(),
});

// GET - Get all system settings
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only admin can access settings
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await createClient();

    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .order('key');

    if (error) {
      logger.error('Error fetching settings:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Convert array of {key, value} to object
    const settingsObject = settings.reduce((acc, setting) => {
      let value = setting.value;
      
      // Parse JSON values
      if (setting.value === 'true') value = true;
      else if (setting.value === 'false') value = false;
      else if (!isNaN(Number(setting.value))) value = Number(setting.value);
      
      acc[setting.key] = value;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json(settingsObject);
  } catch (error: any) {
    logger.error('Unexpected error fetching settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Update system settings
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only admin can update settings
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = settingsSchema.parse(body);
    
    const supabase = await createClient();

    // Update settings one by one
    const updatePromises = Object.entries(validatedData).map(async ([key, value]) => {
      if (value !== undefined) {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key,
            value: String(value),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          logger.error(`Error updating setting ${key}:`, error);
          throw error;
        }
      }
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, message: 'Ayarlar başarıyla güncellendi' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    logger.error('Unexpected error updating settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

