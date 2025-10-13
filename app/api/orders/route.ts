import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { orderSchema } from '@/types';

// GET - List Orders
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';

    const supabase = await createClient();
    
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, company, email),
        items:order_items(
          *,
          product:finished_products(id, name, code)
        ),
        created_by:users!orders_created_by_fkey(id, name, email)
      `, { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create Orders (Multiple products for one customer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📝 Orders POST request body:', body);
    
    const validated = orderSchema.parse(body);
    console.log('✅ Orders POST validated:', validated);
    
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    const supabase = await createClient();

    // User context set et (audit log için)
    await supabase.rpc('set_user_context', { user_id: userId });

    // Tek sipariş oluştur ve içine birden fazla ürün ekle
    const { data: orderNumber } = await supabase.rpc('generate_order_number');
    
    // Toplam miktarı hesapla
    const totalQuantity = validated.items.reduce((sum, item) => sum + item.quantity, 0);

    // Sipariş oluştur
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        customer_name: validated.customer_name,
        customer_id: validated.customer_id,
        delivery_date: validated.delivery_date,
        priority: validated.priority,
        assigned_operator_id: validated.assigned_operator_id,
        order_number: orderNumber,
        total_quantity: totalQuantity,
        created_by: userId,
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Sipariş kalemlerini ekle
    const orderItems = validated.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
    }));

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)
      .select(`
        *,
        product:finished_products(id, name, code)
      `);

    if (itemsError) throw itemsError;

    // Tam sipariş bilgilerini döndür
    const fullOrder = {
      ...order,
      items: items,
    };

    return NextResponse.json({
      message: `Sipariş oluşturuldu (${validated.items.length} ürün)`,
      order: fullOrder,
    }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Orders POST error:', error);
    if (error.name === 'ZodError') {
      console.error('❌ Validation errors:', error.errors);
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}