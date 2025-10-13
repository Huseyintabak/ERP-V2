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

    // Ürün bilgilerini al
    const { data: product, error: productError } = await supabase
      .from('finished_products')
      .select('id, name, code')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // BOM kayıtlarını al
    const { data: bomRecords, error: bomError } = await supabase
      .from('bom')
      .select('*')
      .eq('finished_product_id', productId);

    if (bomError) throw bomError;

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
        } else {
          const { data: semiMaterial } = await supabase
            .from('semi_finished_products')
            .select('id, name, code, unit, unit_cost')
            .eq('id', record.material_id)
            .single();
          material = semiMaterial;
        }

        return {
          id: record.id,
          material_type: record.material_type,
          material_id: record.material_id,
          quantity_needed: record.quantity_needed,
          material,
        };
      }) || []
    );

    return NextResponse.json({
      product,
      materials,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
