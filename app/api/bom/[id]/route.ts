import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * PUT /api/bom/[id]
 * Update a BOM entry (quantity)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only planlama and yonetici can update BOM
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { quantity_needed } = body;

    if (!quantity_needed || quantity_needed <= 0) {
      return NextResponse.json({ error: 'Geçerli bir miktar girin' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('bom')
      .update({
        quantity_needed,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ BOM update error:', error);
      return NextResponse.json({ error: 'BOM güncellenirken hata oluştu' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ BOM update error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/bom/[id]
 * Delete a BOM entry
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only planlama and yonetici can delete BOM
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('bom')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ BOM delete error:', error);
      return NextResponse.json({ error: 'BOM silinirken hata oluştu' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ BOM delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

