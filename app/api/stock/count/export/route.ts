import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { logger } from '@/lib/utils/logger';
/**
 * GET /api/stock/count/export
 * Envanter sayımlarını Excel formatında export eder
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const materialType = searchParams.get('materialType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const supabase = await createClient();

    let query = supabase
      .from('inventory_counts')
      .select(`
        *,
        counted_by_user:users!inventory_counts_counted_by_fkey(name, email),
        approved_by_user:users!inventory_counts_approved_by_fkey(name, email)
      `);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (materialType) {
      query = query.eq('material_type', materialType);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // CSV formatında döndür (Excel'de açılabilir)
    const csvRows = [];

    // Header
    csvRows.push([
      'Tarih',
      'Malzeme Tipi',
      'Malzeme Kodu',
      'Malzeme Adı',
      'Sistem Stoğu',
      'Fiziki Sayım',
      'Fark',
      'Sapma %',
      'Durum',
      'Sayan',
      'Onaylayan',
      'Notlar'
    ].join(','));

    // Data rows
    data?.forEach(count => {
      csvRows.push([
        new Date(count.created_at).toLocaleString('tr-TR'),
        count.material_type === 'raw' ? 'Hammadde' : count.material_type === 'semi' ? 'Yarı Mamul' : 'Nihai Ürün',
        count.material_code,
        `"${count.material_name}"`, // Quotes for names with commas
        count.system_quantity,
        count.physical_quantity,
        count.difference,
        count.variance_percentage,
        count.status === 'pending' ? 'Beklemede' : count.status === 'approved' ? 'Onaylandı' : 'Reddedildi',
        count.counted_by_user?.name || '',
        count.approved_by_user?.name || '',
        `"${count.notes || ''}"` // Quotes for notes
      ].join(','));
    });

    const csv = csvRows.join('\n');
    const filename = `envanter-sayim-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    logger.error('❌ Export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

