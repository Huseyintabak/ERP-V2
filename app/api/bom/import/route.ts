import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import * as XLSX from 'xlsx';

/**
 * POST /api/bom/import
 * Excel dosyasından BOM verilerini içe aktarır
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only planlama and yonetici can import BOM
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 400 });
    }

    // Excel dosyasını oku
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    console.log('📊 Excel data parsed:', {
      sheetName,
      rowCount: data.length,
      firstRow: data[0]
    });

    if (data.length === 0) {
      return NextResponse.json({ error: 'Excel dosyası boş' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Validation ve processing
    const errors: string[] = [];
    const successCount = { created: 0, updated: 0, skipped: 0, errors: 0 };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (1-based + header)

      console.log(`\n📝 Processing row ${rowNum}:`, row);

      // Validate required fields
      if (!row['Ürün Kodu'] || !row['Malzeme Kodu'] || !row['Miktar']) {
        const error = `Satır ${rowNum}: Ürün Kodu, Malzeme Kodu ve Miktar zorunludur`;
        console.log(`❌ ${error}`);
        errors.push(error);
        successCount.errors++;
        continue;
      }

      try {
        // Product lookup (check both finished and semi based on "Ürün Tipi")
        let productId = null;
        let productType: 'finished' | 'semi' = 'finished';

        if (row['Ürün Tipi'] === 'Yarı Mamul') {
          const { data: semiProduct } = await supabase
            .from('semi_finished_products')
            .select('id')
            .eq('code', row['Ürün Kodu'])
            .single();
          
          if (semiProduct) {
            productId = semiProduct.id;
            productType = 'semi';
          }
        } else {
          const { data: finishedProduct } = await supabase
            .from('finished_products')
            .select('id')
            .eq('code', row['Ürün Kodu'])
            .single();
          
          if (finishedProduct) {
            productId = finishedProduct.id;
            productType = 'finished';
          }
        }

        if (!productId) {
          errors.push(`Satır ${rowNum}: Ürün bulunamadı (${row['Ürün Kodu']})`);
          successCount.errors++;
          continue;
        }

        // Material lookup based on type
        let materialId = null;
        const materialType = row['Malzeme Tipi'] === 'Yarı Mamul' ? 'semi' : 'raw';

        // Yarı mamul ürünlere sadece hammadde eklenebilir
        if (productType === 'semi' && materialType !== 'raw') {
          errors.push(`Satır ${rowNum}: Yarı mamul ürünlere sadece hammadde eklenebilir`);
          successCount.errors++;
          continue;
        }

        if (materialType === 'raw') {
          const { data: rawMaterial } = await supabase
            .from('raw_materials')
            .select('id')
            .eq('code', row['Malzeme Kodu'])
            .single();
          
          if (rawMaterial) {
            materialId = rawMaterial.id;
          }
        } else {
          const { data: semiMaterial } = await supabase
            .from('semi_finished_products')
            .select('id')
            .eq('code', row['Malzeme Kodu'])
            .single();
          
          if (semiMaterial) {
            materialId = semiMaterial.id;
          }
        }

        if (!materialId) {
          errors.push(`Satır ${rowNum}: Malzeme bulunamadı (${row['Malzeme Kodu']})`);
          successCount.errors++;
          continue;
        }

        // Check if BOM entry already exists
        const { data: existingBOM } = await supabase
          .from('bom')
          .select('id, quantity_needed')
          .eq('finished_product_id', productId)
          .eq('material_id', materialId)
          .single();

        const newQuantity = parseFloat(row['Miktar']) || 1;

        if (existingBOM) {
          // UPDATE: Eğer miktar değişmişse güncelle
          if (existingBOM.quantity_needed !== newQuantity) {
            const { error: updateError } = await supabase
              .from('bom')
              .update({ quantity_needed: newQuantity })
              .eq('id', existingBOM.id);

            if (updateError) {
              errors.push(`Satır ${rowNum}: ${updateError.message}`);
              successCount.errors++;
            } else {
              console.log(`✅ Updated: ${row['Ürün Kodu']} + ${row['Malzeme Kodu']} (${existingBOM.quantity_needed} → ${newQuantity})`);
              successCount.updated++;
            }
          } else {
            // Miktar aynı, değişiklik yok
            successCount.skipped++;
          }
        } else {
          // INSERT: Yeni BOM entry
          const { error: insertError } = await supabase
            .from('bom')
            .insert([{
              finished_product_id: productId,
              material_type: materialType,
              material_id: materialId,
              quantity_needed: newQuantity
            }]);

          if (insertError) {
            errors.push(`Satır ${rowNum}: ${insertError.message}`);
            successCount.errors++;
          } else {
            console.log(`✅ Created: ${row['Ürün Kodu']} + ${row['Malzeme Kodu']} (${newQuantity})`);
            successCount.created++;
          }
        }

      } catch (error: any) {
        errors.push(`Satır ${rowNum}: ${error.message}`);
        successCount.errors++;
      }
    }

    const result = {
      success: true,
      message: `Import tamamlandı: ${successCount.created} yeni, ${successCount.updated} güncellendi, ${successCount.skipped} değişiklik yok, ${successCount.errors} hata`,
      stats: successCount,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('✅ Import completed:', result);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('BOM import error:', error);
    return NextResponse.json(
      { error: error.message || 'Import hatası' },
      { status: 500 }
    );
  }
}
