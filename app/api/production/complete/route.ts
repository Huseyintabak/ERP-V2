import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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

    // Only planlama and yonetici can complete production
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { productionPlanId } = await request.json();

    if (!productionPlanId) {
      return NextResponse.json({ error: 'Production plan ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Call the complete_production function
    const { data, error } = await supabase.rpc('complete_production', {
      production_plan_id: productionPlanId
    });

    if (error) {
      console.error('Production completion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if the function returned success
    if (!data || !data.success) {
      return NextResponse.json({ 
        error: data?.error || 'Production completion failed' 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Production completed successfully',
      data: data
    });

  } catch (error) {
    console.error('Production complete API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
