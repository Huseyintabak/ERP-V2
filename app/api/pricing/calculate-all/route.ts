import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
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

    // 1) ÖNCE YARI MAMULLERİ HESAPLA (semi_bom -> semi_finished_products.unit_cost)
    const { data: semiBomProducts, error: semiBomError } = await supabase
      .from('semi_bom')
      .select('semi_product_id');

    if (semiBomError) throw semiBomError;

    const uniqueSemiIds = [...new Set((semiBomProducts || []).map(b => b.semi_product_id))];

    logger.log(`🔄 Yarı mamul maliyet hesaplama: ${uniqueSemiIds.length} ürün`);

    const results = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const semiId of uniqueSemiIds) {
      try {
        // Directly compute from semi_bom
        const { data: rows, error } = await supabase
          .from('semi_bom')
          .select('material_type, material_id, quantity')
          .eq('semi_product_id', semiId);

        if (error) throw error;

        let totalCost = 0;
        for (const r of rows || []) {
          if (r.material_type === 'raw') {
            const { data: rm } = await supabase
              .from('raw_materials')
              .select('unit_price')
              .eq('id', r.material_id)
              .single();
            totalCost += Number(r.quantity || 0) * Number(rm?.unit_price || 0);
          } else if (r.material_type === 'semi') {
            const { data: sp } = await supabase
              .from('semi_finished_products')
              .select('unit_cost')
              .eq('id', r.material_id)
              .single();
            totalCost += Number(r.quantity || 0) * Number(sp?.unit_cost || 0);
          }
        }

        const { error: updateError } = await supabase
          .from('semi_finished_products')
          .update({ unit_cost: totalCost })
          .eq('id', semiId);

        if (updateError) {
          logger.error(`❌ Semi update failed ${semiId}:`, updateError.message);
          results.failed++;
          results.errors.push(`${semiId}: ${updateError.message}`);
        } else {
          logger.log(`✅ Semi updated ${semiId}: ₺${totalCost}`);
          results.success++;
        }
      } catch (error: any) {
        logger.error(`❌ Semi error ${semiId}:`, error.message);
        results.failed++;
        results.errors.push(`${semiId}: ${error.message}`);
      }
    }

    // 2) SONRA NİHAİ ÜRÜNLERİ HESAPLA (bom -> finished_products.cost_price)
    const { data: bomProducts, error: bomError } = await supabase
      .from('bom')
      .select('finished_product_id')
      .order('finished_product_id');

    if (bomError) throw bomError;

    const uniqueFinishedIds = [...new Set((bomProducts || []).map(b => b.finished_product_id))];
    logger.log(`🔄 Nihai ürün maliyet hesaplama: ${uniqueFinishedIds.length} ürün`);
    results.total = uniqueSemiIds.length + uniqueFinishedIds.length;

    for (const productId of uniqueFinishedIds) {
      try {
        // Call calculate_bom_cost function
        const { data: costData, error: costError } = await supabase
          .rpc('calculate_bom_cost', { p_product_id: productId });

        if (costError) {
          logger.error(`❌ Cost calculation failed for ${productId}:`, costError.message);
          results.failed++;
          results.errors.push(`${productId}: ${costError.message}`);
          continue;
        }

        if (!costData || costData.length === 0) {
          logger.warn(`⚠️ No BOM data for ${productId}`);
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
          // Update finished product cost to cost_price (not sale_price)
          const { error: updateError } = await supabase
            .from('finished_products')
            .update({ 
              cost_price: totalCost,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId);

          if (updateError) {
            logger.error(`❌ Update failed for finished ${finishedProduct.code}:`, updateError.message);
            results.failed++;
            results.errors.push(`${finishedProduct.code}: ${updateError.message}`);
          } else {
            logger.log(`✅ Finished product ${finishedProduct.code} cost_price: ₺${totalCost}`);
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
              logger.error(`❌ Update failed for semi ${semiProduct.code}:`, updateError.message);
              results.failed++;
              results.errors.push(`${semiProduct.code}: ${updateError.message}`);
            } else {
              logger.log(`✅ Semi product ${semiProduct.code}: ₺${totalCost}`);
              results.success++;
            }
          } else {
            logger.warn(`⚠️ Product not found: ${productId}`);
            results.failed++;
            results.errors.push(`${productId}: Ürün bulunamadı`);
          }
        }

      } catch (error: any) {
        logger.error(`❌ Error processing ${productId}:`, error.message);
        results.failed++;
        results.errors.push(`${productId}: ${error.message}`);
      }
    }

    logger.log('✅ Toplu maliyet hesaplama tamamlandı:', results);

    return NextResponse.json({
      success: true,
      message: `Toplu hesaplama tamamlandı: ${results.success} başarılı, ${results.failed} başarısız`,
      stats: results
    });

  } catch (error: any) {
    logger.error('❌ Bulk pricing calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Toplu hesaplama hatası' },
      { status: 500 }
    );
  }
}

