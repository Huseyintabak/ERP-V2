import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

// Notification schema - Database schema'sına uygun
const notificationSchema = z.object({
  type: z.enum(['critical_stock', 'production_delay', 'order_update']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  material_type: z.enum(['raw', 'semi', 'finished']).optional(),
  material_id: z.string().uuid().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  user_id: z.string().uuid().optional(),
});

// GET - List notifications for current user
export async function GET(request: NextRequest) {
  try {
    console.log('🔔 Notifications API called');
    const token = request.cookies.get('thunder_token')?.value;
    console.log('🔔 Token exists:', !!token);
    
    if (!token) {
      console.log('🔔 No token found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    console.log('🔔 JWT payload:', { userId: payload.userId, role: payload.role });
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const unread_only = searchParams.get('unread_only') === 'true';
    const type = searchParams.get('type');

    let query = supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        message,
        material_type,
        material_id,
        severity,
        is_read,
        created_at
      `)
      .eq('user_id', payload.userId)
      .order('created_at', { ascending: false });

    if (unread_only) {
      query = query.eq('is_read', false);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: notifications, error, count } = await query
      .range((page - 1) * limit, page * limit - 1);

    console.log('🔔 Database query result:', { 
      notificationsCount: notifications?.length, 
      error: error?.message,
      count 
    });

    if (error) {
      console.error('🔔 Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('🔔 Returning notifications:', notifications?.length || 0);
    return NextResponse.json({
      data: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Unexpected error fetching notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new notification
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only admin can create notifications
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = notificationSchema.parse(body);
    
    const supabase = await createClient();

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...validatedData,
        user_id: validatedData.user_id || payload.userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    console.error('Unexpected error creating notification:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
