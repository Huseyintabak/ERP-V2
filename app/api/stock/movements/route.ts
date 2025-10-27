import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(request: NextRequest) {
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

    // Only depo, planlama and yonetici can view stock movements
    if (!['depo', 'planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const materialType = searchParams.get('type');
    const materialId = searchParams.get('materialId');
    const movementType = searchParams.get('movementType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    // Build query using the enhanced view
    let query = supabase
      .from('stock_movements_detailed')
      .select('*', { count: 'exact' });

    // Apply filters
    if (materialType && materialType !== 'all') {
      query = query.eq('material_type', materialType);
    }
    if (materialId) {
      query = query.eq('material_id', materialId);
    }
    if (movementType && movementType !== 'all') {
      query = query.eq('movement_type', movementType);
    }

    // Apply pagination and ordering
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching stock movements:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to include movement type labels
    const transformedData = data?.map(movement => ({
      ...movement,
      movement_type_label: getMovementTypeLabel(movement.movement_type),
      movement_source_label: getMovementSourceLabel(movement.movement_source)
    })) || [];

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
    logger.error('Stock movements API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

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

    // Only depo and yonetici can create stock movements
    if (!['depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { 
      material_type, 
      material_id, 
      movement_type, 
      quantity, 
      movement_source,
      description 
    } = await request.json();

    // Validation
    if (!material_type || !material_id || !movement_type || !quantity) {
      return NextResponse.json({ 
        error: 'material_type, material_id, movement_type, and quantity are required' 
      }, { status: 400 });
    }

    if (!['raw', 'semi', 'finished'].includes(material_type)) {
      return NextResponse.json({ 
        error: 'material_type must be one of: raw, semi, finished' 
      }, { status: 400 });
    }

    if (!['giris', 'cikis', 'uretim', 'transfer'].includes(movement_type)) {
      return NextResponse.json({ 
        error: 'movement_type must be one of: giris, cikis, uretim, transfer' 
      }, { status: 400 });
    }

    if (quantity <= 0) {
      return NextResponse.json({ 
        error: 'quantity must be greater than 0' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current stock for the material
    const tableName = material_type === 'raw' ? 'raw_materials' : 
                     material_type === 'semi' ? 'semi_finished_products' : 'finished_products';
    
    const { data: material, error: materialError } = await supabase
      .from(tableName)
      .select('id, quantity')
      .eq('id', material_id)
      .single();

    if (materialError || !material) {
      return NextResponse.json({ 
        error: 'Material not found' 
      }, { status: 404 });
    }

    const currentQuantity = material.quantity;
    let newQuantity = currentQuantity;

    // Calculate new quantity based on movement type
    if (movement_type === 'giris') {
      newQuantity = currentQuantity + quantity;
    } else if (movement_type === 'cikis' || movement_type === 'uretim') {
      if (currentQuantity < quantity) {
        return NextResponse.json({ 
          error: `Insufficient stock. Available: ${currentQuantity}, Requested: ${quantity}` 
        }, { status: 400 });
      }
      newQuantity = currentQuantity - quantity;
    }

    // Update material quantity
    const { error: updateError } = await supabase
      .from(tableName)
      .update({ quantity: newQuantity })
      .eq('id', material_id);

    if (updateError) {
      logger.error('Error updating material quantity:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Create stock movement record
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        material_type,
        material_id,
        movement_type,
        quantity,
        movement_source: movement_source || 'manual',
        user_id: payload.userId,
        before_quantity: currentQuantity,
        after_quantity: newQuantity,
        description: description || `Manual ${movement_type} movement`
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating stock movement:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });

  } catch (error) {
    logger.error('Create stock movement API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Helper functions
function getMovementTypeLabel(movementType: string | null | undefined): string {
  if (!movementType) return 'Bilinmeyen';
  
  const labels = {
    'giris': 'Giriş',
    'cikis': 'Çıkış',
    'uretim': 'Üretim',
    'transfer': 'Transfer'
  };
  return labels[movementType as keyof typeof labels] || movementType;
}

function getMovementSourceLabel(movementSource: string | null | undefined): string {
  if (!movementSource) return 'Manuel';
  
  const labels = {
    'manual': 'Manuel',
    'production': 'Üretim',
    'purchase': 'Satın Alma',
    'transfer': 'Transfer',
    'system': 'Sistem',
    'order': 'Sipariş',
    'inventory': 'Envanter'
  };
  return labels[movementSource as keyof typeof labels] || movementSource;
}
