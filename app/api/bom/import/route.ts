import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import * as XLSX from 'xlsx';
import { z } from 'zod';

// BOM import schema
const bomImportSchema = z.object({
  product_code: z.string().min(1),
  product_name: z.string().min(1),
  material_code: z.string().min(1),
  material_name: z.string().min(1),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  notes: z.string().optional(),
});

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

    // Only yonetici can import BOM
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    // Read Excel file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    let results = {
      success: 0,
      errors: 0,
      errorDetails: [] as Array<{ row: number; code: string; error: string }>,
    };

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // +2 because Excel starts from 1 and we skip header

      try {
        // Convert types for Excel data
        const processedRow = {
          ...row,
          quantity: Number(row.quantity),
        };

        // Validate row data
        const validatedData = bomImportSchema.parse(processedRow);

        // Find product by code
        const { data: product } = await supabase
          .from('finished_products')
          .select('id')
          .eq('code', validatedData.product_code)
          .single();

        if (!product) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            code: validatedData.product_code,
            error: 'Ürün bulunamadı',
          });
          continue;
        }

        // Find material by code
        const { data: material } = await supabase
          .from('raw_materials')
          .select('id')
          .eq('code', validatedData.material_code)
          .single();

        if (!material) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            code: validatedData.material_code,
            error: 'Hammadde bulunamadı',
          });
          continue;
        }

        // Check if BOM entry already exists
        const { data: existing } = await supabase
          .from('bom')
          .select('id')
          .eq('product_id', product.id)
          .eq('material_id', material.id)
          .single();

        if (existing) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            code: validatedData.product_code,
            error: 'Bu BOM girişi zaten mevcut',
          });
          continue;
        }

        // Insert new BOM entry
        const { error } = await supabase
          .from('bom')
          .insert([{
            product_id: product.id,
            material_id: material.id,
            quantity: validatedData.quantity,
            unit: validatedData.unit,
            notes: validatedData.notes,
          }]);

        if (error) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            code: validatedData.product_code,
            error: error.message,
          });
        } else {
          results.success++;
        }
      } catch (error: unknown) {
        results.errors++;
        const errorMessage = error instanceof Error ? error.message : 'Validation error';
        results.errorDetails.push({
          row: rowNumber,
          code: row.product_code || 'N/A',
          error: errorMessage,
        });
      }
    }

    console.log('BOM Import completed:', {
      success: results.success,
      errors: results.errors,
      totalRows: data.length,
      errorDetails: results.errorDetails
    });

    return NextResponse.json({
      message: 'BOM Import completed',
      results,
      totalRows: data.length,
    });
  } catch (error: unknown) {
    console.error('BOM Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}