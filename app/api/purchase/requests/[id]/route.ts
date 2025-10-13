import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Only planlama, depo and yonetici can update purchase requests
    if (!['planlama', 'depo', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestId = params.id;
    const { status, notes, approved_quantity } = await request.json();

    if (!status) {
      return NextResponse.json({ 
        error: 'Status is required' 
      }, { status: 400 });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'ordered', 'received', 'cancelled'];
    if (!validStatuses.includes(status)) {
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

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    if (approved_quantity !== undefined) {
      updateData.approved_quantity = approved_quantity;
    }

    // Add status-specific fields
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = payload.userId;
    } else if (status === 'ordered') {
      updateData.ordered_at = new Date().toISOString();
      updateData.ordered_by = payload.userId;
    } else if (status === 'received') {
      updateData.received_at = new Date().toISOString();
      updateData.received_by = payload.userId;
    } else if (status === 'rejected') {
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = payload.userId;
    }

    // Update the request
    const { data, error } = await supabase
      .from('purchase_requests')
      .update(updateData)
      .eq('id', requestId)
      .select(`
        *,
        material_info:raw_materials(name, code),
        material_semi_info:semi_finished_products(name, code)
      `)
      .single();

    if (error) {
      console.error('Error updating purchase request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create notification based on status change
    const materialName = data.material_type === 'raw' 
      ? data.material_info?.name 
      : data.material_semi_info?.name;

    let notificationTitle = '';
    let notificationMessage = '';
    let notificationSeverity = 'normal';

    switch (status) {
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
      material_name: data.material_type === 'raw' 
        ? data.material_info?.name 
        : data.material_semi_info?.name,
      material_code: data.material_type === 'raw' 
        ? data.material_info?.code 
        : data.material_semi_info?.code,
      material_info: undefined,
      material_semi_info: undefined
    };

    return NextResponse.json({ data: transformedData });

  } catch (error) {
    console.error('Update purchase request API error:', error);
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
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only yonetici can delete purchase requests
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestId = params.id;
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

    // Only allow deletion of pending requests
    if (currentRequest.status !== 'pending') {
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
      console.error('Error deleting purchase request:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Purchase request deleted successfully' 
    });

  } catch (error) {
    console.error('Delete purchase request API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
