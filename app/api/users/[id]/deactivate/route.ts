import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
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
    
    // Only admin can deactivate users
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    // Cannot deactivate yourself
    if (payload.userId === id) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 });
    }

    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    // Check if target user exists
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, is_active, role')
      .eq('id', id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!targetUser.is_active) {
      return NextResponse.json({ error: 'User is already inactive' }, { status: 400 });
    }

    // Deactivate user
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      logger.error('Error deactivating user:', updateError);
      return NextResponse.json({ error: 'Failed to deactivate user' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'User deactivated successfully',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
        role: targetUser.role,
        is_active: false,
      },
    });
  } catch (error: any) {
    logger.error('Unexpected error deactivating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

