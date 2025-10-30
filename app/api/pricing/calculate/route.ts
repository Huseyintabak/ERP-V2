import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { logger } from '@/lib/utils/logger';
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

    // Not: DB'deki calculate_bom_cost fonksiyonu bom_items tablosunu kullanıyor olabilir.
    // Burada doğrudan bom/semi_bom üzerinden hesaplayacağız.

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

    // BOM maliyeti hesapla (finished => bom, semi => semi_bom)
    let rawMaterialCost = 0;
    let semiFinishedCost = 0;
    let totalCost = 0;
    let itemCount = 0;
    let breakdown: any[] = [];

    if (productType === 'semi') {
      // semi_bom üzerinden hesap
      const { data: rows, error } = await supabase
        .from('semi_bom')
        .select('material_type, material_id, quantity, unit')
        .eq('semi_product_id', productId);

      if (error) throw error;

      itemCount = rows?.length || 0;

      for (const r of rows || []) {
        if (r.material_type === 'raw') {
          const { data: rm } = await supabase
            .from('raw_materials')
            .select('id, code, name, unit, unit_price')
            .eq('id', r.material_id)
            .single();
          const unitCost = Number(rm?.unit_price || 0);
          const lineCost = Number(r.quantity || 0) * unitCost;
          rawMaterialCost += lineCost;
          breakdown.push({
            type: 'raw', id: rm?.id, code: rm?.code, name: rm?.name,
            quantity: Number(r.quantity || 0), unit: rm?.unit || r.unit || 'adet',
            unit_cost: unitCost, total_cost: lineCost,
          });
        } else if (r.material_type === 'semi') {
          const { data: sp } = await supabase
            .from('semi_finished_products')
            .select('id, code, name, unit, unit_cost')
            .eq('id', r.material_id)
            .single();
          const unitCost = Number(sp?.unit_cost || 0);
          const lineCost = Number(r.quantity || 0) * unitCost;
          semiFinishedCost += lineCost;
          breakdown.push({
            type: 'semi', id: sp?.id, code: sp?.code, name: sp?.name,
            quantity: Number(r.quantity || 0), unit: sp?.unit || r.unit || 'adet',
            unit_cost: unitCost, total_cost: lineCost,
          });
        }
      }
    } else {
      // finished products: bom üzerinden hesap
      const { data: rows, error } = await supabase
        .from('bom')
        .select('material_type, material_id, quantity_needed')
        .eq('finished_product_id', productId);

      if (error) throw error;

      itemCount = rows?.length || 0;

      for (const r of rows || []) {
        if (r.material_type === 'raw') {
          const { data: rm } = await supabase
            .from('raw_materials')
            .select('id, code, name, unit, unit_price')
            .eq('id', r.material_id)
            .single();
          const unitCost = Number(rm?.unit_price || 0);
          const qty = Number(r.quantity_needed || 0);
          const lineCost = qty * unitCost;
          rawMaterialCost += lineCost;
          breakdown.push({
            type: 'raw', id: rm?.id, code: rm?.code, name: rm?.name,
            quantity: qty, unit: rm?.unit || 'adet', unit_cost: unitCost, total_cost: lineCost,
          });
        } else if (r.material_type === 'semi') {
          const { data: sp } = await supabase
            .from('semi_finished_products')
            .select('id, code, name, unit, unit_cost')
            .eq('id', r.material_id)
            .single();
          const unitCost = Number(sp?.unit_cost || 0);
          const qty = Number(r.quantity_needed || 0);
          const lineCost = qty * unitCost;
          semiFinishedCost += lineCost;
          breakdown.push({
            type: 'semi', id: sp?.id, code: sp?.code, name: sp?.name,
            quantity: qty, unit: sp?.unit || 'adet', unit_cost: unitCost, total_cost: lineCost,
          });
        }
      }
    }

    totalCost = rawMaterialCost + semiFinishedCost;

    // Kar marjı hesapla (bilgi amaçlı)
    const salePrice = parseFloat(product.sale_price || '0');
    const profitAmount = salePrice - totalCost;
    const profitPercentage = totalCost > 0 ? (profitAmount / totalCost) * 100 : 0;

    // BOM cost breakdown'ı kaydet
    if (breakdown && breakdown.length > 0) {
      // Önce eski kayıtları pasif yap
      await supabase
        .from('bom_cost_breakdown')
        .update({ is_current: false })
        .eq('product_id', productId);

      // Yeni kayıtları ekle
      const breakdownRecords = breakdown.map((item: any) => ({
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
          cost_price: totalCost,
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
        raw_material_cost: rawMaterialCost,
        semi_finished_cost: semiFinishedCost,
        item_count: itemCount,
        breakdown
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
    logger.error('❌ Pricing calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Maliyet hesaplama hatası' },
      { status: 500 }
    );
  }
}

