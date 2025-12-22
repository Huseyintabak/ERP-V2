import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: Awaited<ReturnType<typeof verifyJWT>>;
    try {
      payload = await verifyJWT(token);
    } catch (authError) {
      logger.warn('Unauthorized semi production orders GET attempt:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch orders with product and operator relationships
    const { data: orders, error } = await supabase
      .from('semi_production_orders')
      .select(`
        *,
        product:semi_finished_products(
          id,
          name,
          code,
          unit
        ),
        assigned_operator:users!semi_production_orders_assigned_operator_id_fkey(
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching semi production orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: orders });
  } catch (error) {
    logger.error('Error in semi production orders GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: Awaited<ReturnType<typeof verifyJWT>>;
    try {
      payload = await verifyJWT(token);
    } catch (authError) {
      logger.warn('Unauthorized semi production orders POST attempt:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.log('👤 Semi-order POST payload:', payload);

    // Only managers and planlama can create semi production orders
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { product_id, planned_quantity, priority, assigned_operator_id, notes } = body;

    if (!product_id || !planned_quantity || planned_quantity <= 0) {
      return NextResponse.json({ error: 'Product ID and valid quantity required' }, { status: 400 });
    }

    const supabase = await createClient();

    logger.log('📝 Semi-order POST insert payload:', {
      product_id,
      planned_quantity,
      priority,
      assigned_operator_id,
      notes,
      created_by: payload.userId,
    });

    // 1. Önce BOM'u kontrol et ve eksik stokları bul
    const { data: bomItems, error: bomError } = await supabase
      .from('semi_bom')
      .select('*')
      .eq('semi_product_id', product_id);

    if (bomError) {
      logger.error('BOM fetch error:', bomError);
      logger.error('Product ID:', product_id);
      logger.error('BOM Error Code:', bomError.code);
      logger.error('BOM Error Details:', bomError.details);
      logger.error('BOM Error Hint:', bomError.hint);
      
      // Daha açıklayıcı hata mesajı
      let errorMessage = 'BOM bilgileri alınamadı';
      let errorDetails = bomError.message || 'Bilinmeyen hata';
      
      if (bomError.code === 'PGRST116') {
        errorMessage = 'Bu ürün için BOM tanımlı değil';
        errorDetails = 'semi_bom tablosunda bu ürün için kayıt bulunamadı. Lütfen önce BOM oluşturun.';
      } else if (bomError.message?.includes('relation') || bomError.message?.includes('does not exist')) {
        errorMessage = 'BOM tablosu bulunamadı';
        errorDetails = 'semi_bom tablosu mevcut değil. Lütfen veritabanı yöneticisi ile iletişime geçin.';
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: errorDetails,
        bom_error_code: bomError.code,
        bom_error_message: bomError.message,
        product_id: product_id
      }, { status: 500 });
    }

    if (!bomItems || bomItems.length === 0) {
      return NextResponse.json({ 
        error: 'Bu ürün için BOM tanımlı değil. Önce BOM oluşturun.',
        details: 'semi_bom tablosunda bu ürün için kayıt bulunamadı'
      }, { status: 400 });
    }

    // 2. Her malzeme için stok kontrolü yap
    const insufficientMaterials: Array<{
      material_name: string;
      material_code: string;
      material_type: string;
      required_quantity: number;
      available_stock: number;
      shortage: number;
      unit: string;
    }> = [];

    for (const bomItem of bomItems) {
      const quantityPerUnit = bomItem.quantity || 0;
      const requiredQuantity = quantityPerUnit * planned_quantity;
      
      let material: any = null;
      let availableStock = 0;
      let materialName = '';
      let materialCode = '';
      let materialUnit = '';

      // Malzeme bilgilerini manuel olarak çek (foreign key join yerine)
      if (bomItem.material_type === 'raw') {
        const { data: rawMaterial, error: rawError } = await supabase
          .from('raw_materials')
          .select('id, name, code, quantity, reserved_quantity, unit')
          .eq('id', bomItem.material_id)
          .single();

        if (rawError) {
          logger.error(`Raw material fetch error for ${bomItem.material_id}:`, rawError);
          insufficientMaterials.push({
            material_name: 'Bilinmeyen Hammadde',
            material_code: bomItem.material_id.slice(0, 8),
            material_type: 'Hammadde',
            required_quantity: requiredQuantity,
            available_stock: 0,
            shortage: requiredQuantity,
            unit: 'kg',
          });
          continue;
        }

        if (rawMaterial) {
          materialName = rawMaterial.name || 'Bilinmeyen';
          materialCode = rawMaterial.code || 'N/A';
          materialUnit = rawMaterial.unit || 'kg';
          const currentStock = rawMaterial.quantity || 0;
          const reservedStock = rawMaterial.reserved_quantity || 0;
          availableStock = currentStock - reservedStock;
        }
      } else if (bomItem.material_type === 'semi') {
        const { data: semiMaterial, error: semiError } = await supabase
          .from('semi_finished_products')
          .select('id, name, code, quantity, reserved_quantity, unit')
          .eq('id', bomItem.material_id)
          .single();

        if (semiError) {
          logger.error(`Semi material fetch error for ${bomItem.material_id}:`, semiError);
          insufficientMaterials.push({
            material_name: 'Bilinmeyen Yarı Mamul',
            material_code: bomItem.material_id.slice(0, 8),
            material_type: 'Yarı Mamul',
            required_quantity: requiredQuantity,
            available_stock: 0,
            shortage: requiredQuantity,
            unit: 'adet',
          });
          continue;
        }

        if (semiMaterial) {
          materialName = semiMaterial.name || 'Bilinmeyen';
          materialCode = semiMaterial.code || 'N/A';
          materialUnit = semiMaterial.unit || 'adet';
          const currentStock = semiMaterial.quantity || 0;
          const reservedStock = semiMaterial.reserved_quantity || 0;
          availableStock = currentStock - reservedStock;
        }
      }

      if (availableStock < requiredQuantity) {
        insufficientMaterials.push({
          material_name: materialName,
          material_code: materialCode,
          material_type: bomItem.material_type === 'raw' ? 'Hammadde' : 'Yarı Mamul',
          required_quantity: requiredQuantity,
          available_stock: availableStock,
          shortage: requiredQuantity - availableStock,
          unit: materialUnit,
        });
      }
    }

    // 3. Eğer eksik stok varsa, detaylı hata mesajı döndür
    if (insufficientMaterials.length > 0) {
      const materialsList = insufficientMaterials.map(m => 
        `• ${m.material_name} (${m.material_code}) - ${m.material_type}\n` +
        `  Gerekli: ${m.required_quantity} ${m.unit}\n` +
        `  Mevcut: ${m.available_stock} ${m.unit}\n` +
        `  Eksik: ${m.shortage} ${m.unit}`
      ).join('\n\n');

      return NextResponse.json({ 
        error: 'Yeterli stok bulunmuyor',
        details: `Aşağıdaki malzemelerde stok yetersizliği var:\n\n${materialsList}\n\nLütfen stok yönetimi sayfasından bu malzemelerin stok miktarını artırın.`,
        insufficient_materials: insufficientMaterials
      }, { status: 400 });
    }

    // 4. Stoklar yeterliyse siparişi oluştur
    // Generate order number
    const { data: lastOrder } = await supabase
      .from('semi_production_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const orderNumber = lastOrder?.order_number 
      ? `SMP-${String(parseInt(lastOrder.order_number.split('-')[1]) + 1).padStart(4, '0')}`
      : 'SMP-0001';

    // Create semi production order
    const { data: order, error } = await supabase
      .from('semi_production_orders')
      .insert({
        order_number: orderNumber,
        product_id,
        planned_quantity,
        produced_quantity: 0,
        status: 'planlandi',
        priority: priority || 'orta',
        assigned_operator_id: assigned_operator_id || null,
        notes: notes || null,
        created_by: payload.userId
      })
      .select(`
        *,
        product:semi_finished_products(
          id,
          name,
          code,
          unit
        ),
        assigned_operator:users!semi_production_orders_assigned_operator_id_fkey(
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      logger.error('Error creating semi production order:', error);
      if (error.code === '23514') {
        // Fallback: Eğer constraint hatası alırsak, BOM kontrolünden gelen bilgileri kullan
        return NextResponse.json({ 
          error: 'Yeterli stok bulunmuyor',
          details: 'Database constraint hatası. Lütfen stok durumunu kontrol edin.',
          insufficient_materials: insufficientMaterials.length > 0 ? insufficientMaterials : undefined
        }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create order', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    logger.error('Error in semi production orders POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
