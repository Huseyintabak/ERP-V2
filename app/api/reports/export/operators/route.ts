import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

/**
 * GET /api/reports/export/operators
 * Operatör raporunu Excel formatında export eder
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: operators, error } = await supabase
      .from('operators')
      .select(`
        *,
        user:users(name, email),
        active_productions:production_plans!operators_id_fkey(
          id,
          status,
          target_quantity,
          produced_quantity
        )
      `)
      .order('series');

    if (error) throw error;

    // Workbook oluştur
    const workbook = XLSX.utils.book_new();

    // SAYFA 1: Özet
    const totalCapacity = operators?.reduce((sum, o) => sum + parseFloat(o.daily_capacity || '0'), 0) || 0;
    const activeOperators = operators?.filter(o => o.current_status === 'working').length || 0;

    const summary = {
      'Toplam Operatör': operators?.length || 0,
      'Aktif': activeOperators,
      'Boşta': operators?.filter(o => o.current_status === 'idle').length || 0,
      'Molada': operators?.filter(o => o.current_status === 'break').length || 0,
      'Toplam Kapasite (saat/gün)': totalCapacity,
      'Kullanım %': totalCapacity > 0 ? ((activeOperators / (operators?.length || 1)) * 100).toFixed(2) : '0',
      'Ortalama Deneyim (yıl)': operators?.length ? (operators.reduce((sum, o) => sum + parseFloat(o.experience_years || '0'), 0) / operators.length).toFixed(1) : '0',
      'Rapor Tarihi': new Date().toLocaleString('tr-TR')
    };

    const summarySheet = XLSX.utils.json_to_sheet([summary]);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // SAYFA 2: Operatör Detayları
    const detailData = operators?.map(o => ({
      'Seri': o.series,
      'Ad Soyad': o.user?.name || '-',
      'Email': o.user?.email || '-',
      'Deneyim (yıl)': parseFloat(o.experience_years || '0'),
      'Günlük Kapasite (saat)': parseFloat(o.daily_capacity || '0'),
      'Saat Ücreti (₺)': parseFloat(o.hourly_rate || '0'),
      'Lokasyon': o.location,
      'Aktif Üretim Sayısı': o.active_productions_count || 0,
      'Durum': o.current_status === 'working' ? 'Çalışıyor' : o.current_status === 'idle' ? 'Boşta' : 'Mola',
      'Toplam Üretim': o.active_productions?.length || 0,
      'Tamamlanan': o.active_productions?.filter((p: any) => p.status === 'tamamlandi').length || 0,
      'Devam Eden': o.active_productions?.filter((p: any) => p.status === 'devam_ediyor').length || 0,
      'Kapasite Kullanımı %': o.active_productions_count > 0 ? '100' : '0'
    })) || [];

    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    detailSheet['!cols'] = Array(13).fill({ wch: 18 });
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Operatörler');

    // Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `operator-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error('❌ Operator export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

