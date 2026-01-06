import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all finished products
    const { data: finishedProducts, error: finishedError } = await supabase
      .from('finished_products')
      .select('id, code, name, barcode, unit, sale_price, description, critical_level');

    if (finishedError) {
      console.error('Error fetching finished products:', finishedError);
    }

    // Fetch all semi-finished products
    const { data: semiFinishedProducts, error: semiFinishedError } =
      await supabase
        .from('semi_finished_products')
        .select('id, code, name, barcode, unit, unit_cost, description, critical_level');

    if (semiFinishedError) {
      console.error('Error fetching semi-finished products:', semiFinishedError);
    }

    // Fetch all raw materials
    const { data: rawMaterials, error: rawMaterialsError } = await supabase
      .from('raw_materials')
      .select('id, code, name, barcode, unit, unit_price, description, critical_level');

    if (rawMaterialsError) {
      console.error('Error fetching raw materials:', rawMaterialsError);
    }

    // Helper function to generate barcode from code
    const generateBarcodeFromCode = (code: string, type: string): string => {
      // Remove special characters and spaces
      const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      // Add prefix based on type
      const prefix = type === 'finished' ? 'FIN' : type === 'semi_finished' ? 'SFP' : 'RAW';
      // Combine and ensure it's not too long for CODE128
      return `${prefix}-${cleanCode}`.substring(0, 20);
    };

    // Normalize and combine all products
    const products = [
      ...(finishedProducts || []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        barcode: p.barcode || generateBarcodeFromCode(p.code, 'finished'),
        type: 'finished' as const,
        unit: p.unit,
        category: p.description || 'Nihai Ürün',
        price: p.sale_price,
      })),
      ...(semiFinishedProducts || []).map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        barcode: p.barcode || generateBarcodeFromCode(p.code, 'semi_finished'),
        type: 'semi_finished' as const,
        unit: p.unit,
        category: p.description || 'Yarı Mamul',
      })),
      ...(rawMaterials || []).map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        barcode: m.barcode || generateBarcodeFromCode(m.code, 'raw_material'),
        type: 'raw_material' as const,
        unit: m.unit,
        category: m.description || 'Hammadde',
      })),
    ];

    // Sort by name
    products.sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    return NextResponse.json({
      success: true,
      products,
      count: products.length,
    });
  } catch (error) {
    console.error('Error in all-with-barcodes API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        products: [],
      },
      { status: 500 }
    );
  }
}
