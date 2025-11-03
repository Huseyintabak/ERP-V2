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
  quantity: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  unit_price: z.number().min(0).optional(),
  description: z.string().optional(),
});

// Semi-finished product import schema
const semiFinishedImportSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  barcode: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  unit_cost: z.number().min(0).optional(),
  description: z.string().optional(),
});

// Finished product import schema
const finishedProductImportSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  barcode: z.string().optional(),
  quantity: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  sale_price: z.number().min(0).optional(),
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

    // Log first row to see what columns exist
    if (data.length > 0) {
      logger.log('Excel columns detected:', Object.keys(data[0]));
      logger.log('First row sample:', data[0]);
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
        // Log row data for debugging
        if (i === 0) {
          logger.log('Processing first row:', row);
          logger.log('Available fields in row:', Object.keys(row));
        }
        
        // Convert types for Excel data
        const processedRow: any = {
          code: String(row.code),
          name: String(row.name),
        };
        
        // Optional fields
        if (row.barcode) processedRow.barcode = String(row.barcode);
        if (row.quantity !== undefined && row.quantity !== null && row.quantity !== '') {
          processedRow.quantity = Number(row.quantity);
        }
        if (row.unit) processedRow.unit = String(row.unit);
        if (row.description) processedRow.description = String(row.description);
        
        // Price fields (only process the price field for the selected type)
        // Try different possible column names
        if (type === 'raw') {
          const priceValue = row.unit_price ?? row['Unit Price'] ?? row['Birim Fiyat'] ?? row['unit price'];
          if (priceValue !== undefined && priceValue !== null && priceValue !== '') {
            processedRow.unit_price = Number(priceValue);
            logger.log(`Row ${rowNumber}: Found raw material price:`, priceValue);
          }
        }
        if (type === 'semi') {
          const costValue = row.unit_cost ?? row['Unit Cost'] ?? row['Birim Maliyet'] ?? row['unit cost'];
          if (costValue !== undefined && costValue !== null && costValue !== '') {
            processedRow.unit_cost = Number(costValue);
            logger.log(`Row ${rowNumber}: Found semi-finished cost:`, costValue);
          }
        }
        if (type === 'finished') {
          const saleValue = row.sale_price ?? row['Sale Price'] ?? row['Satış Fiyatı'] ?? row['sale price'];
          if (saleValue !== undefined && saleValue !== null && saleValue !== '') {
            processedRow.sale_price = Number(saleValue);
            logger.log(`Row ${rowNumber}: Found finished product price:`, saleValue);
          }
        }

        // Validate row data
        const validatedData = schema.parse(processedRow);

        // Check if code already exists
        const { data: existing } = await supabase
          .from(tableName)
          .select('id, quantity')
          .eq('code', validatedData.code)
          .single();

        if (existing) {
          // Update existing record - only update price fields based on type
          let updateData: any = {};
          
          if (type === 'raw' && validatedData.unit_price !== undefined) {
            // For raw materials, update unit_price
            updateData.unit_price = validatedData.unit_price;
            logger.log(`Row ${rowNumber}: Updating raw material ${validatedData.code} with price:`, validatedData.unit_price);
          } else if (type === 'semi' && validatedData.unit_cost !== undefined) {
            // For semi-finished, update unit_cost
            updateData.unit_cost = validatedData.unit_cost;
            logger.log(`Row ${rowNumber}: Updating semi-finished ${validatedData.code} with cost:`, validatedData.unit_cost);
          } else if (type === 'finished' && validatedData.sale_price !== undefined) {
            // For finished products, update sale_price
            updateData.sale_price = validatedData.sale_price;
            logger.log(`Row ${rowNumber}: Updating finished product ${validatedData.code} with price:`, validatedData.sale_price);
          }
          
          // Only update if there's data to update
          if (Object.keys(updateData).length === 0) {
            logger.log(`Row ${rowNumber}: No price data found for ${validatedData.code}`);
            results.errors++;
            results.errorDetails.push({
              row: rowNumber,
              code: validatedData.code,
              error: 'Fiyat alanı bulunamadı',
            });
            continue;
          }
          
          logger.log(`Row ${rowNumber}: Updating ${validatedData.code} with data:`, updateData);
          const { error } = await supabase
            .from(tableName)
            .update(updateData)
            .eq('code', validatedData.code);
          
          if (!error) {
            logger.log(`Row ${rowNumber}: Successfully updated ${validatedData.code}`);
          } else {
            logger.log(`Row ${rowNumber}: Error updating ${validatedData.code}:`, error.message);
          }

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
        } else {
          // Insert new record - add required default values
          const insertData = {
            ...validatedData,
            quantity: validatedData.quantity ?? 0,
            unit: validatedData.unit ?? 'adet',
          };
          
          const { error } = await supabase
            .from(tableName)
            .insert([insertData]);

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
