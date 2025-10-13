import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import * as XLSX from 'xlsx';
import { z } from 'zod';

// Advanced import result interface
interface ImportResult {
  success: number;
  errors: number;
  warnings: number;
  skipped: number;
  totalRows: number;
  errorDetails: Array<{
    row: number;
    code: string;
    field?: string;
    error: string;
    severity: 'error' | 'warning';
    suggestion?: string;
  }>;
  summary: {
    processedAt: string;
    fileName: string;
    fileSize: number;
    processingTime: number;
    validationRules: string[];
  };
}

// Enhanced validation schemas with detailed error messages
const rawMaterialImportSchema = z.object({
  code: z.string().min(1, 'Kod alanı boş olamaz'),
  name: z.string().min(1, 'Ad alanı boş olamaz'),
  barcode: z.string().optional(),
  quantity: z.number().min(0, 'Miktar negatif olamaz'),
  unit: z.string().min(1, 'Birim alanı boş olamaz'),
  unit_price: z.number().min(0, 'Birim fiyat negatif olamaz'),
  description: z.string().optional(),
}).strict();

const semiFinishedImportSchema = z.object({
  code: z.string().min(1, 'Kod alanı boş olamaz'),
  name: z.string().min(1, 'Ad alanı boş olamaz'),
  barcode: z.string().optional(),
  quantity: z.number().min(0, 'Miktar negatif olamaz'),
  unit: z.string().min(1, 'Birim alanı boş olamaz'),
  unit_cost: z.number().min(0, 'Birim maliyet negatif olamaz'),
  description: z.string().optional(),
}).strict();

const finishedProductImportSchema = z.object({
  code: z.string().min(1, 'Kod alanı boş olamaz'),
  name: z.string().min(1, 'Ad alanı boş olamaz'),
  barcode: z.string().optional(),
  quantity: z.number().min(0, 'Miktar negatif olamaz'),
  unit: z.string().min(1, 'Birim alanı boş olamaz'),
  sale_price: z.number().min(0, 'Satış fiyatı negatif olamaz'),
  description: z.string().optional(),
}).strict();

const bomImportSchema = z.object({
  product_code: z.string().min(1, 'Ürün kodu boş olamaz'),
  product_name: z.string().min(1, 'Ürün adı boş olamaz'),
  material_code: z.string().min(1, 'Malzeme kodu boş olamaz'),
  material_name: z.string().min(1, 'Malzeme adı boş olamaz'),
  quantity: z.number().min(0.01, 'Miktar 0.01\'den küçük olamaz'),
  unit: z.string().min(1, 'Birim alanı boş olamaz'),
  notes: z.string().optional(),
}).strict();

