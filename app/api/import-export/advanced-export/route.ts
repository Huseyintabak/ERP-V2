import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import * as XLSX from 'xlsx';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
// Export configuration schema
const exportConfigSchema = z.object({
  type: z.enum(['raw', 'semi', 'finished', 'bom', 'stock', 'production', 'audit']),
  format: z.enum(['xlsx', 'csv', 'pdf']).default('xlsx'),
  includeHeaders: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  dateRange: z.object({
    start: z.string().optional(),
    end: z.string().optional(),
  }).optional(),
  filters: z.record(z.any()).optional(),
  columns: z.array(z.string()).optional(),
  template: z.boolean().default(false),
});

// Template definitions
const TEMPLATES = {
  raw: {
    headers: ['Kod', 'Ad', 'Barkod', 'Miktar', 'Birim', 'Birim Fiyat', 'Açıklama'],
    sampleData: [
      ['RM001', 'Çelik Sac', '1234567890123', 100, 'kg', 25.50, 'Kaliteli çelik sac'],
      ['RM002', 'Alüminyum Profil', '1234567890124', 50, 'adet', 15.75, 'Standart profil'],
    ],
    validation: {
      code: 'Büyük harf, rakam, tire ve alt çizgi kullanın',
      barcode: '8-14 haneli rakam olmalı',
      quantity: 'Pozitif sayı olmalı',
      unit_price: 'Pozitif sayı olmalı',
    },
  },
  semi: {
    headers: ['Kod', 'Ad', 'Barkod', 'Miktar', 'Birim', 'Birim Maliyet', 'Açıklama'],
    sampleData: [
      ['SF001', 'Kaynaklı Parça', '1234567890125', 25, 'adet', 45.00, 'Kaynak işlemi tamamlanmış'],
    ],
    validation: {
      code: 'Büyük harf, rakam, tire ve alt çizgi kullanın',
      barcode: '8-14 haneli rakam olmalı',
      quantity: 'Pozitif sayı olmalı',
      unit_cost: 'Pozitif sayı olmalı',
    },
  },
  finished: {
    headers: ['Kod', 'Ad', 'Barkod', 'Miktar', 'Birim', 'Satış Fiyatı', 'Açıklama'],
    sampleData: [
      ['FP001', 'Thunder Pro', '1234567890126', 10, 'adet', 250.00, 'Premium ürün'],
    ],
    validation: {
      code: 'Büyük harf, rakam, tire ve alt çizgi kullanın',
      barcode: '8-14 haneli rakam olmalı',
      quantity: 'Pozitif sayı olmalı',
      sale_price: 'Pozitif sayı olmalı',
    },
  },
  bom: {
    headers: ['Ürün Kodu', 'Ürün Adı', 'Malzeme Kodu', 'Malzeme Adı', 'Miktar', 'Birim', 'Notlar'],
    sampleData: [
      ['FP001', 'Thunder Pro', 'RM001', 'Çelik Sac', 2.5, 'kg', 'Ana gövde malzemesi'],
    ],
    validation: {
      product_code: 'Mevcut ürün kodu olmalı',
      material_code: 'Mevcut malzeme kodu olmalı',
      quantity: '0.01\'den büyük olmalı',
    },
  },
};

