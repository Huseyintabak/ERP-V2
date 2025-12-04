import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { orderSchema } from '@/types';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
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
          product:finished_products(id, name, code, sale_price, unit_price)
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
    logger.log('📝 Orders POST request body:', JSON.stringify(body, null, 2));
    
    // Validation öncesi kontrol
    if (!body.customer_name) {
      logger.error('❌ Missing customer_name');
      return NextResponse.json({ error: 'Müşteri adı gerekli' }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      logger.error('❌ Missing or empty items array');
      return NextResponse.json({ error: 'En az bir ürün seçmelisiniz' }, { status: 400 });
    }
    // delivery_date validation - string, Date objesi veya Excel serial number olabilir
    let deliveryDate = body.delivery_date;
    if (!deliveryDate) {
      logger.error('❌ Missing delivery_date');
      return NextResponse.json({ error: 'Teslim tarihi gerekli' }, { status: 400 });
    }
    
    // Excel serial date'i tarihe çeviren fonksiyon
    const excelSerialToDate = (serial: number): string => {
      // Excel epoch: 1899-12-30 (Excel'de 0 = 1899-12-30)
      // Excel serial date 1 = 1900-01-01
      // Excel'de 1900 yılı artık yıl olarak kabul edilir (yanlış ama Excel'in hatası)
      // Bu yüzden 1 gün çıkarıyoruz: (serial - 1)
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + (serial - 1) * 86400000);
      // YYYY-MM-DD formatında döndür
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Date objesi ise string'e çevir
    if (deliveryDate instanceof Date) {
      deliveryDate = deliveryDate.toISOString().split('T')[0];
    } else if (typeof deliveryDate === 'number') {
      // Excel serial date number ise Date'e çevir
      deliveryDate = excelSerialToDate(deliveryDate);
    } else if (typeof deliveryDate === 'string') {
      deliveryDate = deliveryDate.trim();
      // Boş string kontrolü
      if (deliveryDate === '') {
        logger.error('❌ Empty delivery_date string');
        return NextResponse.json({ error: 'Teslim tarihi gerekli' }, { status: 400 });
      }
      
      // Eğer sadece sayı içeriyorsa (Excel serial date string olarak gelmiş olabilir)
      const numValue = Number(deliveryDate);
      if (!isNaN(numValue) && numValue > 0 && numValue < 1000000 && !deliveryDate.includes('-')) {
        // Muhtemelen Excel serial date (örn: "45852")
        logger.log('📅 Converting Excel serial date to date:', numValue);
        deliveryDate = excelSerialToDate(numValue);
      }
      
      // Tarih formatı kontrolü (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(deliveryDate)) {
        logger.error('❌ Invalid date format:', deliveryDate);
        return NextResponse.json({ error: 'Geçersiz tarih formatı. YYYY-MM-DD formatında olmalı' }, { status: 400 });
      }
    } else {
      // Diğer tipler için string'e çevir ve kontrol et
      const strValue = String(deliveryDate).trim();
      const numValue = Number(strValue);
      if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
        deliveryDate = excelSerialToDate(numValue);
      } else {
        deliveryDate = strValue;
      }
      
      if (deliveryDate === '' || deliveryDate === 'undefined' || deliveryDate === 'null') {
        logger.error('❌ Invalid delivery_date type:', typeof body.delivery_date, body.delivery_date);
        return NextResponse.json({ error: 'Geçersiz teslim tarihi formatı' }, { status: 400 });
      }
    }
    
    // Body'yi güncelle
    body.delivery_date = deliveryDate;
    if (!body.priority || !['dusuk', 'orta', 'yuksek'].includes(body.priority)) {
      logger.error('❌ Invalid priority:', body.priority);
      return NextResponse.json({ error: 'Geçerli öncelik seçin (dusuk/orta/yuksek)' }, { status: 400 });
    }
    
    // UUID format kontrolü için regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Items validation
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];
      if (!item.product_id) {
        logger.error(`❌ Item ${i} missing product_id`);
        return NextResponse.json({ error: `Ürün ${i + 1}: Ürün ID gerekli` }, { status: 400 });
      }
      if (!item.quantity || item.quantity < 1) {
        logger.error(`❌ Item ${i} invalid quantity:`, item.quantity);
        return NextResponse.json({ error: `Ürün ${i + 1}: Miktar en az 1 olmalı` }, { status: 400 });
      }
      // UUID format kontrolü
      if (!uuidRegex.test(item.product_id)) {
        logger.error(`❌ Item ${i} invalid product_id format:`, item.product_id);
        return NextResponse.json({ error: `Ürün ${i + 1}: Geçersiz ürün ID formatı` }, { status: 400 });
      }
    }
    
    // customer_id UUID kontrolü
    if (body.customer_id && !uuidRegex.test(body.customer_id)) {
      logger.error('❌ Invalid customer_id format:', body.customer_id);
      return NextResponse.json({ error: 'Geçersiz müşteri ID formatı' }, { status: 400 });
    }
    
    // assigned_operator_id UUID kontrolü
    if (body.assigned_operator_id && !uuidRegex.test(body.assigned_operator_id)) {
      logger.error('❌ Invalid assigned_operator_id format:', body.assigned_operator_id);
      return NextResponse.json({ error: 'Geçersiz operatör ID formatı' }, { status: 400 });
    }
    
    // Zod validation
    let validated;
    try {
      validated = orderSchema.parse(body);
      logger.log('✅ Orders POST validated:', validated);
    } catch (error: any) {
      logger.error('❌ Zod validation error:', error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return NextResponse.json({ 
          error: 'Validation error', 
          details: errorMessages 
        }, { status: 400 });
      }
      throw error;
    }
    
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
      data: fullOrder,
      order: fullOrder, // Backward compatibility
    }, { status: 201 });
  } catch (error: any) {
    logger.error('❌ Orders POST error:', error);
    if (error.name === 'ZodError') {
      logger.error('❌ Validation errors:', error.errors);
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}