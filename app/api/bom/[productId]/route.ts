import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

import { logger } from '@/lib/utils/logger';

// POST - Save BOM for a product
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User context required' }, { status: 401 });
    }

    const body = await request.json();
    const { product_id, entries } = body;

    logger.log('BOM save request:', {
      product_id,
      entries: entries?.length,
      firstEntry: entries?.[0]
    });

    if (!product_id || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const supabase = await createClient();

    // Ürün tipini belirle
    let isSemiProduct = false;
    const { data: finishedProduct } = await supabase
      .from('finished_products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (!finishedProduct) {
      const { data: semiProduct } = await supabase
        .from('semi_finished_products')
        .select('id')
        .eq('id', product_id)
        .single();
      
      if (semiProduct) {
        isSemiProduct = true;
      } else {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }
    }

    // Mevcut BOM kayıtlarını sil
    if (isSemiProduct) {
      const { error: deleteError } = await supabase
        .from('semi_bom')
        .delete()
        .eq('semi_product_id', product_id);
      
      if (deleteError) {
        logger.error('Error deleting existing semi BOM:', deleteError);
      }
    } else {
      const { error: deleteError } = await supabase
        .from('bom')
        .delete()
        .eq('finished_product_id', product_id);
      
      if (deleteError) {
        logger.error('Error deleting existing BOM:', deleteError);
      }
    }

    // Yeni BOM kayıtlarını ekle
    const bomEntries = entries
      .filter((entry: any) => {
        // Geçerli veri kontrolü
        return entry && 
               entry.material_type && 
               entry.material_id && 
               (entry.quantity_needed || entry.quantity);
      })
      .map((entry: any) => {
        const quantity = entry.quantity_needed || entry.quantity;
        
        logger.log('Processing BOM entry:', {
          material_type: entry.material_type,
          material_id: entry.material_id,
          quantity,
          isSemiProduct
        });

        if (isSemiProduct) {
          return {
            semi_product_id: product_id,
            material_type: entry.material_type,
            material_id: entry.material_id,
            quantity: quantity
          };
        } else {
          return {
            finished_product_id: product_id,
            material_type: entry.material_type,
            material_id: entry.material_id,
            quantity_needed: quantity
          };
        }
      });

    logger.log('Processed BOM entries:', {
      originalCount: entries.length,
      filteredCount: bomEntries.length,
      entries: bomEntries
    });

    const tableName = isSemiProduct ? 'semi_bom' : 'bom';
    const { data, error } = await supabase
      .from(tableName)
      .insert(bomEntries)
      .select();

    if (error) {
      logger.error(`Error inserting ${tableName}:`, error);
      return NextResponse.json({ error: `Failed to save BOM: ${error.message}` }, { status: 500 });
    }

    logger.log(`BOM saved successfully for product ${product_id}:`, {
      isSemiProduct,
      entriesCount: bomEntries.length,
      tableName
    });

    return NextResponse.json({ 
      success: true, 
      message: 'BOM saved successfully',
      data: data 
    });

  } catch (error: any) {
    logger.error('BOM save error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
      logger.log('Fetching semi BOM for product:', productId);
      const { data, error } = await supabase
        .from('semi_bom')
        .select('*')
        .eq('semi_product_id', productId);
      
      logger.log('Semi BOM fetch result:', { 
        data: data?.length, 
        error,
        productId,
        query: `SELECT * FROM semi_bom WHERE semi_product_id = '${productId}'`
      });
      bomRecords = data;
      bomError = error;
    } else {
      // Nihai ürün için bom tablosunu kullan
      logger.log('Fetching finished BOM for product:', productId);
      const { data, error } = await supabase
        .from('bom')
        .select('*')
        .eq('finished_product_id', productId);
      
      logger.log('Finished BOM fetch result:', { data: data?.length, error });
      bomRecords = data;
      bomError = error;
    }

    if (bomError) {
      logger.error('BOM fetch error:', bomError);
      // Eğer semi_bom tablosu yoksa veya başka bir hata varsa, boş BOM döndür
      if (bomError.message.includes('semi_bom') || 
          bomError.message.includes('Could not find the table') ||
          bomError.message.includes('relation') ||
          bomError.message.includes('does not exist')) {
        logger.log('Semi BOM table not found or error, returning empty BOM');
        return NextResponse.json({
          product,
          materials: [],
        });
      }
      // Diğer hatalar için de boş BOM döndür (geçici çözüm)
      logger.log('BOM fetch error, returning empty BOM:', bomError.message);
      return NextResponse.json({
        product,
        materials: [],
      });
    }

    // Eğer bomRecords null veya boşsa, boş BOM döndür
    if (!bomRecords || bomRecords.length === 0) {
      logger.log('No BOM records found, returning empty BOM for product:', productId);
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

    logger.log('BOM materials fetched:', {
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
