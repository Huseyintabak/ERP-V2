import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    // Only authenticated users can export stock
    // Role check removed for template downloads

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'raw', 'semi', 'finished', 'all'
    const format = searchParams.get('format') || 'xlsx'; // 'xlsx', 'csv'

    if (!['raw', 'semi', 'finished', 'all'].includes(type || '')) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    let data: any[] = [];
    let fileName = '';

    if (type === 'all' || type === 'raw') {
      const { data: rawMaterials } = await supabase
        .from('raw_materials')
        .select('*')
        .order('code');

      if (rawMaterials) {
        data = [...data, ...rawMaterials.map(item => ({
          ...item,
          type: 'Hammadde'
        }))];
      }
    }

    if (type === 'all' || type === 'semi') {
      const { data: semiFinished } = await supabase
        .from('semi_finished_products')
        .select('*')
        .order('code');

      if (semiFinished) {
        data = [...data, ...semiFinished.map(item => ({
          ...item,
          type: 'Yarı Mamul'
        }))];
      }
    }

    if (type === 'all' || type === 'finished') {
      const { data: finishedProducts } = await supabase
        .from('finished_products')
        .select('*')
        .order('code');

      if (finishedProducts) {
        data = [...data, ...finishedProducts.map(item => ({
          ...item,
          type: 'Nihai Ürün'
        }))];
      }
    }

    // For template downloads, create empty template
    if (data.length === 0) {
      // Create empty template with headers
      const templateData = [{
        code: '',
        name: '',
        barcode: '',
        quantity: 0,
        unit: '',
        type: type === 'raw' ? 'Hammadde' : type === 'semi' ? 'Yarı Mamul' : 'Nihai Ürün',
        description: '',
        created_at: '',
        ...(type === 'raw' ? { unit_price: 0 } : {}),
        ...(type === 'semi' ? { unit_cost: 0 } : {}),
        ...(type === 'finished' ? { sale_price: 0 } : {}),
      }];
      
      data = templateData;
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Prepare data for export
    const exportData = data.map(item => {
      const baseItem = {
        'code': item.code,
        'name': item.name,
        'barcode': item.barcode || '',
        'quantity': item.quantity,
        'unit': item.unit,
        'type': item.type,
        'description': item.description || '',
        'created_at': new Date(item.created_at).toLocaleDateString('tr-TR'),
      };

      // Add price fields based on type
      if (item.type === 'Hammadde') {
        return {
          ...baseItem,
          'unit_price': item.unit_price,
        };
      } else if (item.type === 'Yarı Mamul') {
        return {
          ...baseItem,
          'unit_cost': item.unit_cost,
        };
      } else if (item.type === 'Nihai Ürün') {
        return {
          ...baseItem,
          'sale_price': item.sale_price,
        };
      }

      return baseItem;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Kod
      { wch: 30 }, // Ad
      { wch: 20 }, // Barkod
      { wch: 10 }, // Miktar
      { wch: 10 }, // Birim
      { wch: 15 }, // Tür
      { wch: 40 }, // Açıklama
      { wch: 15 }, // Oluşturulma Tarihi
      { wch: 15 }, // Fiyat/Maliyet
    ];
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Stok Listesi');

    // Generate file name
    const timestamp = new Date().toISOString().split('T')[0];
    fileName = `stok_${type}_${timestamp}.${format}`;

    // Convert to buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: format === 'csv' ? 'csv' : 'xlsx' 
    });

    // Return file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
