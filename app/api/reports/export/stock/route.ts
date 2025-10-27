import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

import { logger } from '@/lib/utils/logger';
/**
 * GET /api/reports/export/stock
 * Stok raporunu Excel formatında export eder
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Tüm stok verilerini çek
    const [rawResponse, semiResponse, finishedResponse] = await Promise.all([
      supabase.from('raw_materials').select('*').order('code'),
      supabase.from('semi_finished_products').select('*').order('code'),
      supabase.from('finished_products').select('*').order('code')
    ]);

    if (rawResponse.error) throw rawResponse.error;
    if (semiResponse.error) throw semiResponse.error;
    if (finishedResponse.error) throw finishedResponse.error;

    const rawMaterials = rawResponse.data || [];
    const semiFinished = semiResponse.data || [];
    const finishedProducts = finishedResponse.data || [];

    // Workbook oluştur
    const workbook = XLSX.utils.book_new();

    // SAYFA 1: Özet
    const totalValue = 
      rawMaterials.reduce((sum, m) => sum + (parseFloat(m.quantity || '0') * parseFloat(m.unit_price || '0')), 0) +
      semiFinished.reduce((sum, m) => sum + (parseFloat(m.quantity || '0') * parseFloat(m.unit_cost || '0')), 0) +
      finishedProducts.reduce((sum, m) => sum + (parseFloat(m.quantity || '0') * parseFloat(m.sale_price || '0')), 0);

    const summary = {
      'Hammadde Sayısı': rawMaterials.length,
      'Yarı Mamul Sayısı': semiFinished.length,
      'Nihai Ürün Sayısı': finishedProducts.length,
      'Toplam Ürün': rawMaterials.length + semiFinished.length + finishedProducts.length,
      'Kritik Stok (Hammadde)': rawMaterials.filter(m => parseFloat(m.quantity || '0') <= parseFloat(m.critical_level || '0')).length,
      'Kritik Stok (Yarı Mamul)': semiFinished.filter(m => parseFloat(m.quantity || '0') <= parseFloat(m.critical_level || '0')).length,
      'Kritik Stok (Nihai)': finishedProducts.filter(m => parseFloat(m.quantity || '0') <= parseFloat(m.critical_level || '0')).length,
      'Toplam Stok Değeri (₺)': totalValue.toFixed(2),
      'Rapor Tarihi': new Date().toLocaleString('tr-TR')
    };

    const summarySheet = XLSX.utils.json_to_sheet([summary]);
    summarySheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Özet');

    // SAYFA 2: Hammaddeler
    if (rawMaterials.length > 0) {
      const rawData = rawMaterials.map(m => ({
        'Kod': m.code,
        'İsim': m.name,
        'Barkod': m.barcode || '-',
        'Miktar': parseFloat(m.quantity || '0'),
        'Rezerve': parseFloat(m.reserved_quantity || '0'),
        'Kullanılabilir': parseFloat(m.quantity || '0') - parseFloat(m.reserved_quantity || '0'),
        'Kritik Seviye': parseFloat(m.critical_level || '0'),
        'Birim': m.unit,
        'Birim Fiyat (₺)': parseFloat(m.unit_price || '0'),
        'Toplam Değer (₺)': (parseFloat(m.quantity || '0') * parseFloat(m.unit_price || '0')).toFixed(2),
        'Tedarikçi': m.supplier || '-',
        'Durum': parseFloat(m.quantity || '0') <= parseFloat(m.critical_level || '0') ? 'Kritik' : 'Normal'
      }));

      const rawSheet = XLSX.utils.json_to_sheet(rawData);
      rawSheet['!cols'] = Array(12).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(workbook, rawSheet, 'Hammaddeler');
    }

    // SAYFA 3: Yarı Mamüller
    if (semiFinished.length > 0) {
      const semiData = semiFinished.map(m => ({
        'Kod': m.code,
        'İsim': m.name,
        'Barkod': m.barcode || '-',
        'Miktar': parseFloat(m.quantity || '0'),
        'Rezerve': parseFloat(m.reserved_quantity || '0'),
        'Kullanılabilir': parseFloat(m.quantity || '0') - parseFloat(m.reserved_quantity || '0'),
        'Kritik Seviye': parseFloat(m.critical_level || '0'),
        'Birim': m.unit,
        'Birim Maliyet (₺)': parseFloat(m.unit_cost || '0'),
        'Toplam Değer (₺)': (parseFloat(m.quantity || '0') * parseFloat(m.unit_cost || '0')).toFixed(2),
        'Durum': parseFloat(m.quantity || '0') <= parseFloat(m.critical_level || '0') ? 'Kritik' : 'Normal'
      }));

      const semiSheet = XLSX.utils.json_to_sheet(semiData);
      semiSheet['!cols'] = Array(11).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(workbook, semiSheet, 'Yarı Mamüller');
    }

    // SAYFA 4: Nihai Ürünler
    if (finishedProducts.length > 0) {
      const finishedData = finishedProducts.map(m => ({
        'Kod': m.code,
        'İsim': m.name,
        'Barkod': m.barcode || '-',
        'Miktar': parseFloat(m.quantity || '0'),
        'Rezerve': parseFloat(m.reserved_quantity || '0'),
        'Kullanılabilir': parseFloat(m.quantity || '0') - parseFloat(m.reserved_quantity || '0'),
        'Kritik Seviye': parseFloat(m.critical_level || '0'),
        'Birim': m.unit,
        'Satış Fiyatı (₺)': parseFloat(m.sale_price || '0'),
        'Maliyet (₺)': parseFloat(m.cost_price || '0'),
        'Kar Marjı %': parseFloat(m.profit_margin || '0'),
        'Toplam Değer (₺)': (parseFloat(m.quantity || '0') * parseFloat(m.sale_price || '0')).toFixed(2),
        'Durum': parseFloat(m.quantity || '0') <= parseFloat(m.critical_level || '0') ? 'Kritik' : 'Normal'
      }));

      const finishedSheet = XLSX.utils.json_to_sheet(finishedData);
      finishedSheet['!cols'] = Array(13).fill({ wch: 15 });
      XLSX.utils.book_append_sheet(workbook, finishedSheet, 'Nihai Ürünler');
    }

    // Excel buffer oluştur
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename = `stok-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    logger.error('❌ Stock export error:', error);
    return NextResponse.json(
      { error: error.message || 'Export hatası' },
      { status: 500 }
    );
  }
}

