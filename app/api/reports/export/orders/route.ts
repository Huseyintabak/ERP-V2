import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

import { logger } from '@/lib/utils/logger';
/**
 * GET /api/reports/export/orders
 * Sipariş raporunu Excel formatında export eder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const supabase = await createClient();

    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name, contact_person, phone, email),
        finished_product:finished_products(code, name, unit, sale_price),
        created_by_user:users!orders_created_by_fkey(name)
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) throw error;

    // Workbook oluştur
    const workbook = XLSX.utils.book_new();

    // SAYFA 1: Özet
    const totalValue = orders?.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0) || 0;

    const summary = {
      'Toplam Sipariş': orders?.length || 0,
      'Onay Bekleyen': orders?.filter(o => o.status === 'pending').length || 0,
      'Onaylandı': orders?.filter(o => o.status === 'approved').length || 0,
      'Üretimde': orders?.filter(o => o.status === 'in_production').length || 0,
      'Tamamlandı': orders?.filter(o => o.status === 'completed').length || 0,
      'İptal': orders?.filter(o => o.status === 'cancelled').length || 0,
      'Toplam Tutar (₺)': totalValue.toFixed(2),
      'Ortalama Sipariş Tutarı (₺)': orders?.length ? (totalValue / orders.length).toFixed(2) : '0',
      'Rapor Tarihi': new Date().toLocaleString('tr-TR')
    };

    const summarySheet = XLSX.utils.json_to_sheet([summary]);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // SAYFA 2: Sipariş Detayları
    const detailData = orders?.map(o => ({
      'Sipariş No': o.order_number,
      'Müşteri': o.customer?.name || '-',
      'İletişim': o.customer?.contact_person || '-',
      'Telefon': o.customer?.phone || '-',
      'Ürün': o.finished_product?.name || '-',
      'Ürün Kodu': o.finished_product?.code || '-',
      'Miktar': parseFloat(o.quantity || '0'),
      'Birim': o.unit,
      'Birim Fiyat (₺)': parseFloat(o.unit_price || '0'),
      'Toplam Fiyat (₺)': parseFloat(o.total_price || '0'),
      'Teslim Tarihi': new Date(o.delivery_date).toLocaleDateString('tr-TR'),
      'Durum': o.status,
      'Öncelik': o.priority,
      'Oluşturan': o.created_by_user?.name || '-',
      'Oluşturma Tarihi': new Date(o.created_at).toLocaleDateString('tr-TR'),
      'Notlar': o.notes || '-'
    })) || [];

    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    detailSheet['!cols'] = Array(16).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Sipariş Detay');

    // SAYFA 3: Müşteri Bazlı Analiz
    const customerStats: { [key: string]: { count: number; total: number } } = {};
    orders?.forEach(o => {
      const customerName = o.customer?.name || 'Bilinmiyor';
      if (!customerStats[customerName]) {
        customerStats[customerName] = { count: 0, total: 0 };
      }
      customerStats[customerName].count++;
      customerStats[customerName].total += parseFloat(o.total_price || '0');
    });

    const customerData = Object.entries(customerStats).map(([name, stats]) => ({
      'Müşteri': name,
      'Sipariş Sayısı': stats.count,
      'Toplam Tutar (₺)': stats.total.toFixed(2),
      'Ortalama Sipariş (₺)': (stats.total / stats.count).toFixed(2)
    }));

    const customerSheet = XLSX.utils.json_to_sheet(customerData);
    customerSheet['!cols'] = Array(4).fill({ wch: 20 });
    XLSX.utils.book_append_sheet(workbook, customerSheet, 'Müşteri Analizi');

    // Excel buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `siparis-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    logger.error('❌ Order export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

