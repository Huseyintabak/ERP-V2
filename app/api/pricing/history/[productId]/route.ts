import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/pricing/history/[productId]
 * Ürün fiyat geçmişini getirir
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const { productId } = params;

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID gerekli' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fiyat geçmişini al
    const { data: history, error: historyError } = await supabase
      .from('price_history')
      .select(`
        *,
        changed_by_user:users!price_history_changed_by_fkey(
          id,
          name,
          email
        )
      `)
      .eq('product_id', productId)
      .order('changed_at', { ascending: false });

    if (historyError) throw historyError;

    // Ürün bilgilerini al
    const { data: product, error: productError } = await supabase
      .from('finished_products')
      .select('id, code, name, sale_price, cost_price, profit_margin, last_price_update')
      .eq('id', productId)
      .single();

    if (productError) throw productError;

    // İstatistikler hesapla
    const stats = {
      total_changes: history?.length || 0,
      last_change: history?.[0]?.changed_at || null,
      price_range: {
        min: Math.min(...(history?.map(h => parseFloat(h.new_price || '0')) || [0])),
        max: Math.max(...(history?.map(h => parseFloat(h.new_price || '0')) || [0])),
        current: parseFloat(product.sale_price || '0')
      },
      cost_range: {
        min: Math.min(...(history?.map(h => parseFloat(h.new_cost || '0')) || [0])),
        max: Math.max(...(history?.map(h => parseFloat(h.new_cost || '0')) || [0])),
        current: parseFloat(product.cost_price || '0')
      },
      margin_range: {
        min: Math.min(...(history?.map(h => parseFloat(h.new_margin || '0')) || [0])),
        max: Math.max(...(history?.map(h => parseFloat(h.new_margin || '0')) || [0])),
        current: parseFloat(product.profit_margin || '0')
      }
    };

    // Son 30 günlük değişim trendi
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentChanges = history?.filter(h => 
      new Date(h.changed_at) >= thirtyDaysAgo
    ) || [];

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        current_price: parseFloat(product.sale_price || '0'),
        current_cost: parseFloat(product.cost_price || '0'),
        current_margin: parseFloat(product.profit_margin || '0'),
        last_update: product.last_price_update
      },
      history: history || [],
      stats,
      trends: {
        recent_changes: recentChanges.length,
        last_30_days: recentChanges
      }
    });

  } catch (error: any) {
    console.error('❌ Price history error:', error);
    return NextResponse.json(
      { error: error.message || 'Fiyat geçmişi alınamadı' },
      { status: 500 }
    );
  }
}

