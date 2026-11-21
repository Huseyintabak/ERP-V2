import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/utils/logger';
export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ orderId: string }> }
) {
  const params = await paramsPromise;
  try {
    logger.log('🔍 Simple Semi BOM API called');
    
    const { orderId } = params;
    logger.log('🔍 Order ID:', orderId);

    // Basit örnek veri döndür
    const sampleMaterials = [
      {
        material_id: 'sample-1',
        material_type: 'raw',
        material_code: 'CELIK-001',
        material_name: 'Çelik Levha',
        quantity_needed: 250, // 2.5 * 100
        current_stock: 100,
        consumption_per_unit: 2.5
      },
      {
        material_id: 'sample-2',
        material_type: 'raw',
        material_code: 'ALUM-001',
        material_name: 'Alüminyum Profil',
        quantity_needed: 100, // 1.0 * 100
        current_stock: 50,
        consumption_per_unit: 1.0
      },
      {
        material_id: 'sample-3',
        material_type: 'raw',
        material_code: 'VIDA-001',
        material_name: 'Vidalar',
        quantity_needed: 2000, // 20.0 * 100
        current_stock: 1000,
        consumption_per_unit: 20.0
      }
    ];

    logger.log('✅ Returning sample materials:', sampleMaterials.length);

    return NextResponse.json({
      materials: sampleMaterials,
      orderId,
      totalMaterials: sampleMaterials.length,
      product: {
        id: orderId,
        name: 'TRX2_Gövde_Grubu',
        code: 'TRX2-001',
        unit: 'adet'
      }
    });

  } catch (error) {
    logger.error('Simple Semi BOM API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}