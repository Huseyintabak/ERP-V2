import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

import { logger } from '@/lib/utils/logger';
/**
 * GET /api/reports/export/production
 * Üretim raporunu Excel formatında export eder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const supabase = await createClient();

    let query = supabase
      .from('production_plans')
      .select(`
        *,
        order:orders(order_number, customer:customers(name)),
        finished_product:finished_products(code, name, unit),
        operator:operators(series, user:users(name))
      `);

    if (startDate) {
      query = query.gte('start_date', startDate);
    }

    if (endDate) {
      query = query.lte('end_date', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data: productionData, error } = await query;

    if (error) throw error;

    // Workbook oluştur
    const workbook = XLSX.utils.book_new();

    // SAYFA 1: Özet
    const summary = {
      'Toplam Plan': productionData?.length || 0,
      'Beklemede': productionData?.filter(p => p.status === 'beklemede').length || 0,
      'Devam Ediyor': productionData?.filter(p => p.status === 'devam_ediyor').length || 0,
      'Tamamlandı': productionData?.filter(p => p.status === 'tamamlandi').length || 0,
      'İptal': productionData?.filter(p => p.status === 'iptal').length || 0,
      'Toplam Hedef': productionData?.reduce((sum, p) => sum + parseFloat(p.target_quantity || '0'), 0) || 0,
      'Toplam Üretilen': productionData?.reduce((sum, p) => sum + parseFloat(p.produced_quantity || '0'), 0) || 0,
      'Rapor Tarihi': new Date().toLocaleString('tr-TR')
    };

    const summarySheet = XLSX.utils.json_to_sheet([summary]);
    summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // SAYFA 2: Detaylı Üretim Verileri
    const detailData = productionData?.map(p => ({
      'Plan Kodu': p.plan_code,
      'Sipariş No': p.order?.order_number || '-',
      'Müşteri': p.order?.customer?.name || '-',
      'Ürün': p.finished_product?.name || '-',
      'Ürün Kodu': p.finished_product?.code || '-',
      'Hedef Miktar': parseFloat(p.target_quantity || '0'),
      'Üretilen': parseFloat(p.produced_quantity || '0'),
      'İlerleme %': ((parseFloat(p.produced_quantity || '0') / parseFloat(p.target_quantity || '1')) * 100).toFixed(2),
      'Başlangıç': new Date(p.start_date).toLocaleDateString('tr-TR'),
      'Bitiş': new Date(p.end_date).toLocaleDateString('tr-TR'),
      'Durum': p.status,
      'Öncelik': p.priority,
      'Operatör': p.operator?.user?.name || '-',
      'Lokasyon': p.operator?.location || '-',
      'Oluşturma': new Date(p.created_at).toLocaleDateString('tr-TR'),
      'Notlar': p.notes || '-'
    })) || [];

    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    detailSheet['!cols'] = Array(16).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Üretim Detay');

    // Excel buffer oluştur
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Response döndür
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="uretim-raporu-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });

  } catch (error: any) {
    logger.error('❌ Production export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

