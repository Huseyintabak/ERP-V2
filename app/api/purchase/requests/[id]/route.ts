import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        payload = { userId: userData.id, role: userData.role };
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

    // Only planlama, depo and yonetici can update purchase requests
    if (!['planlama', 'depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: requestId } = params;
    const { status, notes, approved_quantity } = await request.json();

    if (!status) {
      return NextResponse.json({ 
        error: 'Status is required' 
      }, { status: 400 });
    }

    // Normalize status: 'pending' -> 'beklemede' for database consistency
    const normalizedStatus = status === 'pending' ? 'beklemede' : status;
    
    const validStatuses = ['pending', 'beklemede', 'approved', 'rejected', 'ordered', 'received', 'cancelled', 'iptal_edildi'];
    if (!validStatuses.includes(status) && !validStatuses.includes(normalizedStatus)) {
      return NextResponse.json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current request to check if it exists
    const { data: currentRequest, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json({ 
        error: 'Purchase request not found' 
      }, { status: 404 });
    }

    // Prepare update data (use normalized status for database)
    const updateData: any = {
      status: normalizedStatus,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (approved_quantity !== undefined) {
      updateData.approved_quantity = approved_quantity;
    }

    // Add status-specific fields (use normalized status)
    if (normalizedStatus === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = payload.userId;
    } else if (normalizedStatus === 'ordered') {
      updateData.ordered_at = new Date().toISOString();
      updateData.ordered_by = payload.userId;
    } else if (normalizedStatus === 'received') {
      updateData.received_at = new Date().toISOString();
      updateData.received_by = payload.userId;
    } else if (normalizedStatus === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = payload.userId;
    }

    // Update the request
    const { data, error } = await supabase
      .from('purchase_requests')
      .update(updateData)
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) {
      logger.error('Error updating purchase request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get material details separately (no foreign key relationship)
    let materialName = data.material_name || 'Unknown';
    let materialCode = 'Unknown';
    
    try {
      if (data.material_type === 'raw' || data.material_type === 'raw_materials') {
        const { data: material } = await supabase
          .from('raw_materials')
          .select('name, code')
          .eq('id', data.material_id)
          .single();
        
        if (material) {
          materialName = material.name;
          materialCode = material.code;
        }
      } else if (data.material_type === 'semi_finished' || data.material_type === 'semi') {
        const { data: material } = await supabase
          .from('semi_finished_products')
          .select('name, code')
          .eq('id', data.material_id)
          .single();
        
        if (material) {
          materialName = material.name;
          materialCode = material.code;
        }
      }
    } catch (materialError) {
      logger.error('Error fetching material details:', materialError);
      // Use existing material_name if available
    }

    let notificationTitle = '';
    let notificationMessage = '';
    let notificationSeverity = 'normal';

    switch (normalizedStatus) {
      case 'approved':
        notificationTitle = 'Sipariş Talebi Onaylandı';
        notificationMessage = `${materialName} sipariş talebi onaylandı.`;
        notificationSeverity = 'low';
        break;
      case 'rejected':
        notificationTitle = 'Sipariş Talebi Reddedildi';
        notificationMessage = `${materialName} sipariş talebi reddedildi.`;
        notificationSeverity = 'normal';
        break;
      case 'ordered':
        notificationTitle = 'Sipariş Verildi';
        notificationMessage = `${materialName} siparişi verildi.`;
        notificationSeverity = 'low';
        break;
      case 'received':
        notificationTitle = 'Sipariş Teslim Alındı';
        notificationMessage = `${materialName} siparişi teslim alındı.`;
        notificationSeverity = 'low';
        
        // Increase stock when received (only if not already received before)
        // Check if this is a new "received" status (wasn't received before)
        if (currentRequest.status !== 'received' && normalizedStatus === 'received') {
          // Use approved_quantity if available, otherwise use requested_quantity
          const quantityToAdd = data.approved_quantity || data.requested_quantity || 0;
          
          if (quantityToAdd > 0) {
            try {
              // Determine table name and update stock
              let tableName = '';
              let materialTypeForMovement = '';
              
              // Sadece hammadde için stok güncellemesi yapılır
              if (data.material_type === 'raw' || data.material_type === 'raw_materials') {
                tableName = 'raw_materials';
                materialTypeForMovement = 'raw';
              }
              // Yarı mamul için stok güncellemesi yapılmaz (üretim ürünü)
              
              if (tableName) {
                // Get current stock
                const { data: material, error: materialFetchError } = await supabase
                  .from(tableName)
                  .select('quantity')
                  .eq('id', data.material_id)
                  .single();
                
                if (!materialFetchError && material) {
                  const oldQuantity = parseFloat(material.quantity?.toString() || '0');
                  const newQuantity = oldQuantity + quantityToAdd;
                  
                  // Update stock
                  const { error: stockUpdateError } = await supabase
                    .from(tableName)
                    .update({ quantity: newQuantity })
                    .eq('id', data.material_id);
                  
                  if (stockUpdateError) {
                    logger.error('Error updating stock:', stockUpdateError);
                  } else {
                    // Create stock movement record
                    await supabase
                      .from('stock_movements')
                      .insert({
                        material_type: materialTypeForMovement,
                        material_id: data.material_id,
                        movement_type: 'giris',
                        quantity: quantityToAdd,
                        user_id: payload.userId,
                        description: `Tedarik talebi teslim alındı (Talep ID: ${requestId})`,
                        before_quantity: oldQuantity,
                        after_quantity: newQuantity,
                        movement_source: 'purchase_request'
                      });
                    
                    logger.log(`✅ Stock updated: ${materialName} (+${quantityToAdd}) = ${newQuantity}`);
                    notificationMessage = `${materialName} siparişi teslim alındı ve stok ${quantityToAdd} adet artırıldı.`;
                  }
                }
              }
            } catch (stockError) {
              logger.error('Error processing stock update:', stockError);
              // Don't fail the request update if stock update fails
            }
          }
        }
        break;
      case 'cancelled':
        notificationTitle = 'Sipariş İptal Edildi';
        notificationMessage = `${materialName} siparişi iptal edildi.`;
        notificationSeverity = 'normal';
        break;
    }

    if (notificationTitle) {
      await supabase
        .from('notifications')
        .insert({
          type: 'order_update',
          title: notificationTitle,
          message: notificationMessage,
          severity: notificationSeverity
        });
    }

    // Transform response data
    const transformedData = {
      ...data,
      material_name: materialName,
      material_code: materialCode
    };

    return NextResponse.json({ data: transformedData });

  } catch (error) {
    logger.error('Update purchase request API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        payload = { userId: userData.id, role: userData.role };
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

    // Only yonetici can delete purchase requests
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: requestId } = params;
    const supabase = await createClient();

    // Check if request exists and can be deleted
    const { data: currentRequest, error: fetchError } = await supabase
      .from('purchase_requests')
      .select('id, status')
      .eq('id', requestId)
      .single();

    if (fetchError || !currentRequest) {
      return NextResponse.json({ 
        error: 'Purchase request not found' 
      }, { status: 404 });
    }

    // Only allow deletion of pending/beklemede requests
    if (!['pending', 'beklemede'].includes(currentRequest.status)) {
      return NextResponse.json({ 
        error: 'Only pending requests can be deleted' 
      }, { status: 400 });
    }

    // Delete the request
    const { error } = await supabase
      .from('purchase_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      logger.error('Error deleting purchase request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Purchase request deleted successfully' 
    });

  } catch (error) {
    logger.error('Delete purchase request API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
