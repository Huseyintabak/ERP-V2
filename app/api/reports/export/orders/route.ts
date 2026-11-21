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
    // Raporlar sadece yöneticiye açık. x-user-role'ü middleware JWT'den yazar (istemci header'ı silinir).
    if (request.headers.get('x-user-role') !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    const supabase = await createClient();

    // Sipariş kalemleri order_items'ta; tutar = adet × ürün satış fiyatı (siparişte fiyat saklanmıyor).
    // (Eski sorgu orders üzerinde olmayan finished_product/quantity/total_price alanlarını istiyordu → hep 500.)
    let query = supabase
      .from('orders')
      .select(`
        *,
        customer:customers(name, company, phone, email),
        items:order_items(quantity, product:finished_products(code, name, unit, sale_price)),
        created_by_user:users!created_by(name)
      `);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = query.order('created_at', { ascending: false });

    const { data: orders, error } = await query;

    if (error) throw error;

    const STATUS_LABELS: Record<string, string> = {
      beklemede: 'Beklemede',
      onaylandi: 'Onaylandı',
      uretimde: 'Üretimde',
      tamamlandi: 'Tamamlandı',
      iptal: 'İptal',
    };
    const customerName = (o: any) => o.customer?.name || o.customer_name || 'Bilinmiyor';
    const itemTotal = (i: any) => Number(i.quantity || 0) * Number(i.product?.sale_price || 0);
    const orderTotal = (o: any) => (o.items || []).reduce((sum: number, i: any) => sum + itemTotal(i), 0);

    // Workbook oluştur
    const workbook = XLSX.utils.book_new();

    // SAYFA 1: Özet
    const totalValue = orders?.reduce((sum, o) => sum + orderTotal(o), 0) || 0;
    const countBy = (st: string) => orders?.filter((o) => o.status === st).length || 0;

    const summary = {
      'Toplam Sipariş': orders?.length || 0,
      'Beklemede': countBy('beklemede'),
      'Onaylandı': countBy('onaylandi'),
      'Üretimde': countBy('uretimde'),
      'Tamamlandı': countBy('tamamlandi'),
      'İptal': countBy('iptal'),
      'Toplam Tutar (₺)': totalValue.toFixed(2),
      'Ortalama Sipariş Tutarı (₺)': orders?.length ? (totalValue / orders.length).toFixed(2) : '0',
      'Rapor Tarihi': new Date().toLocaleString('tr-TR')
    };

    const summarySheet = XLSX.utils.json_to_sheet([summary]);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // SAYFA 2: Sipariş Detayları (kalem başına bir satır)
    const detailData = (orders || []).flatMap((o: any) =>
      (o.items?.length ? o.items : [null]).map((i: any) => ({
        'Sipariş No': o.order_number,
        'Müşteri': customerName(o),
        'Firma': o.customer?.company || '-',
        'Telefon': o.customer?.phone || '-',
        'Ürün': i?.product?.name || '-',
        'Ürün Kodu': i?.product?.code || '-',
        'Miktar': Number(i?.quantity || 0),
        'Birim': i?.product?.unit || '-',
        'Birim Fiyat (₺)': Number(i?.product?.sale_price || 0),
        'Toplam Fiyat (₺)': i ? itemTotal(i) : 0,
        'Teslim Tarihi': o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('tr-TR') : '-',
        'Durum': STATUS_LABELS[o.status] || o.status,
        'Öncelik': o.priority,
        'Oluşturan': o.created_by_user?.name || '-',
        'Oluşturma Tarihi': new Date(o.created_at).toLocaleDateString('tr-TR'),
      }))
    );

    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    detailSheet['!cols'] = Array(15).fill({ wch: 15 });
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Sipariş Detay');

    // SAYFA 3: Müşteri Bazlı Analiz
    const customerStats: { [key: string]: { count: number; total: number } } = {};
    orders?.forEach((o) => {
      const name = customerName(o);
      if (!customerStats[name]) {
        customerStats[name] = { count: 0, total: 0 };
      }
      customerStats[name].count++;
      customerStats[name].total += orderTotal(o);
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

