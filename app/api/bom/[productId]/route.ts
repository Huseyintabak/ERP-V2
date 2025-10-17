import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get BOM for a finished product
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params; // Await params
    const supabase = await createClient();

    // Ürün bilgilerini al (önce finished, yoksa semi)
    let product = null;
    let isSemiProduct = false;
    
    // Önce finished_products'ta ara
    const { data: finishedProduct } = await supabase
      .from('finished_products')
      .select('id, name, code')
      .eq('id', productId)
      .single();

    if (finishedProduct) {
      product = finishedProduct;
    } else {
      // Yoksa semi_finished_products'ta ara
      const { data: semiProduct } = await supabase
        .from('semi_finished_products')
        .select('id, name, code')
        .eq('id', productId)
        .single();
      
      if (semiProduct) {
        product = semiProduct;
        isSemiProduct = true;
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // BOM kayıtlarını al - yarımmamül ürünler için semi_bom tablosunu kullan
    let bomRecords = null;
    let bomError = null;

    if (isSemiProduct) {
      // Yarımmamül ürün için semi_bom tablosunu kullan
      console.log('Fetching semi BOM for product:', productId);
      const { data, error } = await supabase
        .from('semi_bom')
        .select('*')
        .eq('semi_product_id', productId);
      
      console.log('Semi BOM fetch result:', { 
        data: data?.length, 
        error,
        productId,
        query: `SELECT * FROM semi_bom WHERE semi_product_id = '${productId}'`
      });
      bomRecords = data;
      bomError = error;
    } else {
      // Nihai ürün için bom tablosunu kullan
      console.log('Fetching finished BOM for product:', productId);
      const { data, error } = await supabase
        .from('bom')
        .select('*')
        .eq('finished_product_id', productId);
      
      console.log('Finished BOM fetch result:', { data: data?.length, error });
      bomRecords = data;
      bomError = error;
    }

    if (bomError) {
      console.error('BOM fetch error:', bomError);
      // Eğer semi_bom tablosu yoksa veya başka bir hata varsa, boş BOM döndür
      if (bomError.message.includes('semi_bom') || 
          bomError.message.includes('Could not find the table') ||
          bomError.message.includes('relation') ||
          bomError.message.includes('does not exist')) {
        console.log('Semi BOM table not found or error, returning empty BOM');
        return NextResponse.json({
          product,
          materials: [],
        });
      }
      // Diğer hatalar için de boş BOM döndür (geçici çözüm)
      console.log('BOM fetch error, returning empty BOM:', bomError.message);
      return NextResponse.json({
        product,
        materials: [],
      });
    }

    // Eğer bomRecords null veya boşsa, boş BOM döndür
    if (!bomRecords || bomRecords.length === 0) {
      console.log('No BOM records found, returning empty BOM for product:', productId);
      return NextResponse.json({
        product,
        materials: [],
      });
    }

    // Her BOM kaydı için malzeme bilgilerini ayrı ayrı al
    const materials = await Promise.all(
      bomRecords?.map(async (record) => {
        let material = null;
        
        if (record.material_type === 'raw') {
          const { data: rawMaterial } = await supabase
            .from('raw_materials')
            .select('id, name, code, unit, unit_price')
            .eq('id', record.material_id)
            .single();
          material = rawMaterial;
        } else if (record.material_type === 'semi') {
          const { data: semiMaterial } = await supabase
            .from('semi_finished_products')
            .select('id, name, code, unit, unit_cost')
            .eq('id', record.material_id)
            .single();
          material = semiMaterial;
        } else if (record.material_type === 'finished') {
          const { data: finishedMaterial } = await supabase
            .from('finished_products')
            .select('id, name, code, unit, sale_price')
            .eq('id', record.material_id)
            .single();
          material = finishedMaterial;
        }

        // Stok bilgisini al
        let currentStock = 0;
        if (record.material_type === 'raw') {
          const { data: stockData } = await supabase
            .from('raw_materials')
            .select('quantity')
            .eq('id', record.material_id)
            .single();
          currentStock = stockData?.quantity || 0;
        } else if (record.material_type === 'semi') {
          const { data: stockData } = await supabase
            .from('semi_finished_products')
            .select('quantity')
            .eq('id', record.material_id)
            .single();
          currentStock = stockData?.quantity || 0;
        } else if (record.material_type === 'finished') {
          const { data: stockData } = await supabase
            .from('finished_products')
            .select('quantity')
            .eq('id', record.material_id)
            .single();
          currentStock = stockData?.quantity || 0;
        }

        return {
          id: record.id,
          material_type: record.material_type,
          material_id: record.material_id,
          quantity_needed: record.quantity || record.quantity_needed, // semi_bom'da quantity, bom'da quantity_needed
          material_name: material?.name || 'Unknown Material',
          material_code: material?.code || 'N/A',
          unit: material?.unit || 'adet',
          current_stock: currentStock,
          material,
        };
      }) || []
    );

    console.log('BOM materials fetched:', {
      productId,
      isSemiProduct,
      bomRecordsCount: bomRecords?.length || 0,
      materialsCount: materials.length
    });

    return NextResponse.json({
      product,
      materials,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
