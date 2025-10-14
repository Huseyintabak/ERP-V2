import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/pricing/calculate
 * BOM bazlı ürün maliyeti hesaplar
 */
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID gerekli' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // calculate_bom_cost function'ını çağır
    const { data: costData, error: costError } = await supabase
      .rpc('calculate_bom_cost', { p_product_id: productId });

    if (costError) throw costError;

    if (!costData || costData.length === 0) {
      return NextResponse.json({
        productId,
        total_cost: 0,
        raw_material_cost: 0,
        semi_finished_cost: 0,
        item_count: 0,
        breakdown: [],
        message: 'Bu ürün için BOM bulunamadı'
      });
    }

    const result = costData[0];

    // Ürün bilgilerini al (önce finished, sonra semi)
    let product: any = null;
    let productType: 'finished' | 'semi' = 'finished';

    const { data: finishedProduct } = await supabase
      .from('finished_products')
      .select('id, code, name, sale_price, quantity')
      .eq('id', productId)
      .single();

    if (finishedProduct) {
      product = finishedProduct;
      productType = 'finished';
    } else {
      const { data: semiProduct, error: semiError } = await supabase
        .from('semi_finished_products')
        .select('id, code, name, unit_cost, quantity')
        .eq('id', productId)
        .single();

      if (semiError || !semiProduct) {
        throw new Error('Product not found in finished or semi-finished products');
      }

      product = {
        ...semiProduct,
        sale_price: semiProduct.unit_cost // Map unit_cost to sale_price
      };
      productType = 'semi';
    }

    // Kar marjı hesapla
    const totalCost = parseFloat(result.total_cost || '0');
    const salePrice = parseFloat(product.sale_price || '0');
    const profitAmount = salePrice - totalCost;
    const profitPercentage = totalCost > 0 ? (profitAmount / totalCost) * 100 : 0;

    // BOM cost breakdown'ı kaydet
    if (result.breakdown && result.breakdown.length > 0) {
      // Önce eski kayıtları pasif yap
      await supabase
        .from('bom_cost_breakdown')
        .update({ is_current: false })
        .eq('product_id', productId);

      // Yeni kayıtları ekle
      const breakdownRecords = result.breakdown.map((item: any) => ({
        product_id: productId,
        material_type: item.type,
        material_id: item.id,
        material_code: item.code,
        material_name: item.name,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        is_current: true
      }));

      await supabase
        .from('bom_cost_breakdown')
        .insert(breakdownRecords);
    }

    // Ürün maliyetini otomatik güncelle
    if (productType === 'finished') {
      await supabase
        .from('finished_products')
        .update({ 
          sale_price: totalCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);
    } else {
      // Yarı mamul için unit_cost'u güncelle
      await supabase
        .from('semi_finished_products')
        .update({ 
          unit_cost: totalCost
        })
        .eq('id', productId);
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        sale_price: salePrice,
        current_cost_price: totalCost,
        quantity: parseFloat(product.quantity || '0')
      },
      calculation: {
        total_cost: totalCost,
        raw_material_cost: parseFloat(result.raw_material_cost || '0'),
        semi_finished_cost: parseFloat(result.semi_finished_cost || '0'),
        item_count: result.item_count || 0,
        breakdown: result.breakdown || []
      },
      profitability: {
        profit_amount: profitAmount,
        profit_percentage: Math.round(profitPercentage * 100) / 100,
        target_margin: 20, // Default 20% margin
        recommended_price: totalCost * 1.20, // 20% markup
        status: profitAmount < 0 ? 'loss' : profitAmount === 0 ? 'break_even' : 'profitable'
      },
      calculated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ Pricing calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Maliyet hesaplama hatası' },
      { status: 500 }
    );
  }
}

