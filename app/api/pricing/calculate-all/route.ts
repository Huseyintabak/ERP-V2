import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

/**
 * POST /api/pricing/calculate-all
 * Tüm BOM'u olan ürünlerin maliyetlerini toplu hesaplar
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    
    // Only yonetici and planlama can run bulk calculations
    if (payload.role !== 'yonetici' && payload.role !== 'planlama') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const supabase = await createClient();

    // Get all unique product IDs from BOM
    const { data: bomProducts, error: bomError } = await supabase
      .from('bom')
      .select('finished_product_id')
      .order('finished_product_id');

    if (bomError) throw bomError;

    if (!bomProducts || bomProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Hiç BOM kaydı bulunamadı',
        stats: { total: 0, success: 0, failed: 0 }
      });
    }

    // Get unique product IDs
    const uniqueProductIds = [...new Set(bomProducts.map(b => b.finished_product_id))];
    
    console.log(`🔄 Toplu maliyet hesaplama başlatılıyor: ${uniqueProductIds.length} ürün`);

    const results = {
      total: uniqueProductIds.length,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Calculate cost for each product
    for (const productId of uniqueProductIds) {
      try {
        // Call calculate_bom_cost function
        const { data: costData, error: costError } = await supabase
          .rpc('calculate_bom_cost', { p_product_id: productId });

        if (costError) {
          console.error(`❌ Cost calculation failed for ${productId}:`, costError.message);
          results.failed++;
          results.errors.push(`${productId}: ${costError.message}`);
          continue;
        }

        if (!costData || costData.length === 0) {
          console.warn(`⚠️ No BOM data for ${productId}`);
          results.failed++;
          results.errors.push(`${productId}: BOM bulunamadı`);
          continue;
        }

        const result = costData[0];
        const totalCost = parseFloat(result.total_cost || '0');

        // Check if product is in finished_products
        const { data: finishedProduct } = await supabase
          .from('finished_products')
          .select('id, code')
          .eq('id', productId)
          .single();

        if (finishedProduct) {
          // Update finished product cost (sale_price = maliyet)
          const { error: updateError } = await supabase
            .from('finished_products')
            .update({ 
              sale_price: totalCost,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId);

          if (updateError) {
            console.error(`❌ Update failed for finished ${finishedProduct.code}:`, updateError.message);
            results.failed++;
            results.errors.push(`${finishedProduct.code}: ${updateError.message}`);
          } else {
            console.log(`✅ Finished product ${finishedProduct.code}: ₺${totalCost}`);
            results.success++;
          }
        } else {
          // Try semi-finished product
          const { data: semiProduct } = await supabase
            .from('semi_finished_products')
            .select('id, code')
            .eq('id', productId)
            .single();

          if (semiProduct) {
            // Update semi-finished product cost
            const { error: updateError } = await supabase
              .from('semi_finished_products')
              .update({ unit_cost: totalCost })
              .eq('id', productId);

            if (updateError) {
              console.error(`❌ Update failed for semi ${semiProduct.code}:`, updateError.message);
              results.failed++;
              results.errors.push(`${semiProduct.code}: ${updateError.message}`);
            } else {
              console.log(`✅ Semi product ${semiProduct.code}: ₺${totalCost}`);
              results.success++;
            }
          } else {
            console.warn(`⚠️ Product not found: ${productId}`);
            results.failed++;
            results.errors.push(`${productId}: Ürün bulunamadı`);
          }
        }

      } catch (error: any) {
        console.error(`❌ Error processing ${productId}:`, error.message);
        results.failed++;
        results.errors.push(`${productId}: ${error.message}`);
      }
    }

    console.log('✅ Toplu maliyet hesaplama tamamlandı:', results);

    return NextResponse.json({
      success: true,
      message: `Toplu hesaplama tamamlandı: ${results.success} başarılı, ${results.failed} başarısız`,
      stats: results
    });

  } catch (error: any) {
    console.error('❌ Bulk pricing calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Toplu hesaplama hatası' },
      { status: 500 }
    );
  }
}

