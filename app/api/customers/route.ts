import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
// Müşteri şeması
const customerSchema = z.object({
  name: z.string().min(1, 'Müşteri adı gerekli'),
  email: z.union([
    z.string().email('Geçerli email adresi gerekli'),
    z.literal(''),
    z.undefined()
  ]).optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  tax_number: z.string().optional(),
  is_active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sadece yönetici, planlama ve depo müşteri listesini görebilir
    if (!['yonetici', 'planlama', 'depo'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'name';
    const order = searchParams.get('order') || 'asc';

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' });

    // Arama
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }

    // Sıralama
    query = query.order(sort, { ascending: order === 'asc' });

    // Sayfalama
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: customers, error, count } = await query;

    if (error) {
      logger.error('Error fetching customers:', error);
      return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }

    return NextResponse.json({
      data: customers || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: unknown) {
    logger.error('Customers fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customers';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sadece yönetici ve planlama müşteri ekleyebilir
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = customerSchema.parse(body);

    const supabase = await createClient();

    // Email varsa unique kontrolü
    if (validatedData.email) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', validatedData.email)
        .single();

      if (existingCustomer) {
        return NextResponse.json({ error: 'Bu email adresi zaten kullanılıyor' }, { status: 400 });
      }
    }

    // Email boş string ise null yap (database için)
    const insertData = {
      ...validatedData,
      email: validatedData.email && validatedData.email.trim() !== '' ? validatedData.email : null,
    };

    const { data: customer, error } = await supabase
      .from('customers')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      logger.error('Error creating customer:', error);
      logger.error('Error details:', { code: error.code, message: error.message, details: error.details, hint: error.hint });
      return NextResponse.json({ error: 'Failed to create customer', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (error: unknown) {
    logger.error('Customer creation error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

