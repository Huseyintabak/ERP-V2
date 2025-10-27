import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import * as XLSX from 'xlsx';
import { z } from 'zod';

import { logger } from '@/lib/utils/logger';
// Raw material import schema
const rawMaterialImportSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  barcode: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  unit_price: z.number().min(0),
  description: z.string().optional(),
});

// Semi-finished product import schema
const semiFinishedImportSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  barcode: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  unit_cost: z.number().min(0),
  description: z.string().optional(),
});

// Finished product import schema
const finishedProductImportSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  barcode: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  sale_price: z.number().min(0),
  description: z.string().optional(),
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

    // Allow both yonetici and depo roles to import
    if (!['yonetici', 'depo'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'raw', 'semi', 'finished'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!['raw', 'semi', 'finished'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
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

    // Validate and process data based on type
    let schema;
    let tableName;
    let results = {
      success: 0,
      errors: 0,
      errorDetails: [] as Array<{ row: number; code: string; error: string }>,
    };

    switch (type) {
      case 'raw':
        schema = rawMaterialImportSchema;
        tableName = 'raw_materials';
        break;
      case 'semi':
        schema = semiFinishedImportSchema;
        tableName = 'semi_finished_products';
        break;
      case 'finished':
        schema = finishedProductImportSchema;
        tableName = 'finished_products';
        break;
      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // +2 because Excel starts from 1 and we skip header

      try {
        // Convert types for Excel data
        const processedRow = {
          ...row,
          barcode: row.barcode ? String(row.barcode) : undefined,
          quantity: Number(row.quantity),
          unit_price: Number(row.unit_price),
          unit_cost: Number(row.unit_cost),
          sale_price: Number(row.sale_price),
        };

        // Validate row data
        const validatedData = schema.parse(processedRow);

        // Check if code already exists
        const { data: existing } = await supabase
          .from(tableName)
          .select('id')
          .eq('code', validatedData.code)
          .single();

        if (existing) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            code: validatedData.code,
            error: 'Bu kod zaten mevcut',
          });
          continue;
        }

        // Insert new record
        const { error } = await supabase
          .from(tableName)
          .insert([validatedData]);

        if (error) {
          results.errors++;
          results.errorDetails.push({
            row: rowNumber,
            code: validatedData.code,
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
          code: row.code || 'N/A',
          error: errorMessage,
        });
      }
    }

    logger.log('Import completed:', {
      success: results.success,
      errors: results.errors,
      totalRows: data.length,
      errorDetails: results.errorDetails
    });

    return NextResponse.json({
      message: 'Import completed',
      results,
      totalRows: data.length,
    });
  } catch (error: unknown) {
    logger.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
