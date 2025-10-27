import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

import { logger } from '@/lib/utils/logger';
const userUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['yonetici', 'planlama', 'depo', 'operator']).optional(),
  is_active: z.boolean().optional(),
});

// GET - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const supabase = await createClient();

    // Users can only see their own profile, or admin can see all
    if (payload.userId !== id && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        is_active,
        created_at,
        updated_at,
        operators (
          series,
          location,
          experience_years,
          daily_capacity,
          hourly_rate
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Error fetching user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    logger.error('Unexpected error fetching user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Users can only update their own profile, or admin can update all
    if (payload.userId !== id && payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = userUpdateSchema.parse(body);
    
    const supabase = await createClient();

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is already taken by another user
    if (validatedData.email) {
      const { data: emailExists } = await supabase
        .from('users')
        .select('id')
        .eq('email', validatedData.email)
        .neq('id', id)
        .single();

      if (emailExists) {
        return NextResponse.json({ error: 'Email already taken' }, { status: 400 });
      }
    }

    const updateData: any = { ...validatedData };
    
    // Hash password if provided
    if (validatedData.password) {
      updateData.password_hash = await bcrypt.hash(validatedData.password, 12);
      delete updateData.password;
    }

    // Non-admin users cannot change their role
    if (payload.role !== 'yonetici' && validatedData.role) {
      delete updateData.role;
    }

    // Non-admin users cannot change their active status
    if (payload.role !== 'yonetici' && validatedData.is_active !== undefined) {
      delete updateData.is_active;
    }

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        name,
        email,
        role,
        is_active,
        created_at,
        updated_at
      `)
      .single();

    if (error) {
      logger.error('Error updating user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.errors }, { status: 400 });
    }
    logger.error('Unexpected error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only admin can delete users
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    
    // Admin cannot delete themselves
    if (payload.userId === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if user has any active productions
    const { data: activeProductions } = await supabase
      .from('production_plans')
      .select('id')
      .eq('assigned_operator_id', id)
      .in('status', ['planlandi', 'devam_ediyor'])
      .limit(1);

    if (activeProductions && activeProductions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete user with active productions' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting user:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    logger.error('Unexpected error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
