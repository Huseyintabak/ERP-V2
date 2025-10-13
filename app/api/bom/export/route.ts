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

    // Only yonetici can export BOM
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    // Get BOM data with product and material names
    const { data: bomData } = await supabase
      .from('bom')
      .select(`
        *,
        product:finished_products(name, code),
        material:raw_materials(name, code)
      `)
      .order('product_id');

    if (!bomData || bomData.length === 0) {
      // Create empty template
      const templateData = [{
        product_code: '',
        product_name: '',
        material_code: '',
        material_name: '',
        quantity: 0,
        unit: '',
        notes: ''
      }];
      
      return createExcelFile(templateData, 'BOM Template');
    }

    // Prepare data for export
    const exportData = bomData.map(item => ({
      product_code: item.product?.code || '',
      product_name: item.product?.name || '',
      material_code: item.material?.code || '',
      material_name: item.material?.name || '',
      quantity: item.quantity,
      unit: item.unit,
      notes: item.notes || ''
    }));

    return createExcelFile(exportData, 'BOM Listesi');

  } catch (error: unknown) {
    console.error('BOM export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

function createExcelFile(data: any[], sheetName: string) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const columnWidths = [
    { wch: 20 }, // product_code
    { wch: 30 }, // product_name
    { wch: 20 }, // material_code
    { wch: 30 }, // material_name
    { wch: 10 }, // quantity
    { wch: 10 }, // unit
    { wch: 40 }, // notes
  ];
  worksheet['!cols'] = columnWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `bom_${timestamp}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}

