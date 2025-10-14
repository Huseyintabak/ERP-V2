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

    // Get BOM data
    const { data: bomData } = await supabase
      .from('bom')
      .select('*')
      .order('finished_product_id');

    if (!bomData || bomData.length === 0) {
      // Create empty template
      const templateData = [{
        'Ürün Kodu': '',
        'Ürün Adı': '',
        'Ürün Tipi': '',
        'Malzeme Tipi': '',
        'Malzeme Kodu': '',
        'Malzeme Adı': '',
        'Miktar': 0
      }];
      
      return createExcelFile(templateData, 'BOM Template');
    }

    // Get all product IDs (both finished and semi)
    const productIds = [...new Set(bomData.map(b => b.finished_product_id))];
    
    // Fetch finished products
    const { data: finishedProducts } = await supabase
      .from('finished_products')
      .select('id, name, code')
      .in('id', productIds);
    
    // Fetch semi-finished products
    const { data: semiProducts } = await supabase
      .from('semi_finished_products')
      .select('id, name, code')
      .in('id', productIds);
    
    // Get all material IDs
    const rawMaterialIds = bomData.filter(b => b.material_type === 'raw').map(b => b.material_id);
    const semiMaterialIds = bomData.filter(b => b.material_type === 'semi').map(b => b.material_id);
    
    // Fetch raw materials
    let rawMaterials: any[] = [];
    if (rawMaterialIds.length > 0) {
      const { data } = await supabase
        .from('raw_materials')
        .select('id, name, code, unit')
        .in('id', rawMaterialIds);
      rawMaterials = data || [];
    }
    
    // Fetch semi-finished materials
    let semiMaterials: any[] = [];
    if (semiMaterialIds.length > 0) {
      const { data } = await supabase
        .from('semi_finished_products')
        .select('id, name, code, unit')
        .in('id', semiMaterialIds);
      semiMaterials = data || [];
    }

    // Prepare data for export
    const exportData = bomData.map(item => {
      // Find product (check both finished and semi)
      const product = finishedProducts?.find(p => p.id === item.finished_product_id) || 
                      semiProducts?.find(p => p.id === item.finished_product_id);
      const productType = finishedProducts?.find(p => p.id === item.finished_product_id) ? 'Nihai Ürün' : 'Yarı Mamul';
      
      // Find material based on type
      let material = null;
      if (item.material_type === 'raw') {
        material = rawMaterials?.find(m => m.id === item.material_id);
      } else {
        material = semiMaterials?.find(m => m.id === item.material_id);
      }
      
      return {
        'Ürün Kodu': product?.code || '',
        'Ürün Adı': product?.name || '',
        'Ürün Tipi': productType,
        'Malzeme Tipi': item.material_type === 'raw' ? 'Hammadde' : 'Yarı Mamul',
        'Malzeme Kodu': material?.code || '',
        'Malzeme Adı': material?.name || '',
        'Miktar': item.quantity_needed || 0
      };
    });

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
    { wch: 15 }, // Ürün Kodu
    { wch: 30 }, // Ürün Adı
    { wch: 15 }, // Ürün Tipi
    { wch: 15 }, // Malzeme Tipi
    { wch: 15 }, // Malzeme Kodu
    { wch: 30 }, // Malzeme Adı
    { wch: 10 }, // Miktar
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