export async function POST(request: NextRequest) {
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

    // Role-based permissions
    if (!['yonetici', 'depo', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const config = exportConfigSchema.parse(body);

    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    let data: any[] = [];
    let fileName = '';
    let sheetName = '';

    // Handle template export
    if (config.template) {
      const template = TEMPLATES[config.type];
      if (!template) {
        return NextResponse.json({ error: 'Template not found for this type' }, { status: 400 });
      }

      data = template.sampleData;
      fileName = `${config.type}_template.${config.format}`;
      sheetName = 'Template';
    } else {
      // Handle data export
      switch (config.type) {
        case 'raw':
          data = await exportRawMaterials(supabase, config);
          fileName = 'raw_materials_export.xlsx';
          sheetName = 'Hammaddeler';
          break;
        case 'semi':
          data = await exportSemiFinished(supabase, config);
          fileName = 'semi_finished_export.xlsx';
          sheetName = 'Yarı Mamuller';
          break;
        case 'finished':
          data = await exportFinishedProducts(supabase, config);
          fileName = 'finished_products_export.xlsx';
          sheetName = 'Nihai Ürünler';
          break;
        case 'bom':
          data = await exportBOM(supabase, config);
          fileName = 'bom_export.xlsx';
          sheetName = 'Ürün Ağacı';
          break;
        case 'stock':
          data = await exportStockReport(supabase, config);
          fileName = 'stock_report.xlsx';
          sheetName = 'Stok Raporu';
          break;
        case 'production':
          data = await exportProductionReport(supabase, config);
          fileName = 'production_report.xlsx';
          sheetName = 'Üretim Raporu';
          break;
        case 'audit':
          data = await exportAuditLogs(supabase, config);
          fileName = 'audit_logs_export.xlsx';
          sheetName = 'İşlem Geçmişi';
          break;
        default:
          return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
      }
    }

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Prepare worksheet data
    let worksheetData: any[][] = [];

    if (config.includeHeaders && TEMPLATES[config.type]) {
      worksheetData.push(TEMPLATES[config.type].headers);
    }

    worksheetData.push(...data);

    // Add metadata if requested
    if (config.includeMetadata && !config.template) {
      const metadata = [
        [''],
        ['Export Bilgileri'],
        ['Oluşturulma Tarihi', new Date().toLocaleString('tr-TR')],
        ['Kullanıcı', payload.email],
        ['Toplam Kayıt', data.length],
        [''],
      ];
      worksheetData.unshift(...metadata);
    }

    // Add validation info for templates
    if (config.template) {
      const template = TEMPLATES[config.type];
      worksheetData.push(['']);
      worksheetData.push(['Validasyon Kuralları']);
      Object.entries(template.validation).forEach(([field, rule]) => {
        worksheetData.push([field, rule]);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Style the worksheet
    if (config.includeHeaders) {
      // Header row styling
      const headerRow = config.includeMetadata ? 6 : 0; // Adjust for metadata
      worksheet['!rows'] = [{ hpt: 20 }];
      worksheet['!cols'] = TEMPLATES[config.type].headers.map(() => ({ wch: 15 }));
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: config.format === 'csv' ? 'csv' : 'xlsx' 
    });

    // Set response headers
    const contentType = config.format === 'csv' 
      ? 'text/csv' 
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error: unknown) {
    logger.error('Advanced export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Export functions for different data types
async function exportRawMaterials(supabase: any, config: any) {
  let query = supabase
    .from('raw_materials')
    .select('*')
    .order('code');

  if (config.filters) {
    if (config.filters.search) {
      query = query.or(`code.ilike.%${config.filters.search}%,name.ilike.%${config.filters.search}%`);
    }
    if (config.filters.unit) {
      query = query.eq('unit', config.filters.unit);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((item: any) => [
    item.code,
    item.name,
    item.barcode || '',
    item.quantity,
    item.unit,
    item.unit_price,
    item.description || '',
  ]);
}

async function exportSemiFinished(supabase: any, config: any) {
  let query = supabase
    .from('semi_finished_products')
    .select('*')
    .order('code');

  if (config.filters?.search) {
    query = query.or(`code.ilike.%${config.filters.search}%,name.ilike.%${config.filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((item: any) => [
    item.code,
    item.name,
    item.barcode || '',
    item.quantity,
    item.unit,
    item.unit_cost,
    item.description || '',
  ]);
}

async function exportFinishedProducts(supabase: any, config: any) {
  let query = supabase
    .from('finished_products')
    .select('*')
    .order('code');

  if (config.filters?.search) {
    query = query.or(`code.ilike.%${config.filters.search}%,name.ilike.%${config.filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((item: any) => [
    item.code,
    item.name,
    item.barcode || '',
    item.quantity,
    item.unit,
    item.sale_price,
    item.description || '',
  ]);
}

async function exportBOM(supabase: any, config: any) {
  const { data, error } = await supabase
    .from('bom')
    .select(`
      *,
      finished_products!bom_product_id_fkey(code, name),
      raw_materials!bom_material_id_fkey(code, name)
    `)
    .order('finished_products.code');

  if (error) throw error;

  return data.map((item: any) => [
    item.finished_products.code,
    item.finished_products.name,
    item.raw_materials.code,
    item.raw_materials.name,
    item.quantity,
    item.unit,
    item.notes || '',
  ]);
}

async function exportStockReport(supabase: any, config: any) {
  // Get all stock data with critical level information
  const { data: rawMaterials } = await supabase
    .from('raw_materials')
    .select('code, name, quantity, critical_level, unit, unit_price')
    .order('code');

  const { data: semiFinished } = await supabase
    .from('semi_finished_products')
    .select('code, name, quantity, critical_level, unit, unit_cost')
    .order('code');

  const { data: finishedProducts } = await supabase
    .from('finished_products')
    .select('code, name, quantity, critical_level, unit, sale_price')
    .order('code');

  const data = [];

  // Add raw materials
  rawMaterials?.forEach((item: any) => {
    const status = item.quantity <= item.critical_level ? 'KRİTİK' : 'NORMAL';
    data.push([
      'Hammadde',
      item.code,
      item.name,
      item.quantity,
      item.critical_level,
      item.unit,
      item.unit_price,
      status,
    ]);
  });

  // Add semi-finished
  semiFinished?.forEach((item: any) => {
    const status = item.quantity <= item.critical_level ? 'KRİTİK' : 'NORMAL';
    data.push([
      'Yarı Mamul',
      item.code,
      item.name,
      item.quantity,
      item.critical_level,
      item.unit,
      item.unit_cost,
      status,
    ]);
  });

  // Add finished products
  finishedProducts?.forEach((item: any) => {
    const status = item.quantity <= item.critical_level ? 'KRİTİK' : 'NORMAL';
    data.push([
      'Nihai Ürün',
      item.code,
      item.name,
      item.quantity,
      item.critical_level,
      item.unit,
      item.sale_price,
      status,
    ]);
  });

  return data;
}

async function exportProductionReport(supabase: any, config: any) {
  const { data, error } = await supabase
    .from('production_plans')
    .select(`
      *,
      orders!production_plans_order_id_fkey(order_number, customer_name),
      finished_products!production_plans_product_id_fkey(code, name),
      users!production_plans_assigned_operator_id_fkey(name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((item: any) => [
    item.orders?.order_number || 'N/A',
    item.finished_products?.code || 'N/A',
    item.finished_products?.name || 'N/A',
    item.planned_quantity,
    item.produced_quantity,
    item.status,
    item.users?.name || 'Atanmamış',
    new Date(item.created_at).toLocaleDateString('tr-TR'),
  ]);
}

async function exportAuditLogs(supabase: any, config: any) {
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      users!audit_logs_user_id_fkey(name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (config.dateRange?.start) {
    query = query.gte('created_at', config.dateRange.start);
  }
  if (config.dateRange?.end) {
    query = query.lte('created_at', config.dateRange.end);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map((item: any) => [
    new Date(item.created_at).toLocaleString('tr-TR'),
    item.users?.name || 'N/A',
    item.users?.email || 'N/A',
    item.table_name,
    item.action,
    item.old_values ? 'Evet' : 'Hayır',
    item.new_values ? 'Evet' : 'Hayır',
    item.ip_address || 'N/A',
  ]);
}
