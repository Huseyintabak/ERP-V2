import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyJWT } from '@/lib/auth/jwt';

import { logger } from '@/lib/utils/logger';
// Rezervasyon oluştur
export async function POST(request: NextRequest) {
  try {
    logger.log('🚀 Reservation POST request started');
    
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      logger.log('❌ No token found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.log('✅ Token found, verifying...');
    const payload = await verifyJWT(token);
    logger.log('✅ Token verified, role:', payload.role);
    
    if (payload.role !== 'planlama' && payload.role !== 'yonetici' && payload.role !== 'operator') {
      logger.log('❌ Forbidden role:', payload.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    logger.log('📦 Request body:', body);
    
    const { order_id, order_type, materials } = body;

    if (!order_id || !order_type || !materials || !Array.isArray(materials)) {
      logger.log('❌ Missing required fields');
      return NextResponse.json({
        error: 'Missing required fields: order_id, order_type, materials'
      }, { status: 400 });
    }

    logger.log('✅ All required fields present');
    logger.log('📊 Materials count:', materials.length);

    const supabase = await createClient();
    logger.log('✅ Supabase client created');

    // Rezervasyonları oluştur
    const reservations = [];
    
    for (const material of materials) {
      logger.log('Creating reservation for material:', material.material_id);
      
      try {
        const reservationQuantity = Number(material.quantity_needed || material.reserved_quantity || 0);
        if (!reservationQuantity || reservationQuantity <= 0) {
          throw new Error('Geçerli bir rezervasyon miktarı sağlanmadı');
        }

        // Veritabanına rezervasyon kaydet
        const { data: dbReservation, error: dbError } = await supabase
          .from('material_reservations')
          .insert({
            order_id,
            order_type,
            material_id: material.material_id,
            material_type: material.material_type,
            reserved_quantity: reservationQuantity,
            consumed_quantity: 0,
            status: 'active',
            created_by: payload.userId
          })
          .select()
          .single();

        if (dbError) {
          logger.log('Database error, using fallback:', dbError.message);
          throw new Error(dbError.message);
        }

        const stockTable = material.material_type === 'raw'
          ? 'raw_materials'
          : material.material_type === 'semi'
            ? 'semi_finished_products'
            : null;

        if (!stockTable) {
          await supabase.from('material_reservations').delete().eq('id', dbReservation.id);
          throw new Error(`Desteklenmeyen malzeme tipi: ${material.material_type}`);
        }

        const { data: stockRow, error: stockFetchError } = await supabase
          .from(stockTable)
          .select('quantity, reserved_quantity, name, code')
          .eq('id', material.material_id)
          .single();

        if (stockFetchError || !stockRow) {
          await supabase.from('material_reservations').delete().eq('id', dbReservation.id);
          throw new Error(`Stok bilgisi alınamadı: ${stockFetchError?.message}`);
        }

        if (Number(stockRow.quantity) < reservationQuantity) {
          await supabase.from('material_reservations').delete().eq('id', dbReservation.id);
          throw new Error('Yeterli stok bulunmuyor');
        }

        const newQuantity = Number(stockRow.quantity) - reservationQuantity;
        const newReserved = Number(stockRow.reserved_quantity || 0) + reservationQuantity;

        const { error: stockUpdateError } = await supabase
          .from(stockTable)
          .update({
            quantity: newQuantity,
            reserved_quantity: newReserved
          })
          .eq('id', material.material_id);

        if (stockUpdateError) {
          await supabase.from('material_reservations').delete().eq('id', dbReservation.id);
          throw new Error(`Stok güncellenemedi: ${stockUpdateError.message}`);
        }

        const description = `Rezervasyon: ${reservationQuantity} adet ${stockRow.name || material.material_name || 'Malzeme'} (${stockRow.code || material.material_code || 'N/A'})`;

        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            material_type: material.material_type,
            material_id: material.material_id,
            movement_type: 'cikis',
            quantity: -reservationQuantity,
            user_id: payload.userId,
            description
          });

        if (movementError) {
          logger.error('Stock movement insert failed, rolling back reservation:', movementError);
          await supabase.from('material_reservations').delete().eq('id', dbReservation.id);
          await supabase
            .from(stockTable)
            .update({
              quantity: stockRow.quantity,
              reserved_quantity: stockRow.reserved_quantity
            })
            .eq('id', material.material_id);
          throw new Error(`Stok hareketi kaydedilemedi: ${movementError.message}`);
        }

        const reservation = {
          ...dbReservation,
          material_name: material.material_name || 'Unknown Material',
          material_code: material.material_code || 'N/A',
          unit: material.unit || 'adet'
        };
        
        reservations.push(reservation);
        logger.log('✅ Database reservation created:', reservation.id);
        
      } catch (error) {
        logger.error('❌ Error creating reservation for material:', material.material_id, error);
        throw error;
      }
    }

    logger.log('✅ All reservations created:', reservations.length);

    return NextResponse.json({ 
      message: 'Rezervasyonlar başarıyla oluşturuldu',
      data: reservations 
    }, { status: 201 });

  } catch (error: any) {
    logger.error('❌ Reservation creation error:', error);
    logger.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: error.message || 'Rezervasyon oluşturulamadı'
    }, { status: 500 });
  }
}

