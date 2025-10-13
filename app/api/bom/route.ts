import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const bomSchema = z.object({
  finished_product_id: z.string().uuid(),
  material_type: z.enum(['raw', 'semi']),
  material_id: z.string().uuid(),
  quantity_needed: z.number().positive(),
});

// POST - Create BOM entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = bomSchema.parse(body);

    const supabase = await createClient();

    // Ürün ve malzeme varlık kontrolü
    const { data: product, error: productError } = await supabase
      .from('finished_products')
      .select('id, name, code')
      .eq('id', validated.finished_product_id)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'Finished product not found' }, { status: 404 });
    }

    let material;
    if (validated.material_type === 'raw') {
      const { data: rawMaterial, error: rawError } = await supabase
        .from('raw_materials')
        .select('id, name, code')
        .eq('id', validated.material_id)
        .single();

      if (rawError || !rawMaterial) {
        return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
      }
      material = rawMaterial;
    } else {
      const { data: semiMaterial, error: semiError } = await supabase
        .from('semi_finished_products')
        .select('id, name, code')
        .eq('id', validated.material_id)
        .single();

      if (semiError || !semiMaterial) {
        return NextResponse.json({ error: 'Semi-finished product not found' }, { status: 404 });
      }
      material = semiMaterial;
    }

    // BOM kaydı oluştur
    const { data: bomRecord, error } = await supabase
      .from('bom')
      .insert([validated])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ 
          error: 'Bu malzeme zaten BOM\'da mevcut' 
        }, { status: 409 });
      }
      throw error;
    }

    // Oluşturulan BOM kaydını malzeme bilgileriyle birlikte döndür
    const result = {
      ...bomRecord,
      material,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// DELETE - Delete BOM entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get('id');

    if (!bomId) {
      return NextResponse.json({ error: 'BOM ID is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // BOM kaydını sil
    const { error } = await supabase
      .from('bom')
      .delete()
      .eq('id', bomId);

    if (error) throw error;

    return NextResponse.json({
      message: 'BOM entry deleted',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
