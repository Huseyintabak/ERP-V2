import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/dashboard/critical-stock-count
 * Kritik stok sayısını veritabanından direkt hesaplar
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Debug: API çağrısı yapıldığını logla
    logger.log('🔍 Critical stock count API çağrıldı');
    
    // Kritik stok sayısını hesapla (YENİ KRİTİK STOK KURALLARI)
    // availableQty = quantity - reserved_quantity
    // isCritical = criticalLevel > 0 && availableQty <= criticalLevel
    // Tüm kayıtları çekip filtrele
    
    const [rawData, semiData, finishedData] = await Promise.all([
      // RAW MATERIALS - Tüm kayıtları çek (limit yok)
      supabase
        .from('raw_materials')
        .select('id, quantity, reserved_quantity, critical_level')
        .limit(100000), // Yeterince büyük limit
      
      // SEMI FINISHED PRODUCTS - Tüm kayıtları çek
      supabase
        .from('semi_finished_products')
        .select('id, quantity, reserved_quantity, critical_level')
        .limit(100000),
      
      // FINISHED PRODUCTS - Tüm kayıtları çek
      supabase
        .from('finished_products')
        .select('id, quantity, reserved_quantity, critical_level')
        .limit(100000)
    ]);

    // Kritik stok sayısını hesapla (YENİ KURAL: availableQty kullan)
    const rawCritical = (rawData.data || []).filter((item: any) => {
      const criticalLevel = parseFloat(item.critical_level) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const reservedQuantity = parseFloat(item.reserved_quantity) || 0;
      const availableQty = quantity - reservedQuantity;
      // Yeni kural: criticalLevel > 0 && availableQty <= criticalLevel
      return criticalLevel > 0 && availableQty <= criticalLevel;
    }).length;

    const semiCritical = (semiData.data || []).filter((item: any) => {
      const criticalLevel = parseFloat(item.critical_level) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const reservedQuantity = parseFloat(item.reserved_quantity) || 0;
      const availableQty = quantity - reservedQuantity;
      // Yeni kural: criticalLevel > 0 && availableQty <= criticalLevel
      return criticalLevel > 0 && availableQty <= criticalLevel;
    }).length;

    const finishedCritical = (finishedData.data || []).filter((item: any) => {
      const criticalLevel = parseFloat(item.critical_level) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const reservedQuantity = parseFloat(item.reserved_quantity) || 0;
      const availableQty = quantity - reservedQuantity;
      // Yeni kural: criticalLevel > 0 && availableQty <= criticalLevel
      return criticalLevel > 0 && availableQty <= criticalLevel;
    }).length;

    const totalCritical = rawCritical + semiCritical + finishedCritical;

    logger.log(`📊 Kritik stok hesaplama: RAW=${rawCritical}, SEMI=${semiCritical}, FINISHED=${finishedCritical}, TOPLAM=${totalCritical}`);
    logger.log(`📊 Veri sayıları: RAW=${rawData.data?.length || 0}, SEMI=${semiData.data?.length || 0}, FINISHED=${finishedData.data?.length || 0}`);

    return NextResponse.json({ 
      count: totalCritical,
      breakdown: {
        raw: rawCritical,
        semi: semiCritical,
        finished: finishedCritical
      }
    });

  } catch (error: any) {
    logger.error('GET /api/dashboard/critical-stock-count error:', error);
    return NextResponse.json(
      { error: error.message || 'Sunucu hatası', count: 0 },
      { status: 500 }
    );
  }
}

