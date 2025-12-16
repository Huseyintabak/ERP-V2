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
    const statusFilter = searchParams.get('status');

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
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      
      // First get all reservations to sort properly by order_number
      // We'll sort and paginate after formatting with order information
      const reservationQuery = supabase
        .from('material_reservations')
        .select('*', { count: 'exact' })
        .eq('order_type', 'semi_production_order');

      if (order_id) {
        reservationQuery.eq('order_id', order_id);
      }

      if (statusFilter) {
        reservationQuery.eq('status', statusFilter);
      }

      // Get all reservations first (we'll sort and paginate after formatting)
      const { data: allReservations, error: reservationError, count } = await reservationQuery;

      if (reservationError) {
        logger.error('Error fetching semi production reservations:', reservationError);
        return NextResponse.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
      }

      if (!allReservations || allReservations.length === 0) {
        return NextResponse.json({ data: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } });
      }

      const orderIds = [...new Set(allReservations.map((r: any) => r.order_id))];

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
        allReservations
          .filter((r: any) => r.material_type === 'raw')
          .map((r: any) => r.material_id)
      ));
      const semiIds = Array.from(new Set(
        allReservations
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

      const formattedReservations = (allReservations || []).map((reservation: any) => {
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

      // Sort by order_number DESC first (en büyük sipariş numarası en başta)
      formattedReservations.sort((a: any, b: any) => {
        const orderNumA = a.order_info?.order_number || '';
        const orderNumB = b.order_info?.order_number || '';
        
        // Both have order numbers - extract numeric part and compare
        if (orderNumA && orderNumB) {
          // Extract last part after last dash (e.g., "ORD-2025-386" -> "386")
          const matchA = orderNumA.match(/-(\d+)$/);
          const matchB = orderNumB.match(/-(\d+)$/);
          
          if (matchA && matchB) {
            const numA = parseInt(matchA[1], 10);
            const numB = parseInt(matchB[1], 10);
            
            if (!isNaN(numA) && !isNaN(numB)) {
              // DESC: larger number first (386 before 280)
              return numB - numA;
            }
          }
          
          // Fallback to string comparison if regex doesn't match
          return orderNumB.localeCompare(orderNumA);
        }
        
        // One missing order_number - prioritize the one that has it
        if (!orderNumA && orderNumB) return 1;  // B comes first
        if (orderNumA && !orderNumB) return -1; // A comes first
        
        // Both missing - fallback to created_at DESC
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      // Pagination after sorting
      const total = formattedReservations.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedReservations = formattedReservations.slice(startIndex, endIndex);

      return NextResponse.json({ 
        data: paginatedReservations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }

    // Get reservations from BOM snapshots to see which materials are reserved for which orders
    // FIX: Get production plans FIRST to avoid Supabase 1000 limit issue
    // Then fetch BOM snapshots for those specific plans
    const { data: plans, error: plansError } = await supabase
      .from('production_plans')
      .select('id, order_id, product_id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10000); // Get all plans (much fewer than snapshots)

    if (plansError || !plans || plans.length === 0) {
      logger.warn('⚠️ No production plans found');
      return NextResponse.json({ data: [] });
    }

    logger.log(`📋 Found ${plans.length} production plans`);
    
    // Get plan IDs from production plans
    const planIds = plans.map(p => p.id);
    
    // Now get BOM snapshots ONLY for these plans (this avoids the 1000 limit issue)
    const { data: bomSnapshots, error: snapshotsError } = await supabase
      .from('production_plan_bom_snapshot')
      .select('plan_id, material_id, material_type, material_code, material_name, quantity_needed')
      .in('plan_id', planIds);

    if (snapshotsError) {
      logger.error('❌ Error fetching BOM snapshots:', snapshotsError);
      return NextResponse.json({ data: [] });
    }

    logger.log(`🔍 Found ${bomSnapshots?.length || 0} BOM snapshots for ${planIds.length} plans`);
    
    // Debug: Check if ORD-2025-386's plan_id is in plans
    const ord386PlanId = 'cc85af6b-1717-4cf3-afda-7c64b68dbc72';
    const ord386Plan = plans.find(p => p.id === ord386PlanId);
    logger.log(`🔍 ORD-2025-386 plan found in plans: ${ord386Plan ? 'YES ✅' : 'NO ❌'}`);
    if (ord386Plan) {
      const ord386Snapshots = bomSnapshots?.filter(s => s.plan_id === ord386PlanId) || [];
      logger.log(`🔍 ORD-2025-386 snapshots: ${ord386Snapshots.length}`);
    }

    logger.log(`📋 Found ${plans?.length || 0} production plans`);
    
    if (!plans || plans.length === 0) {
      logger.warn('⚠️ No production plans found for BOM snapshots');
      return NextResponse.json({ data: [] });
    }
    
    // Debug: Check if ORD-2025-386's plan is in the results
    const ord386Plan = plans.find(p => {
      // We'll check this after we get orders
      return true;
    });

    // Get order details with created_at for proper sorting
    // Orders should be sorted by created_at DESC to get the latest orders first
    const orderIds = [...new Set(plans.map(p => p.order_id))].filter(Boolean);
    logger.log(`📦 Found ${orderIds.length} unique order IDs`);
    
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, created_at')
      .in('id', orderIds)
      .order('created_at', { ascending: false });
    
    logger.log(`📋 Found ${orders?.length || 0} orders`);
    
    // Debug: Check if ORD-2025-386 is in the results
    const ord386 = orders?.find(o => o.order_number === 'ORD-2025-386');
    if (ord386) {
      logger.log(`✅ Found ORD-2025-386 in orders: ${ord386.id}, created_at: ${ord386.created_at}`);
    } else {
      logger.warn(`⚠️ ORD-2025-386 NOT found in orders! Order IDs: ${orderIds.slice(0, 5).join(', ')}...`);
    }

    // Create a map of plan_id -> plan data
    // Use order.created_at (sipariş tarihi) instead of plan.created_at for proper sorting
    const planMap = new Map();
    plans.forEach(plan => {
      const order = orders?.find(o => o.id === plan.order_id);
      // Use order created_at if available, otherwise fall back to plan created_at
      const reservationDate = order?.created_at || plan.created_at;
      planMap.set(plan.id, {
        order_id: plan.order_id,
        product_id: plan.product_id,
        status: plan.status,
        created_at: reservationDate,
        order: order ? {
          order_number: order.order_number,
          customer_name: order.customer_name,
          created_at: order.created_at
        } : undefined
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

    // Debug: Count snapshots for ORD-2025-386
    const ord386PlanIds = plans
      .filter(p => {
        const order = orders?.find(o => o.id === p.order_id);
        return order?.order_number === 'ORD-2025-386';
      })
      .map(p => p.id);
    const ord386Snapshots = bomSnapshots.filter(s => ord386PlanIds.includes(s.plan_id));
    logger.log(`🔍 ORD-2025-386: ${ord386PlanIds.length} plan(s), ${ord386Snapshots.length} BOM snapshot(s)`);
    
    for (const snapshot of bomSnapshots) {
      const planData = planMap.get(snapshot.plan_id);
      if (!planData || !planData.order_id) continue;
      
      const key = `${planData.order_id}-${snapshot.material_id}`;
      
      // Debug: Log first few ORD-2025-386 reservations
      if (planData.order?.order_number === 'ORD-2025-386' && reservationsMap.size < 3) {
        logger.log(`🔍 Processing ORD-2025-386 snapshot: material=${snapshot.material_code}, qty=${snapshot.quantity_needed}, key=${key}`);
      }
      
      // Get consumed quantity for this specific plan and material
      const consumptionKey = `${snapshot.plan_id}-${snapshot.material_type}-${snapshot.material_id}`;
      const consumedQuantity = planConsumptionMap.get(consumptionKey) || 0;
      
      if (reservationsMap.has(key)) {
        const existing = reservationsMap.get(key);
        existing.reserved_quantity += parseFloat(snapshot.quantity_needed);
        existing.consumed_quantity += consumedQuantity;
        // En güncel tarihi tut (daha yeni ise güncelle)
        const existingDate = new Date(existing.created_at || 0).getTime();
        const newDate = new Date(planData.created_at || 0).getTime();
        if (newDate > existingDate) {
          existing.created_at = planData.created_at || new Date().toISOString();
        }
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
          order_info: planData.order ? {
            order_number: planData.order.order_number,
            customer_name: planData.order.customer_name,
            created_at: planData.order.created_at
          } : undefined,
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
    
    // Debug: Check if ORD-2025-386 is in reservations array (before filtering)
    const ord386BeforeFilter = reservations.filter((r: any) => r.order_info?.order_number === 'ORD-2025-386');
    logger.log(`🔍 ORD-2025-386 reservations BEFORE filter: ${ord386BeforeFilter.length} (total reservations: ${reservations.length})`);
    if (ord386BeforeFilter.length > 0) {
      logger.log(`✅ First ORD-2025-386 reservation before filter:`, {
        order_number: ord386BeforeFilter[0].order_info?.order_number,
        material: ord386BeforeFilter[0].material_name,
        status: ord386BeforeFilter[0].status,
        reserved: ord386BeforeFilter[0].reserved_quantity
      });
    }

    // Filter by order_id and status if provided
    let filteredReservations = reservations;
    if (order_id) {
      logger.log(`🔍 Filtering by order_id: ${order_id}`);
      filteredReservations = filteredReservations.filter(r => r.order_id === order_id);
    }
    if (statusFilter) {
      logger.log(`🔍 Filtering by status: ${statusFilter}`);
      filteredReservations = filteredReservations.filter(r => r.status === statusFilter);
      // Debug: Check ORD-2025-386 after status filter
      const ord386AfterStatusFilter = filteredReservations.filter((r: any) => r.order_info?.order_number === 'ORD-2025-386');
      logger.log(`🔍 ORD-2025-386 reservations AFTER status filter (${statusFilter}): ${ord386AfterStatusFilter.length}`);
    } else {
      logger.log(`🔍 No status filter applied (statusFilter: ${statusFilter})`);
    }
    
    // IMPORTANT: Sort BEFORE pagination to ensure correct order

    // Sort by order_number DESC first (en büyük sipariş numarası en başta)
    // Order number format: "ORD-2025-386" -> extract 386, sort DESC (386 > 280)
    filteredReservations.sort((a: any, b: any) => {
      const orderNumA = a.order_info?.order_number || '';
      const orderNumB = b.order_info?.order_number || '';
      
      // Both have order numbers - extract numeric part and compare
      if (orderNumA && orderNumB) {
        // Extract last part after last dash (e.g., "ORD-2025-386" -> "386")
        const matchA = orderNumA.match(/-(\d+)$/);
        const matchB = orderNumB.match(/-(\d+)$/);
        
        if (matchA && matchB) {
          const numA = parseInt(matchA[1], 10);
          const numB = parseInt(matchB[1], 10);
          
          if (!isNaN(numA) && !isNaN(numB)) {
            // DESC: larger number first (386 before 280)
            return numB - numA;
          }
        }
        
        // Fallback to string comparison if regex doesn't match
        return orderNumB.localeCompare(orderNumA);
      }
      
      // One missing order_number - prioritize the one that has it
      if (!orderNumA && orderNumB) return 1;  // B comes first
      if (orderNumA && !orderNumB) return -1; // A comes first
      
      // Both missing - fallback to created_at DESC
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    
    // Debug: Check if ORD-2025-386 is in filtered results
    const ord386InResults = filteredReservations.filter((r: any) => r.order_info?.order_number === 'ORD-2025-386');
    logger.log(`🔍 ORD-2025-386 reservations in filtered results: ${ord386InResults.length}`);
    if (ord386InResults.length > 0) {
      logger.log(`✅ First ORD-2025-386 reservation:`, {
        order_number: ord386InResults[0].order_info?.order_number,
        material: ord386InResults[0].material_name,
        reserved: ord386InResults[0].reserved_quantity
      });
    } else {
      logger.warn(`⚠️ ORD-2025-386 NOT in filtered results! Total filtered: ${filteredReservations.length}`);
    }
    
    // Debug: Log first few order numbers to verify sorting
    if (filteredReservations.length > 0) {
      const firstTen = filteredReservations.slice(0, 10).map((r: any) => {
        const orderNum = r.order_info?.order_number || 'N/A';
        const match = orderNum.match(/-(\d+)$/);
        const num = match ? parseInt(match[1], 10) : 0;
        return {
          order_number: orderNum,
          extracted_number: num,
          created_at: r.created_at
        };
      });
      logger.log('🔍 First 10 reservations AFTER sort (should be DESC by order number):', JSON.stringify(firstTen, null, 2));
      
      // Also log BEFORE sort for comparison
      const beforeSort = Array.from(reservationsMap.values())
        .slice(0, 10)
        .map((r: any) => {
          const orderNum = r.order_info?.order_number || 'N/A';
          const match = orderNum.match(/-(\d+)$/);
          const num = match ? parseInt(match[1], 10) : 0;
          return {
            order_number: orderNum,
            extracted_number: num,
            created_at: r.created_at
          };
        });
      logger.log('📋 First 10 reservations BEFORE sort:', JSON.stringify(beforeSort, null, 2));
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const total = filteredReservations.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReservations = filteredReservations.slice(startIndex, endIndex);

    return NextResponse.json({ 
      data: paginatedReservations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    logger.error('Error fetching reservations:', error);
    return NextResponse.json({ 
      error: error.message || 'Rezervasyonlar getirilemedi'
    }, { status: 500 });
  }
}
