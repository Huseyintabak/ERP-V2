import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> }
) {
  try {
    const { barcode } = await params;

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barkod numarası gerekli' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS
    const supabase = await createAdminClient();

    // Search in all three tables in parallel
    const [rawResult, semiResult, finishedResult] = await Promise.all([
      // Raw Materials
      supabase
        .from('raw_materials')
        .select('id, code, name, barcode, quantity, unit, critical_level')
        .or(`barcode.eq.${barcode},code.eq.${barcode}`)
        .limit(1),

      // Semi Finished Products
      supabase
        .from('semi_finished_products')
        .select('id, code, name, barcode, quantity, unit, critical_level')
        .or(`barcode.eq.${barcode},code.eq.${barcode}`)
        .limit(1),

      // Finished Products
      supabase
        .from('finished_products')
        .select('id, code, name, barcode, quantity, unit, critical_level')
        .or(`barcode.eq.${barcode},code.eq.${barcode}`)
        .limit(1),
    ]);

    // Check for errors
    if (rawResult.error || semiResult.error || finishedResult.error) {
      console.error('Barcode lookup errors:', {
        raw: rawResult.error,
        semi: semiResult.error,
        finished: finishedResult.error,
      });
      return NextResponse.json(
        { error: 'Veritabanı sorgu hatası' },
        { status: 500 }
      );
    }

    // Find the product
    let product = null;
    let productType = '';

    if (rawResult.data && rawResult.data.length > 0) {
      product = rawResult.data[0];
      productType = 'raw_material';
    } else if (semiResult.data && semiResult.data.length > 0) {
      product = semiResult.data[0];
      productType = 'semi_finished';
    } else if (finishedResult.data && finishedResult.data.length > 0) {
      product = finishedResult.data[0];
      productType = 'finished_product';
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Ürün bulunamadı' },
        { status: 404 }
      );
    }

    // Get stock information from stock table
    const { data: stockData } = await supabase
      .from('stock')
      .select('quantity, location')
      .eq('product_id', product.id)
      .single();

    // Format response
    const response = {
      id: product.id,
      code: product.code,
      name: product.name,
      barcode: product.barcode,
      type: productType,
      unit: product.unit,
      currentStock: stockData?.quantity || product.quantity || 0,
      location: stockData?.location || '',
      critical_level: product.critical_level,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Barcode lookup error:', error);
    return NextResponse.json(
      { error: 'Ürün sorgulama hatası', details: error.message },
      { status: 500 }
    );
  }
}
