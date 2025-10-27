import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
// Müşteri güncelleme şeması
const customerUpdateSchema = z.object({
  name: z.string().min(1, 'Müşteri adı gerekli').optional(),
  email: z.string().email('Geçerli email adresi gerekli').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  tax_number: z.string().optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    // Sadece yönetici ve planlama müşteri detayını görebilir
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Error fetching customer:', error);
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error: unknown) {
    logger.error('Customer fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

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
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    // Sadece yönetici ve planlama müşteri güncelleyebilir
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = customerUpdateSchema.parse(body);

    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    // Email varsa unique kontrolü (kendi kaydı hariç)
    if (validatedData.email) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', validatedData.email)
        .neq('id', id)
        .single();

      if (existingCustomer) {
        return NextResponse.json({ error: 'Bu email adresi zaten kullanılıyor' }, { status: 400 });
      }
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .update(validatedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating customer:', error);
      return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
    }

    return NextResponse.json({ customer });
  } catch (error: unknown) {
    logger.error('Customer update error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to update customer';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

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
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    // Sadece yönetici ve planlama müşteri silebilir
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    // Müşterinin siparişleri var mı kontrol et
    const { data: orders } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', id)
      .limit(1);

    if (orders && orders.length > 0) {
      return NextResponse.json({
        error: 'Bu müşterinin siparişleri var. Önce siparişleri silin.'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting customer:', error);
      return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error: unknown) {
    logger.error('Customer deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete customer';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

