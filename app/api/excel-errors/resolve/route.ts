import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

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
    const { error_id, resolution_notes } = body;

    if (!error_id) {
      return NextResponse.json({ error: 'Error ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // Hatayı çözüldü olarak işaretle
    const { data: result, error } = await supabase
      .rpc('resolve_excel_error', {
        p_error_id: error_id,
        p_resolved_by: payload.userId,
        p_resolution_notes: resolution_notes
      });

    if (error) {
      console.error('Error resolving excel error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result });

  } catch (error: any) {
    console.error('Error in excel error resolution:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
