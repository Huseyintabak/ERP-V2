import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// DELETE - Delete Operator
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    const supabase = await createClient();

    // User context set et
    await supabase.rpc('set_user_context', { user_id: userId });

    // Operatörün aktif üretimi var mı kontrol et
    const { data: activeProductions, error: checkError } = await supabase
      .from('production_plans')
      .select('id')
      .eq('assigned_operator_id', id)
      .in('status', ['planlandi', 'devam_ediyor', 'duraklatildi']);

    if (checkError) throw checkError;

    if (activeProductions && activeProductions.length > 0) {
      return NextResponse.json({ 
        error: 'Bu operatörün aktif üretimi bulunmaktadır. Önce üretimleri tamamlayın veya iptal edin.' 
      }, { status: 400 });
    }

    // Operatörü ve kullanıcıyı sil (CASCADE ile otomatik silinecek)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      message: 'Operatör başarıyla silindi',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

