import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
const startTaskSchema = z.object({
  planId: z.string().uuid(),
  quantity: z.number().positive().optional(),
});

const completeTaskSchema = z.object({
  planId: z.string().uuid(),
  quantity: z.number().positive(),
  barcode: z.string().optional(),
});

const pauseTaskSchema = z.object({
  planId: z.string().uuid(),
  reason: z.string().optional(),
});

const breakSchema = z.object({
  breakType: z.enum(['lunch', 'rest', 'other']),
  duration: z.number().positive().optional(),
});

// POST /api/production/actions - Handle different action types
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only operators can perform actions
    if (payload.role !== 'operator') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operatorId = payload.userId;
    const body = await request.json();
    const { action } = body;

    const supabase = await createClient();
    const adminSupabase = await createAdminClient();

    switch (action) {
      case 'start':
        return await handleStartTask(supabase, adminSupabase, operatorId, body);
      case 'complete':
        return await handleCompleteTask(supabase, adminSupabase, operatorId, body);
      case 'pause':
        return await handlePauseTask(supabase, adminSupabase, operatorId, body);
      case 'break':
        return await handleBreak(supabase, adminSupabase, operatorId, body);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    logger.error('Production actions API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function handleStartTask(supabase: any, adminSupabase: any, operatorId: string, body: any) {
  try {
    const { planId, quantity } = startTaskSchema.parse(body);

    // Verify the task is assigned to this operator
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .select('*')
      .eq('id', planId)
      .eq('assigned_operator_id', operatorId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 });
    }

    if (plan.status !== 'planlandi') {
      return NextResponse.json({ error: 'Task is not in planned status' }, { status: 400 });
    }

    // Update production plan status
    const { error: updateError } = await adminSupabase
      .from('production_plans')
      .update({
        status: 'devam_ediyor',
        started_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (updateError) {
      logger.error('Error starting task:', updateError);
      return NextResponse.json({ error: 'Failed to start task' }, { status: 500 });
    }

    // Update operator status
    await adminSupabase
      .from('operators')
      .update({ current_status: 'active' })
      .eq('id', operatorId);

    return NextResponse.json({ 
      message: 'Task started successfully',
      planId 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    throw error;
  }
}

async function handleCompleteTask(supabase: any, adminSupabase: any, operatorId: string, body: any) {
  try {
    const { planId, quantity, barcode } = completeTaskSchema.parse(body);

    // Verify the task is assigned to this operator and in progress
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .select('*')
      .eq('id', planId)
      .eq('assigned_operator_id', operatorId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 });
    }

    if (plan.status !== 'devam_ediyor') {
      return NextResponse.json({ error: 'Task is not in progress' }, { status: 400 });
    }

    // Update production plan status and quantity
    const { error: updateError } = await adminSupabase
      .from('production_plans')
      .update({
        status: 'tamamlandi',
        completed_at: new Date().toISOString(),
        produced_quantity: (plan.produced_quantity || 0) + quantity,
      })
      .eq('id', planId);

    if (updateError) {
      logger.error('Error completing task:', updateError);
      return NextResponse.json({ error: 'Failed to complete task' }, { status: 500 });
    }

    // Create production log entry
    const { error: logError } = await adminSupabase
      .from('production_logs')
      .insert({
        plan_id: planId,
        operator_id: operatorId,
        barcode_scanned: barcode || 'manual',
        quantity_produced: quantity,
      });

    if (logError) {
      logger.error('Error creating production log:', logError);
      // Don't fail the request, just log the error
    }

    // Update operator status to idle
    await adminSupabase
      .from('operators')
      .update({ current_status: 'idle' })
      .eq('id', operatorId);

    return NextResponse.json({ 
      message: 'Task completed successfully',
      planId,
      quantity 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    throw error;
  }
}

async function handlePauseTask(supabase: any, adminSupabase: any, operatorId: string, body: any) {
  try {
    const { planId, reason } = pauseTaskSchema.parse(body);

    // Verify the task is assigned to this operator
    const { data: plan, error: planError } = await supabase
      .from('production_plans')
      .select('*')
      .eq('id', planId)
      .eq('assigned_operator_id', operatorId)
      .single();

    if (planError || !plan) {
      return NextResponse.json({ error: 'Task not found or not assigned to you' }, { status: 404 });
    }

    if (plan.status !== 'devam_ediyor') {
      return NextResponse.json({ error: 'Task is not in progress' }, { status: 400 });
    }

    // Update production plan status
    const { error: updateError } = await adminSupabase
      .from('production_plans')
      .update({
        status: 'duraklatildi',
      })
      .eq('id', planId);

    if (updateError) {
      logger.error('Error pausing task:', updateError);
      return NextResponse.json({ error: 'Failed to pause task' }, { status: 500 });
    }

    // Update operator status to idle
    await adminSupabase
      .from('operators')
      .update({ current_status: 'idle' })
      .eq('id', operatorId);

    return NextResponse.json({ 
      message: 'Task paused successfully',
      planId,
      reason 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    throw error;
  }
}

async function handleBreak(supabase: any, adminSupabase: any, operatorId: string, body: any) {
  try {
    const { breakType, duration } = breakSchema.parse(body);

    // Update operator status to break
    const { error: updateError } = await adminSupabase
      .from('operators')
      .update({ current_status: 'break' })
      .eq('id', operatorId);

    if (updateError) {
      logger.error('Error updating operator status:', updateError);
      return NextResponse.json({ error: 'Failed to start break' }, { status: 500 });
    }

    // Create break log entry (if operator_breaks table exists)
    try {
      await adminSupabase
        .from('operator_breaks')
        .insert({
          operator_id: operatorId,
          break_type: breakType,
          duration_minutes: duration,
        });
    } catch (breakLogError) {
      // Table might not exist yet, just log the error
      logger.log('Break log table not available:', breakLogError);
    }

    return NextResponse.json({ 
      message: 'Break started successfully',
      breakType,
      duration 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    throw error;
  }
}
