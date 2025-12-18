import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = params;
    const supabase = await createClient();

    const { data: notification, error } = await supabase
      .from('notifications')
      .select(`
        id,
        title,
        message,
        type,
        is_read,
        created_at,
        user_id,
        users!notifications_user_id_fkey (
          id,
          name,
          email
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Users can only see their own notifications, or admin can see all
    if (payload.userId !== notification.user_id && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(notification);
  } catch (error) {
    logger.error('Error fetching notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = params;
    const supabase = await createClient();

    // Safe JSON parsing
    let requestBody;
    try {
      const text = await request.text();
      requestBody = text ? JSON.parse(text) : {};
    } catch (parseError) {
      logger.error('JSON parse error:', parseError);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { is_read } = requestBody;

    // Users can only update their own notifications, or admin can update all
    const { data: existingNotification, error: fetchError } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingNotification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    if (payload.userId !== existingNotification.user_id && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({
        is_read
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 400 });
    }

    return NextResponse.json(notification);
  } catch (error) {
    logger.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = params;
    const supabase = await createClient();

    const { title, message, type, is_read } = await request.json();

    // Users can only update their own notifications, or admin can update all
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (payload.userId !== existingNotification?.user_id && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .update({
        title,
        message,
        type,
        is_read,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 400 });
    }

    return NextResponse.json(notification);
  } catch (error) {
    logger.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = params;
    const supabase = await createClient();

    // Users can only delete their own notifications, or admin can delete all
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('user_id')
      .eq('id', id)
      .single();

    if (payload.userId !== existingNotification?.user_id && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 400 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}