// Validation rules
const VALIDATION_RULES = {
  code: {
    pattern: /^[A-Z0-9-_]+$/,
    message: 'Kod sadece büyük harf, rakam, tire ve alt çizgi içerebilir',
  },
  barcode: {
    pattern: /^[0-9]{8,14}$/,
    message: 'Barkod 8-14 haneli rakam olmalıdır',
  },
  price: {
    max: 999999.99,
    message: 'Fiyat 999,999.99 TL\'den fazla olamaz',
  },
  quantity: {
    max: 999999,
    message: 'Miktar 999,999\'dan fazla olamaz',
  },
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let result: ImportResult = {
    success: 0,
    errors: 0,
    warnings: 0,
    skipped: 0,
    totalRows: 0,
    errorDetails: [],
    summary: {
      processedAt: new Date().toISOString(),
      fileName: '',
      fileSize: 0,
      processingTime: 0,
      validationRules: [],
    },
  };

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
    if (!['yonetici', 'depo'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const mode = formData.get('mode') as string; // 'validate-only' | 'import'
    const skipErrors = formData.get('skip_errors') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!['raw', 'semi', 'finished', 'bom'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Update summary
    result.summary.fileName = file.name;
    result.summary.fileSize = file.size;

    const supabase = await createClient();
    await supabase.rpc('set_user_context', { user_id: userId });

    // Read Excel file with enhanced error handling
    let data: any[] = [];
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false,
      });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel dosyasında sayfa bulunamadı');
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error(`Sayfa '${sheetName}' bulunamadı`);
      }

      data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      // Remove header row and filter empty rows
      data = data.slice(1).filter((row: any) => 
        row.some((cell: any) => cell !== '' && cell != null)
      );

    } catch (error) {
      return NextResponse.json({ 
        error: 'Excel dosyası okunamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      }, { status: 400 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ 
        error: 'Dosyada veri bulunamadı',
        summary: result.summary
      }, { status: 400 });
    }

    result.totalRows = data.length;

    // Get schema and table info
    let schema, tableName, validationRules: string[] = [];
    
    switch (type) {
      case 'raw':
        schema = rawMaterialImportSchema;
        tableName = 'raw_materials';
        validationRules = ['Kod formatı kontrolü', 'Barkod formatı kontrolü', 'Fiyat limiti kontrolü'];
        break;
      case 'semi':
        schema = semiFinishedImportSchema;
        tableName = 'semi_finished_products';
        validationRules = ['Kod formatı kontrolü', 'Maliyet limiti kontrolü'];
        break;
      case 'finished':
        schema = finishedProductImportSchema;
        tableName = 'finished_products';
        validationRules = ['Kod formatı kontrolü', 'Satış fiyatı limiti kontrolü'];
        break;
      case 'bom':
        schema = bomImportSchema;
        tableName = 'bom';
        validationRules = ['Ürün kodu kontrolü', 'Malzeme kodu kontrolü', 'Miktar kontrolü'];
        break;
    }

    result.summary.validationRules = validationRules;

    // Pre-validation: Check for duplicate codes in file
    const codesInFile = new Map<string, number[]>();
    data.forEach((row: any, index: number) => {
      const code = row[0]; // Assuming code is first column
      if (code) {
        if (!codesInFile.has(code)) {
          codesInFile.set(code, []);
        }
        codesInFile.get(code)!.push(index + 2); // +2 for header and 0-based index
      }
    });

    // Add warnings for duplicate codes in file
    codesInFile.forEach((rowNumbers, code) => {
      if (rowNumbers.length > 1) {
        rowNumbers.forEach(rowNumber => {
          result.warnings++;
          result.errorDetails.push({
            row: rowNumber,
            code,
            error: `Bu kod dosyada ${rowNumbers.length} kez tekrarlanıyor`,
            severity: 'warning',
            suggestion: 'Dosyadaki tekrarlanan kodları kontrol edin',
          });
        });
      }
    });

    // Get existing codes from database for validation
    const { data: existingRecords } = await supabase
      .from(tableName)
      .select('code');

    const existingCodes = new Set(existingRecords?.map(r => r.code) || []);

    // Process each row with enhanced validation
    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNumber = i + 2; // +2 for header and 0-based index

      try {
        // Convert row to object based on type
        let processedRow: any;
        
        switch (type) {
          case 'raw':
            processedRow = {
              code: row[0],
              name: row[1],
              barcode: row[2] || undefined,
              quantity: Number(row[3]) || 0,
              unit: row[4],
              unit_price: Number(row[5]) || 0,
              description: row[6] || undefined,
            };
            break;
          case 'semi':
            processedRow = {
              code: row[0],
              name: row[1],
              barcode: row[2] || undefined,
              quantity: Number(row[3]) || 0,
              unit: row[4],
              unit_cost: Number(row[5]) || 0,
              description: row[6] || undefined,
            };
            break;
          case 'finished':
            processedRow = {
              code: row[0],
              name: row[1],
              barcode: row[2] || undefined,
              quantity: Number(row[3]) || 0,
              unit: row[4],
              sale_price: Number(row[5]) || 0,
              description: row[6] || undefined,
            };
            break;
          case 'bom':
            processedRow = {
              product_code: row[0],
              product_name: row[1],
              material_code: row[2],
              material_name: row[3],
              quantity: Number(row[4]) || 0,
              unit: row[5],
              notes: row[6] || undefined,
            };
            break;
        }

        // Enhanced validation
        const validationErrors: string[] = [];

        // Code format validation
        if (processedRow.code && !VALIDATION_RULES.code.pattern.test(processedRow.code)) {
          validationErrors.push(VALIDATION_RULES.code.message);
        }

        // Barcode format validation
        if (processedRow.barcode && !VALIDATION_RULES.barcode.pattern.test(processedRow.barcode)) {
          validationErrors.push(VALIDATION_RULES.barcode.message);
        }

        // Price validation
        if (processedRow.unit_price && processedRow.unit_price > VALIDATION_RULES.price.max) {
          validationErrors.push(VALIDATION_RULES.price.message);
        }

        if (processedRow.unit_cost && processedRow.unit_cost > VALIDATION_RULES.price.max) {
          validationErrors.push(VALIDATION_RULES.price.message);
        }

        if (processedRow.sale_price && processedRow.sale_price > VALIDATION_RULES.price.max) {
          validationErrors.push(VALIDATION_RULES.price.message);
        }

        // Quantity validation
        if (processedRow.quantity > VALIDATION_RULES.quantity.max) {
          validationErrors.push(VALIDATION_RULES.quantity.message);
        }

        // Add validation errors
        validationErrors.forEach(error => {
          result.errors++;
          result.errorDetails.push({
            row: rowNumber,
            code: processedRow.code || processedRow.product_code || 'N/A',
            error,
            severity: 'error',
            suggestion: 'Lütfen veri formatını kontrol edin',
          });
        });

        // Skip if there are validation errors and not skipping errors
        if (validationErrors.length > 0 && !skipErrors) {
          result.skipped++;
          continue;
        }

        // Schema validation
        const validatedData = schema.parse(processedRow);

        // Database validation
        if (type === 'bom') {
          // Validate product exists
          const { data: product } = await supabase
            .from('finished_products')
            .select('id')
            .eq('code', validatedData.product_code)
            .single();

          if (!product) {
            result.errors++;
            result.errorDetails.push({
              row: rowNumber,
              code: validatedData.product_code,
              error: 'Ürün bulunamadı',
              severity: 'error',
              suggestion: 'Önce ürünü sisteme ekleyin',
            });
            if (!skipErrors) {
              result.skipped++;
              continue;
            }
          }

          // Validate material exists
          const { data: material } = await supabase
            .from('raw_materials')
            .select('id')
            .eq('code', validatedData.material_code)
            .single();

          if (!material) {
            result.errors++;
            result.errorDetails.push({
              row: rowNumber,
              code: validatedData.material_code,
              error: 'Hammadde bulunamadı',
              severity: 'error',
              suggestion: 'Önce hammaddeyi sisteme ekleyin',
            });
            if (!skipErrors) {
              result.skipped++;
              continue;
            }
          }
        } else {
          // Check if code already exists
          if (existingCodes.has(validatedData.code)) {
            result.errors++;
            result.errorDetails.push({
              row: rowNumber,
              code: validatedData.code,
              error: 'Bu kod zaten mevcut',
              severity: 'error',
              suggestion: 'Farklı bir kod kullanın veya mevcut kaydı güncelleyin',
            });
            if (!skipErrors) {
              result.skipped++;
              continue;
            }
          }
        }

        // If validate-only mode, don't actually import
        if (mode === 'validate-only') {
          result.success++;
          continue;
        }

        // Import data
        if (type === 'bom') {
          // Find IDs for BOM import
          const { data: product } = await supabase
            .from('finished_products')
            .select('id')
            .eq('code', validatedData.product_code)
            .single();

          const { data: material } = await supabase
            .from('raw_materials')
            .select('id')
            .eq('code', validatedData.material_code)
            .single();

          if (product && material) {
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
              result.errors++;
              result.errorDetails.push({
                row: rowNumber,
                code: validatedData.product_code,
                error: error.message,
                severity: 'error',
              });
            } else {
              result.success++;
            }
          }
        } else {
          const { error } = await supabase
            .from(tableName)
            .insert([validatedData]);

          if (error) {
            result.errors++;
            result.errorDetails.push({
              row: rowNumber,
              code: validatedData.code,
              error: error.message,
              severity: 'error',
            });
          } else {
            result.success++;
          }
        }

      } catch (error: unknown) {
        result.errors++;
        const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
        result.errorDetails.push({
          row: rowNumber,
          code: row[0] || 'N/A',
          error: errorMessage,
          severity: 'error',
          suggestion: 'Veri formatını kontrol edin',
        });
      }
    }

    // Calculate processing time
    result.summary.processingTime = Date.now() - startTime;

    // Generate summary message
    const summaryMessage = mode === 'validate-only' 
      ? `Validasyon tamamlandı: ${result.success} satır geçerli, ${result.errors} hata, ${result.warnings} uyarı`
      : `İmport tamamlandı: ${result.success} kayıt eklendi, ${result.errors} hata, ${result.warnings} uyarı, ${result.skipped} satır atlandı`;

    return NextResponse.json({
      message: summaryMessage,
      result,
      mode,
      recommendations: generateRecommendations(result),
    });

  } catch (error: unknown) {
    result.summary.processingTime = Date.now() - startTime;
    console.error('Advanced import error:', error);
    
    return NextResponse.json({ 
      error: 'Import işlemi başarısız',
      details: error instanceof Error ? error.message : 'Bilinmeyen hata',
      result,
    }, { status: 500 });
  }
}

// Generate recommendations based on import results
function generateRecommendations(result: ImportResult): string[] {
  const recommendations: string[] = [];

  if (result.errors > result.totalRows * 0.5) {
    recommendations.push('Dosyada çok fazla hata var. Excel template\'ini kontrol edin.');
  }

  if (result.warnings > 0) {
    recommendations.push('Dosyada uyarılar var. Bu verileri kontrol edin.');
  }

  if (result.errors > 0 && result.success === 0) {
    recommendations.push('Hiç veri import edilemedi. Dosya formatını kontrol edin.');
  }

  if (result.errorDetails.some(e => e.error.includes('zaten mevcut'))) {
    recommendations.push('Bazı kodlar zaten mevcut. Güncelleme modunu kullanmayı düşünün.');
  }

  if (result.errorDetails.some(e => e.error.includes('bulunamadı'))) {
    recommendations.push('Bazı referans veriler bulunamadı. Önce bunları sisteme ekleyin.');
  }

  return recommendations;
}