// Rezervasyonları listele
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const supabase = await createClient();

    const { searchParams } = new URL(request.url);
    const order_id = searchParams.get('order_id');
    const orderTypeParam = searchParams.get('order_type');

    let isSemiOrder = orderTypeParam === 'semi_production_order';
    let semiOrders: any[] | null = null;

    if (!isSemiOrder && order_id) {
      const { data: semiOrder } = await supabase
        .from('semi_production_orders')
        .select(`
          id,
          order_number,
          planned_quantity,
          status,
          created_at,
          product:semi_finished_products(id, name, code)
        `)
        .eq('id', order_id)
        .maybeSingle();

      if (semiOrder) {
        isSemiOrder = true;
        semiOrders = [semiOrder];
      }
    }

    if (isSemiOrder) {
      const reservationQuery = supabase
        .from('material_reservations')
        .select('*')
        .eq('order_type', 'semi_production_order');

      if (order_id) {
        reservationQuery.eq('order_id', order_id);
      }

      const { data: reservations, error: reservationError } = await reservationQuery;

      if (reservationError) {
        logger.error('Error fetching semi production reservations:', reservationError);
        return NextResponse.json({ data: [] });
      }

      if (!reservations || reservations.length === 0) {
        return NextResponse.json({ data: [] });
      }

      const orderIds = [...new Set(reservations.map((r: any) => r.order_id))];

      if (!semiOrders) {
        if (orderIds.length > 0) {
          const { data: orderRows, error: orderError } = await supabase
            .from('semi_production_orders')
            .select(`
              id,
              order_number,
              planned_quantity,
              status,
              created_at,
              product:semi_finished_products(id, name, code)
            `)
            .in('id', orderIds);

          if (orderError) {
            logger.error('Error fetching semi production orders for reservations:', orderError);
          }

          semiOrders = orderRows || [];
        } else {
          semiOrders = [];
        }
      }

      const orderMap = new Map<string, any>();
      (semiOrders || []).forEach((order) => {
        if (!order) return;
        orderMap.set(order.id, order);
      });

      const rawIds = Array.from(new Set(
        reservations
          .filter((r: any) => r.material_type === 'raw')
          .map((r: any) => r.material_id)
      ));
      const semiIds = Array.from(new Set(
        reservations
          .filter((r: any) => r.material_type === 'semi')
          .map((r: any) => r.material_id)
      ));

      const { data: rawMaterials } = rawIds.length
        ? await supabase
            .from('raw_materials')
            .select('id, name, code, unit')
            .in('id', rawIds)
        : { data: [] };

      const { data: semiMaterials } = semiIds.length
        ? await supabase
            .from('semi_finished_products')
            .select('id, name, code, unit')
            .in('id', semiIds)
        : { data: [] };

      const rawMap = new Map<string, any>();
      (rawMaterials || []).forEach((material: any) => {
        rawMap.set(material.id, material);
      });

      const semiMap = new Map<string, any>();
      (semiMaterials || []).forEach((material: any) => {
        semiMap.set(material.id, material);
      });

      const formattedReservations = reservations.map((reservation: any) => {
        const reservedQuantity = Number(reservation.reserved_quantity || 0);
        const consumedQuantity = Number(reservation.consumed_quantity || 0);
        const clampedConsumed = Math.min(consumedQuantity, reservedQuantity);

        const materialInfo = reservation.material_type === 'raw'
          ? rawMap.get(reservation.material_id)
          : semiMap.get(reservation.material_id);

        const orderInfo = orderMap.get(reservation.order_id);

        return {
          id: reservation.id,
          order_id: reservation.order_id,
          order_type: reservation.order_type,
          material_id: reservation.material_id,
          material_type: reservation.material_type,
          reserved_quantity: reservedQuantity,
          consumed_quantity: clampedConsumed,
          status: reservation.status,
          created_at: reservation.created_at,
          material_name: materialInfo?.name || null,
          material_code: materialInfo?.code || null,
          unit: materialInfo?.unit || 'adet',
          order_info: orderInfo
            ? {
                order_number: orderInfo.order_number,
                customer_name: orderInfo.product?.name || 'İç Üretim'
              }
            : undefined
        };
      });

      return NextResponse.json({ data: formattedReservations });
    }

    // Get reservations from BOM snapshots to see which materials are reserved for which orders
    // First get all BOM snapshots
    const { data: bomSnapshots, error: snapshotsError } = await supabase
      .from('production_plan_bom_snapshot')
      .select('plan_id, material_id, material_type, material_code, material_name, quantity_needed');

    if (snapshotsError || !bomSnapshots || bomSnapshots.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get unique plan IDs
    const planIds = [...new Set(bomSnapshots.map(s => s.plan_id))];
    
    // Get production plans with orders - show all plans
    const { data: plans } = await supabase
      .from('production_plans')
      .select('id, order_id, product_id, status, created_at')
      .in('id', planIds);

    if (!plans || plans.length === 0) {
      return NextResponse.json({ data: [] });
    }

    // Get order details
    const orderIds = [...new Set(plans.map(p => p.order_id))].filter(Boolean);
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name')
      .in('id', orderIds);

    // Create a map of plan_id -> plan data
    const planMap = new Map();
    plans.forEach(plan => {
      const order = orders?.find(o => o.id === plan.order_id);
      planMap.set(plan.id, {
        order_id: plan.order_id,
        product_id: plan.product_id,
        status: plan.status,
        created_at: plan.created_at,
        order
      });
    });

    // Get production log IDs to track consumption by plan
    const productionLogIds = plans.map(p => p.id);

    // Compute produced quantities per plan directly from production_logs
    const { data: logsForProduced } = await supabase
      .from('production_logs')
      .select('plan_id, quantity_produced')
      .in('plan_id', productionLogIds);

    const producedByPlan = new Map();
    for (const lg of (logsForProduced || [])) {
      producedByPlan.set(
        lg.plan_id,
        (producedByPlan.get(lg.plan_id) || 0) + parseFloat(lg.quantity_produced || '0')
      );
    }

    // Create a map: plan_id -> material_id -> consumed quantity using BOM snapshot × produced
    const planConsumptionMap = new Map();
    for (const s of bomSnapshots) {
      const produced = producedByPlan.get(s.plan_id) || 0;
      const consumed = produced * parseFloat(s.quantity_needed || '0');
      const key = `${s.plan_id}-${s.material_type}-${s.material_id}`;
      planConsumptionMap.set(key, (planConsumptionMap.get(key) || 0) + consumed);
    }

    const reservationsMap = new Map();

    for (const snapshot of bomSnapshots) {
      const planData = planMap.get(snapshot.plan_id);
      if (!planData || !planData.order_id) continue;
      
      const key = `${planData.order_id}-${snapshot.material_id}`;
      
      // Get consumed quantity for this specific plan and material
      const consumptionKey = `${snapshot.plan_id}-${snapshot.material_type}-${snapshot.material_id}`;
      const consumedQuantity = planConsumptionMap.get(consumptionKey) || 0;
      
      if (reservationsMap.has(key)) {
        const existing = reservationsMap.get(key);
        existing.reserved_quantity += parseFloat(snapshot.quantity_needed);
        existing.consumed_quantity += consumedQuantity;
      } else {
        reservationsMap.set(key, {
          id: `${snapshot.plan_id}-${snapshot.material_id}`,
          order_id: planData.order_id,
          plan_id: snapshot.plan_id,
          material_id: snapshot.material_id,
          material_type: snapshot.material_type,
          material_code: snapshot.material_code,
          material_name: snapshot.material_name,
          reserved_quantity: parseFloat(snapshot.quantity_needed),
          consumed_quantity: consumedQuantity,
          status: planData.status === 'tamamlandi' ? 'completed' : 'active',
          created_at: planData.created_at || new Date().toISOString(),
          order_info: planData.order,
          unit: 'adet'
        });
      }
    }

    // Clamp over-consumption to reserved quantity
    const reservations = Array.from(reservationsMap.values()).map((r: any) => {
      if (r.consumed_quantity > r.reserved_quantity) {
        r.consumed_quantity = r.reserved_quantity;
      }
      return r;
    });

    // Filter by order_id if provided
    let filteredReservations = reservations;
    if (order_id) {
      filteredReservations = reservations.filter(r => r.order_id === order_id);
    }

    return NextResponse.json({ data: filteredReservations });

  } catch (error: any) {
    logger.error('Error fetching reservations:', error);
    return NextResponse.json({ 
      error: error.message || 'Rezervasyonlar getirilemedi'
    }, { status: 500 });
  }
}
