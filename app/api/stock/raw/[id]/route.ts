import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await verifyJWT(token);
    const { id } = params;
    const supabase = await createClient();

    const { data: material, error } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 });
    }

    return NextResponse.json(material);
  } catch (error) {
    logger.error('Error fetching raw material:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = params;
    const supabase = await createClient();

    // Only managers and planlama can update materials
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData = await request.json();

    const { data: material, error } = await supabase
      .from('raw_materials')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('❌ Update error:', error);
      return NextResponse.json({ 
        error: 'Güncelleme başarısız', 
        details: error.message,
        code: error.code 
      }, { status: 400 });
    }

    // 🔔 Otomatik Kritik Stok Bildirimi Kontrolü
    if (updateData.quantity !== undefined && material) {
      const currentQuantity = updateData.quantity;
      const criticalLevel = material.critical_level;
      
      if (currentQuantity <= criticalLevel) {
        // Mevcut okunmamış bildirim var mı kontrol et
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('material_id', id)
          .eq('type', 'critical_stock')
          .eq('is_read', false)
          .limit(1);

        if (!existingNotification || existingNotification.length === 0) {
          // Yeni kritik stok bildirimi oluştur
          await supabase
            .from('notifications')
            .insert({
              type: 'critical_stock',
              title: 'Kritik Stok Seviyesi',
              message: `Malzeme: ${material.name} (${material.code}) - Mevcut: ${currentQuantity} - Kritik Seviye: ${criticalLevel}`,
              material_type: 'raw',
              material_id: id,
              severity: 'high',
              user_id: payload.userId
            });
          
          logger.log('🔔 Kritik stok bildirimi oluşturuldu:', material.name);
        }
      } else {
        // Stok normal seviyeye çıktıysa, mevcut bildirimleri okundu olarak işaretle
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('material_id', id)
          .eq('type', 'critical_stock')
          .eq('is_read', false);
          
        logger.log('✅ Kritik stok bildirimleri okundu olarak işaretlendi:', material.name);
      }
    }

    return NextResponse.json(material);
  } catch (error) {
    logger.error('❌ Error updating raw material:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = params;
    const supabase = await createClient();

    // Only managers and planlama can delete materials
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if material is referenced in BOM
    const { data: bomReferences } = await supabase
      .from('bom')
      .select('id')
      .eq('material_id', id)
      .limit(1);

    if (bomReferences && bomReferences.length > 0) {
      return NextResponse.json({ 
        error: 'Bu hammadde BOM\'da kullanılıyor. Önce BOM\'dan kaldırın.' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('raw_materials')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Delete error:', error);
      return NextResponse.json({ 
        error: 'Failed to delete material', 
        details: error.message 
      }, { status: 400 });
    }

    return NextResponse.json({ message: 'Material deleted successfully' });
  } catch (error) {
    logger.error('Error deleting raw material:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}