import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const supabase = await createClient();

    // TRX2_Gövde_Grubu ürününün ID'sini al
    const { data: product, error: productError } = await supabase
      .from('semi_finished_products')
      .select('id, name')
      .eq('name', 'TRX2_Gövde_Grubu')
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: 'TRX2_Gövde_Grubu ürünü bulunamadı' }, { status: 404 });
    }

    // Hammaddeleri al
    const { data: rawMaterials, error: rawError } = await supabase
      .from('raw_materials')
      .select('id, name, code, quantity')
      .in('name', ['Çelik Levha', 'Alüminyum Profil', 'Vidalar']);

    if (rawError) {
      logger.error('Raw materials fetch error:', rawError);
    }

    // BOM verilerini oluştur
    const bomData = [];
    
    if (rawMaterials && rawMaterials.length > 0) {
      rawMaterials.forEach(material => {
        let quantity = 0;
        switch (material.name) {
          case 'Çelik Levha':
            quantity = 2.5;
            break;
          case 'Alüminyum Profil':
            quantity = 1.0;
            break;
          case 'Vidalar':
            quantity = 20.0;
            break;
        }
        
        bomData.push({
          product_id: product.id,
          material_id: material.id,
          material_type: 'raw',
          quantity: quantity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    }

    // BOM verilerini ekle (eğer semi_bom tablosu varsa)
    let bomInsertResult = null;
    try {
      const { data: bomInsert, error: bomInsertError } = await supabase
        .from('semi_bom')
        .insert(bomData)
        .select();

      if (bomInsertError) {
        logger.error('BOM insert error:', bomInsertError);
        // Tablo yoksa, normal BOM tablosuna ekle
        const { data: normalBomInsert, error: normalBomError } = await supabase
          .from('bom')
          .insert(bomData)
          .select();

        if (normalBomError) {
          logger.error('Normal BOM insert error:', normalBomError);
          return NextResponse.json({ error: 'BOM verileri eklenemedi' }, { status: 500 });
        }
        
        bomInsertResult = normalBomInsert;
      } else {
        bomInsertResult = bomInsert;
      }
    } catch (error) {
      logger.error('BOM insert exception:', error);
      return NextResponse.json({ error: 'BOM verileri eklenemedi' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: bomInsertResult,
      message: 'BOM data added successfully' 
    });

  } catch (error) {
    logger.error('Add semi BOM data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
