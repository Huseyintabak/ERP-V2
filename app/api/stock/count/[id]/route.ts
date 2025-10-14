import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PUT /api/stock/count/[id]/approve
 * Envanter sayımını onayla ve stok güncelle
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { action, autoAdjust = true, reason } = await request.json();

    const supabase = await createClient();

    // Kullanıcı bilgisini al
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Kimlik doğrulama gerekli' },
        { status: 401 }
      );
    }

    if (action === 'approve') {
      // approve_inventory_count function'ını çağır
      const { data, error } = await supabase
        .rpc('approve_inventory_count', {
          p_count_id: id,
          p_approved_by: user.id,
          p_auto_adjust: autoAdjust
        });

      if (error) throw error;

      if (data && !data.success) {
        return NextResponse.json(
          { error: data.error || 'Onaylama hatası' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: autoAdjust 
          ? 'Envanter sayımı onaylandı ve stok güncellendi'
          : 'Envanter sayımı onaylandı',
        data
      });

    } else if (action === 'reject') {
      // reject_inventory_count function'ını çağır
      const { data, error } = await supabase
        .rpc('reject_inventory_count', {
          p_count_id: id,
          p_rejected_by: user.id,
          p_reason: reason || 'Sebep belirtilmedi'
        });

      if (error) throw error;

      if (data && !data.success) {
        return NextResponse.json(
          { error: data.error || 'Reddetme hatası' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Envanter sayımı reddedildi',
        data
      });

    } else {
      return NextResponse.json(
        { error: 'Geçersiz aksiyon. "approve" veya "reject" olmalı' },
        { status: 400 }
      );
    }

  } catch (error: any) {
    console.error('❌ Inventory count action error:', error);
    return NextResponse.json(
      { error: error.message || 'İşlem hatası' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/stock/count/[id]
 * Envanter sayım detayını getirir
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('inventory_counts')
      .select(`
        *,
        counted_by_user:users!inventory_counts_counted_by_fkey(id, name, email),
        approved_by_user:users!inventory_counts_approved_by_fkey(id, name, email),
        batch:inventory_count_batches(id, batch_name, count_date)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Envanter sayım kaydı bulunamadı' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('❌ Inventory count detail error:', error);
    return NextResponse.json(
      { error: error.message || 'Detay alınamadı' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/stock/count/[id]
 * Envanter sayım kaydını siler (sadece pending olanlar)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = await createClient();

    // Sadece pending olanları sil
    const { error } = await supabase
      .from('inventory_counts')
      .delete()
      .eq('id', id)
      .eq('status', 'pending');

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: 'Envanter sayım kaydı silindi'
    });

  } catch (error: any) {
    console.error('❌ Inventory count delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Silme hatası' },
      { status: 500 }
    );
  }
}

