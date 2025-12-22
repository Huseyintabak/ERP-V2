import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { getN8nClient } from '@/lib/ai/n8n-client';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/ai/n8n-consensus-with-data
 * 
 * Plan ID veya Order ID'den gerçek Supabase verilerini çekip
 * multi-agent consensus workflow'unu otomatik olarak çalıştırır.
 * 
 * Body: { plan_id?: string, order_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload || !['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { plan_id, order_id } = body;

    if (!plan_id && !order_id) {
      return NextResponse.json(
        { error: 'plan_id or order_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let plan: any = null;
    let order: any = null;
    let product: any = null;
    let bomMaterials: any[] = [];
    let productionCapacity: any = null;

    // 1. Plan veya Order bilgisini çek
    if (plan_id) {
      const { data: planData, error: planError } = await supabase
        .from('production_plans')
        .select(`
          *,
          orders!production_plans_order_id_fkey (
            id,
            order_number,
            customer_name,
            priority,
            delivery_date,
            status
          ),
          finished_products!production_plans_product_id_fkey (
            id,
            name,
            code,
            unit,
            quantity
          )
        `)
        .eq('id', plan_id)
        .single();

      if (planError || !planData) {
        return NextResponse.json(
          { error: 'Production plan not found' },
          { status: 404 }
        );
      }

      plan = planData;
      order = planData.orders;
      product = planData.finished_products;
    } else if (order_id) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          finished_products!orders_product_id_fkey (
            id,
            name,
            code,
            unit,
            quantity
          )
        `)
        .eq('id', order_id)
        .single();

      if (orderError || !orderData) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        );
      }

      order = orderData;
      product = orderData.finished_products;

      // Order için plan var mı kontrol et
      const { data: planData } = await supabase
        .from('production_plans')
        .select('*')
        .eq('order_id', order_id)
        .single();

      plan = planData;
    }

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // 2. BOM malzemelerini çek
    const { data: bomData, error: bomError } = await supabase
      .from('bom')
      .select(`
        *,
        raw_materials!bom_material_id_fkey (
          id,
          name,
          code,
          quantity,
          reserved_quantity,
          critical_level,
          unit,
          unit_price
        ),
        semi_finished_products!bom_material_id_fkey (
          id,
          name,
          code,
          quantity,
          reserved_quantity,
          critical_level,
          unit_cost
        )
      `)
      .eq('finished_product_id', product.id);

    if (bomError) {
      logger.error('BOM fetch error:', bomError);
    } else if (bomData) {
      // BOM malzemelerini formatla ve stok bilgilerini ekle
      bomMaterials = await Promise.all(
        bomData.map(async (item: any) => {
          let material = null;
          let currentStock = 0;
          let reservedStock = 0;
          let criticalLevel = 0;
          let unitPrice = 0;

          if (item.material_type === 'raw' && item.raw_materials) {
            material = item.raw_materials;
            currentStock = material.quantity || 0;
            reservedStock = material.reserved_quantity || 0;
            criticalLevel = material.critical_level || 0;
            unitPrice = material.unit_price || 0;
          } else if (item.material_type === 'semi' && item.semi_finished_products) {
            material = item.semi_finished_products;
            currentStock = material.quantity || 0;
            reservedStock = material.reserved_quantity || 0;
            criticalLevel = material.critical_level || 0;
            unitPrice = material.unit_cost || 0;
          }

          const plannedQuantity = plan?.target_quantity || order?.planned_quantity || 0;
          const requiredQuantity = (item.quantity_needed || 0) * plannedQuantity;
          const availableStock = currentStock - reservedStock;

          return {
            material_type: item.material_type,
            material_id: item.material_id,
            material_name: material?.name || 'Unknown',
            material_code: material?.code || 'N/A',
            quantity_needed_per_unit: item.quantity_needed || 0,
            required_quantity_total: requiredQuantity,
            current_stock: currentStock,
            reserved_stock: reservedStock,
            available_stock: availableStock,
            critical_level: criticalLevel,
            unit_price: unitPrice,
            is_sufficient: availableStock >= requiredQuantity,
            shortage: Math.max(0, requiredQuantity - availableStock),
          };
        })
      );
    }

    // 3. Üretim kapasitesini çek (operatörler ve aktif üretimler)
    const { data: operators, error: operatorsError } = await supabase
      .from('operators')
      .select(`
        *,
        users!operators_user_id_fkey (
          id,
          name,
          email,
          is_active
        )
      `)
      .eq('is_active', true);

    const { data: activePlans, error: activePlansError } = await supabase
      .from('production_plans')
      .select('id, target_quantity, produced_quantity, status, assigned_operator_id')
      .in('status', ['devam_ediyor', 'planlandi']);

    // Kapasite hesaplama
    const totalDailyCapacity = operators?.reduce((sum, op) => sum + (op.daily_capacity || 0), 0) || 0;
    const activeProductionCount = activePlans?.length || 0;
    const totalActiveQuantity = activePlans?.reduce((sum, p) => sum + (p.target_quantity || 0), 0) || 0;

    productionCapacity = {
      total_operators: operators?.length || 0,
      total_daily_capacity: totalDailyCapacity,
      active_production_plans: activeProductionCount,
      total_active_quantity: totalActiveQuantity,
      available_capacity: totalDailyCapacity - totalActiveQuantity,
    };

    // 4. Prompt oluştur
    const plannedQuantity = plan?.target_quantity || order?.planned_quantity || 0;
    const orderNumber = order?.order_number || 'N/A';
    const customerName = order?.customer_name || 'N/A';
    const deliveryDate = order?.delivery_date || 'N/A';
    const priority = order?.priority || 'orta';

    // BOM özeti
    const bomSummary = bomMaterials.map(m => 
      `- ${m.material_name} (${m.material_code}): Gerekli: ${m.required_quantity_total} ${m.material_type === 'raw' ? 'kg' : 'adet'}, Mevcut: ${m.available_stock}, ${m.is_sufficient ? '✅ Yeterli' : `❌ Eksik: ${m.shortage}`}`
    ).join('\n');

    // Eksik malzemeler
    const insufficientMaterials = bomMaterials.filter(m => !m.is_sufficient);
    const insufficientSummary = insufficientMaterials.length > 0
      ? `\n⚠️ EKSİK MALZEMELER:\n${insufficientMaterials.map(m => `- ${m.material_name}: ${m.shortage} ${m.material_type === 'raw' ? 'kg' : 'adet'} eksik`).join('\n')}`
      : '\n✅ Tüm malzemeler stokta yeterli';

    const prompt = `Sipariş ${orderNumber} için ${plannedQuantity} adet ${product.name} (${product.code}) üretimi planlanacak.

SİPARİŞ BİLGİLERİ:
- Sipariş No: ${orderNumber}
- Müşteri: ${customerName}
- Ürün: ${product.name} (${product.code})
- Planlanan Miktar: ${plannedQuantity} ${product.unit || 'adet'}
- Teslim Tarihi: ${deliveryDate}
- Öncelik: ${priority}
${plan ? `- Plan No: ${plan.plan_number || plan.id.slice(0, 8)}` : ''}
${plan ? `- Plan Durumu: ${plan.status}` : ''}

BOM (Bill of Materials) ve STOK DURUMU:
${bomSummary}${insufficientSummary}

ÜRETİM KAPASİTESİ:
- Toplam Operatör Sayısı: ${productionCapacity.total_operators}
- Toplam Günlük Kapasite: ${productionCapacity.total_daily_capacity} adet/gün
- Aktif Üretim Planları: ${productionCapacity.active_production_plans}
- Aktif Üretim Miktarı: ${productionCapacity.total_active_quantity} adet
- Kullanılabilir Kapasite: ${productionCapacity.available_capacity} adet/gün

SORU:
Bu sipariş için üretim şimdi başlatılabilir mi? Tüm agentlar (Planning, Production, Warehouse) birlikte değerlendirip konsensüs kararı versin:
- APPROVED: Üretim başlatılabilir (tüm koşullar uygun)
- REJECTED: Üretim başlatılamaz (kritik sorunlar var)
- NEEDS_REVIEW: İnceleme gerekli (bazı koşullar belirsiz veya eksik)

Her agent kendi perspektifinden değerlendirsin:
- Planning Agent: Üretim planlaması, zamanlama, kapasite uygunluğu
- Production Agent: Üretilebilirlik, operatör atama, üretim süresi
- Warehouse Agent: Stok yeterliliği, malzeme rezervasyonu, kritik seviyeler`;

    // 5. Multi-agent consensus workflow'unu çağır
    const n8nClient = getN8nClient();
    const consensusResult = await n8nClient.runMultiAgentConsensus(
      prompt,
      ['planning', 'production', 'warehouse', 'manager'],
      {
        plan_id: plan?.id,
        order_id: order?.id,
        product_id: product.id,
        planned_quantity: plannedQuantity,
        delivery_date: deliveryDate,
      }
    );

    if (!consensusResult.success) {
      return NextResponse.json(
        {
          error: 'Multi-agent consensus failed',
          message: consensusResult.error,
        },
        { status: 500 }
      );
    }

    // 6. Sonuçları formatla ve döndür
    return NextResponse.json({
      success: true,
      plan_id: plan?.id,
      order_id: order?.id,
      order_number: orderNumber,
      product: {
        id: product.id,
        name: product.name,
        code: product.code,
      },
      planned_quantity: plannedQuantity,
      bom_summary: {
        total_materials: bomMaterials.length,
        sufficient_materials: bomMaterials.filter(m => m.is_sufficient).length,
        insufficient_materials: insufficientMaterials.length,
        materials: bomMaterials,
      },
      production_capacity: productionCapacity,
      consensus_result: consensusResult.data,
      prompt_generated: prompt,
    });

  } catch (error: any) {
    logger.error('❌ n8n consensus with data failed:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

