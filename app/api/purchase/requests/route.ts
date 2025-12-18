import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
  try {
    // Authentication check - try x-user-id header first, then JWT token
    const userId = request.headers.get('x-user-id');
    let payload = null;

    if (userId) {
      // Use x-user-id header for authentication
      const supabase = await createClient();
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();
      
      if (userData) {
        payload = { id: userData.id, role: userData.role };
      }
    } else {
      // Fallback to JWT token
      const token = request.cookies.get('thunder_token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      payload = await verifyJWT(token);
    }

    if (!payload) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Only planlama, depo and yonetici can view purchase requests
    if (!['planlama', 'depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Build query - just get purchase requests first
    // Sadece hammadde talepleri göster (yarı mamul üretim ürünü, sipariş verilemez)
    let query = supabase
      .from('purchase_requests')
      .select('*', { count: 'exact' })
      .neq('status', 'iptal_edildi') // İptal edilen talepleri hariç tut
      .in('material_type', ['raw', 'raw_materials']); // Sadece hammaddeler

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }

    // Apply pagination and ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching purchase requests:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get material details separately for each request
    const transformedData = await Promise.all(
      (data || []).map(async (request) => {
        let materialName = 'Unknown';
        let materialCode = 'Unknown';
        let materialUnit = 'pcs';

        try {
          if (request.material_type === 'raw') {
            const { data: material } = await supabase
              .from('raw_materials')
              .select('name, code, unit')
              .eq('id', request.material_id)
              .single();
            
            if (material) {
              materialName = material.name;
              materialCode = material.code;
              materialUnit = material.unit;
            }
          } else if (request.material_type === 'semi_finished') {
            const { data: material } = await supabase
              .from('semi_finished_products')
              .select('name, code, unit')
              .eq('id', request.material_id)
              .single();
            
            if (material) {
              materialName = material.name;
              materialCode = material.code;
              materialUnit = material.unit;
            }
          } else if (request.material_type === 'finished') {
            const { data: material } = await supabase
              .from('finished_products')
              .select('name, code, unit')
              .eq('id', request.material_id)
              .single();
            
            if (material) {
              materialName = material.name;
              materialCode = material.code;
              materialUnit = material.unit;
            }
          }
        } catch (materialError) {
          logger.error('Error fetching material details:', materialError);
          // Malzeme bulunamadığında daha açıklayıcı mesaj
          materialName = `[Silinmiş ${request.material_type}]`;
          materialCode = `[ID: ${request.material_id}]`;
          materialUnit = 'pcs';
        }

        return {
          ...request,
          material_name: materialName,
          material_code: materialCode,
          material_unit: materialUnit
        };
      })
    );

    return NextResponse.json({
      data: transformedData,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    logger.error('Purchase requests API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check - try x-user-id header first, then JWT token
    const userId = request.headers.get('x-user-id');
    let payload = null;

    if (userId) {
      // Use x-user-id header for authentication
      const supabase = await createClient();
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .single();
      
      if (userData) {
        payload = { id: userData.id, role: userData.role };
      }
    } else {
      // Fallback to JWT token
      const token = request.cookies.get('thunder_token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      payload = await verifyJWT(token);
    }

    if (!payload) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
    }

    // Only planlama, depo and yonetici can create purchase requests
    if (!['planlama', 'depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { material_type, material_id, current_stock, requested_quantity, priority = 'normal', notes } = await request.json();

    // Validation
    if (!material_type || !material_id || current_stock === undefined || !requested_quantity) {
      return NextResponse.json({ 
        error: 'material_type, material_id, current_stock, and requested_quantity are required' 
      }, { status: 400 });
    }

    // Yarı mamul için purchase request oluşturulamaz (üretim ürünü)
    if (material_type !== 'raw') {
      return NextResponse.json({ 
        error: 'Sadece hammadde için tedarik talebi oluşturulabilir. Yarı mamul üretim ürünüdür.' 
      }, { status: 400 });
    }

    if (!['low', 'normal', 'high', 'critical'].includes(priority)) {
      return NextResponse.json({ 
        error: 'priority must be one of: low, normal, high, critical' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if material exists
    const tableName = material_type === 'raw' ? 'raw_materials' : 'semi_finished_products';
    const { data: material, error: materialError } = await supabase
      .from(tableName)
      .select('id, name, code')
      .eq('id', material_id)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ 
        error: 'Material not found' 
      }, { status: 404 });
    }

    // Create purchase request
    const { data, error } = await supabase
      .from('purchase_requests')
      .insert({
        material_type,
        material_id,
        current_stock,
        requested_quantity,
        priority,
        notes: notes || `Manual purchase request for ${material.name}`,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating purchase request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert({
        type: 'critical_stock',
        title: 'Yeni Sipariş Talebi',
        message: `${material.name} için sipariş talebi oluşturuldu.`,
        severity: priority === 'critical' ? 'critical' : 'normal'
      });

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    logger.error('Create purchase request API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
