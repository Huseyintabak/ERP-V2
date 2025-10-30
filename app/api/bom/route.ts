import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
// GET - List BOM for a product
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('product_id');

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data: bomItems, error } = await supabase
      .from('bom')
      .select(`
        id,
        material_type,
        material_id,
        quantity_needed,
        raw_materials!bom_material_id_fkey(
          id,
          code,
          name,
          quantity,
          reserved_quantity
        ),
        semi_finished_products!bom_material_id_fkey(
          id,
          code,
          name,
          quantity,
          reserved_quantity
        )
      `)
      .eq('finished_product_id', productId);

    if (error) {
      logger.error('BOM fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch BOM' }, { status: 500 });
    }

    return NextResponse.json({ data: bomItems });
  } catch (error: any) {
    logger.error('BOM API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create BOM item
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only managers and planlama can create BOM
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { finished_product_id, product_type, material_type, material_id, quantity_needed } = body;

    if (!finished_product_id || !material_type || !material_id || !quantity_needed) {
      return NextResponse.json({ 
        error: 'Missing required fields: finished_product_id, material_type, material_id, quantity_needed' 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Ürün tipine göre doğru tabloya ekle
    let bomItem = null;
    let error = null;

    if (product_type === 'semi') {
      // Yarımmamül ürün için semi_bom tablosuna ekle
      const { data, error: semiError } = await supabase
        .from('semi_bom')
        .insert({
          semi_product_id: finished_product_id,
          material_type,
          material_id,
          quantity: quantity_needed
        })
        .select()
        .single();
      
      bomItem = data;
      error = semiError;
    } else {
      // Nihai ürün için bom tablosuna ekle
      const { data, error: bomError } = await supabase
        .from('bom')
        .insert({
          finished_product_id,
          material_type,
          material_id,
          quantity_needed
        })
        .select()
        .single();
      
      bomItem = data;
      error = bomError;
    }

    if (error) {
      logger.error('BOM creation error:', error);
      // Eğer semi_bom tablosu yoksa, kullanıcıya bilgi ver
      if (error.message.includes('semi_bom') || error.message.includes('Could not find the table')) {
        return NextResponse.json({ 
          error: 'Yarımmamül BOM tablosu henüz oluşturulmamış. Lütfen sistem yöneticisi ile iletişime geçin.' 
        }, { status: 500 });
      }
      return NextResponse.json({ error: 'Failed to create BOM item' }, { status: 500 });
    }

    return NextResponse.json({ data: bomItem }, { status: 201 });
  } catch (error: any) {
    logger.error('BOM creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update BOM item
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only managers and planlama can update BOM
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get('id');
    
    if (!bomId) {
      return NextResponse.json({ error: 'BOM ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { quantity_needed } = body;

    if (!quantity_needed) {
      return NextResponse.json({ error: 'quantity_needed is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Önce BOM kaydının hangi tabloda olduğunu kontrol et
    const { data: bomRecord, error: bomError } = await supabase
      .from('bom')
      .select('id')
      .eq('id', bomId)
      .single();

    let updateResult = null;
    let updateError = null;

    if (bomRecord) {
      // Nihai ürün BOM'u
      const { data, error } = await supabase
        .from('bom')
        .update({ quantity_needed })
        .eq('id', bomId)
        .select()
        .single();
      
      updateResult = data;
      updateError = error;
    } else {
      // Yarımmamül BOM'u
      const { data: semiRecord } = await supabase
        .from('semi_bom')
        .select('id')
        .eq('id', bomId)
        .single();

      if (!semiRecord) {
        return NextResponse.json({ error: 'BOM item not found' }, { status: 404 });
      }

      const { data, error } = await supabase
        .from('semi_bom')
        .update({ quantity: quantity_needed })
        .eq('id', bomId)
        .select()
        .single();
      
      updateResult = data;
      updateError = error;
    }

    if (updateError) {
      logger.error('BOM update error:', updateError);
      return NextResponse.json({ error: 'Failed to update BOM item' }, { status: 500 });
    }

    return NextResponse.json({ data: updateResult });
  } catch (error: any) {
    logger.error('BOM update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete BOM item
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only managers and planlama can delete BOM
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get('id');
    
    if (!bomId) {
      return NextResponse.json({ error: 'BOM ID is required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Önce BOM kaydının hangi tabloda olduğunu kontrol et
    const { data: bomRecord, error: bomError } = await supabase
      .from('bom')
      .select('id')
      .eq('id', bomId)
      .single();

    let deleteResult = null;
    let deleteError = null;

    if (bomRecord) {
      // Nihai ürün BOM'u
      const { data, error } = await supabase
        .from('bom')
        .delete()
        .eq('id', bomId)
        .select()
        .single();
      
      deleteResult = data;
      deleteError = error;
    } else {
      // Yarımmamül BOM'u
      const { data, error } = await supabase
        .from('semi_bom')
        .delete()
        .eq('id', bomId)
        .select()
        .single();
      
      deleteResult = data;
      deleteError = error;
    }

    if (deleteError) {
      logger.error('BOM delete error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete BOM item' }, { status: 500 });
    }

    return NextResponse.json({ message: 'BOM item deleted successfully' });
  } catch (error: any) {
    logger.error('BOM delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}